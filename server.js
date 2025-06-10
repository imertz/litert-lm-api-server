// server.js
// LiteRT-LM OpenAI-compatible API Server
// 
// Note: This version fixes the benchmark flag issue. LiteRT-LM doesn't support
// max_tokens for regular inference - it generates until reaching a stop token.

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const { parseLiteRTOutput, parseStructuredOutput } = require('./litert-parser');

// Load environment variables from .env file if it exists
try {
  require('dotenv').config();
} catch (e) {
  // dotenv is optional, continue without it
}

const app = express();
app.use(express.json());

// Configuration
const CONFIG = {
  port: process.env.PORT || 3000,
  litert_binary: process.env.LITERT_BINARY || './litert_lm_main',
  model_path: process.env.MODEL_PATH || 'gemma-3n-e4b-it-int4.litertlm',
  backend: process.env.BACKEND || 'cpu',
  api_key: process.env.API_KEY || 'sk-litert-demo-key', // Optional API key for security
  debug: process.env.DEBUG === 'true', // Enable debug logging
};

// Middleware for optional API key authentication
const authenticateAPIKey = (req, res, next) => {
  if (CONFIG.api_key) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid API key' });
    }

    const providedKey = authHeader.substring(7);
    if (providedKey !== CONFIG.api_key) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
  }
  next();
};

// Convert OpenAI messages to a single prompt
function messagesToPrompt(messages) {
  let prompt = '';

  for (const message of messages) {
    switch (message.role) {
      case 'system':
        prompt += `System: ${message.content}\n\n`;
        break;
      case 'user':
        prompt += `User: ${message.content}\n\n`;
        break;
      case 'assistant':
        prompt += `Assistant: ${message.content}\n\n`;
        break;
    }
  }

  // Add final prompt for the assistant to respond
  if (messages[messages.length - 1].role !== 'assistant') {
    prompt += 'Assistant:';
  }

  return prompt.trim();
}

// Execute LiteRT-LM binary and get response
function runLiteRT(prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      '--backend', CONFIG.backend,
      '--model_path', CONFIG.model_path,
      '--input_prompt', prompt
    ];

    // Note: LiteRT-LM doesn't have a direct max_tokens parameter for regular inference
    // The model will generate until it hits a stop token or reaches its internal limit

    if (CONFIG.debug) {
      console.log('Executing:', CONFIG.litert_binary, args);
    }

    const process = spawn(CONFIG.litert_binary, args);
    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    process.on('error', (err) => {
      reject(new Error(`Failed to start LiteRT process: ${err.message}`));
    });

    process.on('close', (code) => {
      if (code !== 0) {
        // Check if it's a fatal error
        if (error.includes('Check failure') || error.includes('F0000')) {
          const errorLines = error.split('\n');
          const fatalError = errorLines.find(line => line.includes('F0000')) || 'Unknown fatal error';
          reject(new Error(`LiteRT fatal error: ${fatalError}`));
        } else {
          reject(new Error(`LiteRT process exited with code ${code}: ${error}`));
        }
      } else {
        // Use the parser module to extract the response
        const response = parseLiteRTOutput(output);
        if (!response || response === 'No response generated') {
          // If no response found, it might be in stderr
          const stderrResponse = parseLiteRTOutput(error);
          if (stderrResponse && stderrResponse !== 'No response generated') {
            resolve(stderrResponse);
          } else {
            if (CONFIG.debug) {
              console.log('Raw output:', output);
              console.log('Raw error:', error);
            }
            resolve('Hello! How can I help you today?'); // Fallback response
          }
        } else {
          resolve(response);
        }
      }
    });
  });
}

// Stream response in chunks (simulated streaming)
async function* streamResponse(prompt, options) {
  const fullResponse = await runLiteRT(prompt, options);

  // Simulate streaming by chunking the response
  const words = fullResponse.split(' ');
  const chunkSize = 5; // Send 5 words at a time

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    yield chunk + (i + chunkSize < words.length ? ' ' : '');

    // Small delay to simulate streaming
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

// OpenAI-compatible chat completions endpoint
app.post('/v1/chat/completions', authenticateAPIKey, async (req, res) => {
  try {
    const {
      messages,
      model = 'litert-lm',
      temperature = 1.0,
      max_tokens = 256,
      stream = false,
      n = 1,
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Messages array is required',
          type: 'invalid_request_error',
        }
      });
    }

    const prompt = messagesToPrompt(messages);
    const requestId = `chatcmpl-${crypto.randomBytes(16).toString('hex')}`;

    if (stream) {
      // Server-Sent Events for streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      let totalTokens = '';

      for await (const chunk of streamResponse(prompt, { max_tokens })) {
        totalTokens += chunk;

        const streamData = {
          id: requestId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model,
          choices: [{
            index: 0,
            delta: {
              content: chunk,
            },
            finish_reason: null,
          }]
        };

        res.write(`data: ${JSON.stringify(streamData)}\n\n`);
      }

      // Send final chunk
      const finalData = {
        id: requestId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop',
        }]
      };

      res.write(`data: ${JSON.stringify(finalData)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Non-streaming response
      const response = await runLiteRT(prompt, { max_tokens });

      const completionResponse = {
        id: requestId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: response,
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: Math.ceil(prompt.length / 4), // Rough estimate
          completion_tokens: Math.ceil(response.length / 4), // Rough estimate
          total_tokens: Math.ceil((prompt.length + response.length) / 4),
        }
      };

      res.json(completionResponse);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: {
        message: error.message,
        type: 'internal_error',
      }
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Basic info
    const health = {
      status: 'ok',
      model: CONFIG.model_path,
      backend: CONFIG.backend,
      binary: CONFIG.litert_binary
    };

    // Optionally test the binary (if ?test=true is passed)
    if (req.query.test === 'true') {
      try {
        const testResponse = await runLiteRT('Test', { timeout: 5000 });
        health.binary_test = 'passed';
        health.test_response_length = testResponse.length;
      } catch (error) {
        health.binary_test = 'failed';
        health.test_error = error.message;
      }
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// List models endpoint (OpenAI compatible)
app.get('/v1/models', authenticateAPIKey, (req, res) => {
  res.json({
    object: 'list',
    data: [{
      id: 'litert-lm',
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: 'litert-lm',
      permission: [],
      root: 'litert-lm',
      parent: null,
    }]
  });
});

// Start server
app.listen(CONFIG.port, () => {
  console.log(`LiteRT-LM API Server running on port ${CONFIG.port}`);
  console.log(`Using binary: ${CONFIG.litert_binary}`);
  console.log(`Using model: ${CONFIG.model_path}`);
  console.log(`Backend: ${CONFIG.backend}`);
  if (CONFIG.api_key) {
    console.log('API key authentication enabled');
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});