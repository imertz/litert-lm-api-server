// litert-parser.js
// Module for parsing LiteRT-LM output more robustly

/**
 * Parse the raw output from litert_lm_main to extract the generated text
 * @param {string} output - Raw output from the LiteRT-LM binary
 * @returns {string} - Extracted generated text
 */
function parseLiteRTOutput(output) {
  const lines = output.split('\n');
  let response = '';
  let inResponse = false;
  let foundResponseMarker = false;

  // Common response markers used by different LiteRT-LM models
  const responseMarkers = [
    'Response:',
    'Generated text:',
    'Output:',
    'Assistant:',
    'Model output:',
    'Generation:',
    'model\n' // Gemma models use this format
  ];

  // End markers that indicate we should stop collecting response
  const endMarkers = [
    'Prefill:',
    'Decode:',
    'Peak memory',
    'Tokens/sec',
    'Performance:',
    'Benchmark results:',
    '---', // Common separator
    '===', // Another common separator
    'I0000', // Log line prefix
    'W0000', // Warning prefix
    'E0000', // Error prefix
    'F0000'  // Fatal prefix
  ];

  // Skip initial log lines
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for where the actual output starts (after all the initialization logs)
    if (!line.match(/^[IWEF]\d{4}/) && !line.includes('INFO:') && !line.includes('WARNING:') && line.trim()) {
      startIndex = i;
      break;
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if we've hit an end marker
    if (endMarkers.some(marker => line.includes(marker))) {
      if (inResponse) {
        break; // Stop collecting if we were in the response section
      }
    }

    // Check for response markers
    for (const marker of responseMarkers) {
      if (line.includes(marker)) {
        inResponse = true;
        foundResponseMarker = true;

        // Extract text after the marker if it's on the same line
        const markerIndex = line.indexOf(marker);
        const afterMarker = line.substring(markerIndex + marker.length).trim();

        if (afterMarker) {
          response = afterMarker;
        }
        break;
      }
    }

    // If we're in the response section, collect lines
    if (inResponse && i > 0) { // Skip the marker line itself
      // Skip empty lines at the beginning of response
      if (!response && !trimmedLine) {
        continue;
      }

      // Add the line to our response
      if (trimmedLine) {
        if (response) response += '\n';
        response += line; // Use original line to preserve formatting
      }
    }
  }

  // If we didn't find any response markers, assume everything after logs is the response
  if (!foundResponseMarker && startIndex < lines.length) {
    const responseLines = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // Stop if we hit end markers
      if (endMarkers.some(marker => line.includes(marker))) {
        break;
      }

      // Collect non-empty lines
      if (line.trim()) {
        responseLines.push(line);
      }
    }

    response = responseLines.join('\n');
  }

  // Clean up the response
  response = response.trim();

  // Remove any trailing performance metrics that might have been included
  const perfPatterns = [
    /\nPrefill:.*$/s,
    /\nDecode:.*$/s,
    /\nPeak memory.*$/s,
    /\nTokens\/sec.*$/s
  ];

  for (const pattern of perfPatterns) {
    response = response.replace(pattern, '').trim();
  }

  return response || 'No response generated';
}

/**
 * Extract structured information from LiteRT-LM output
 * @param {string} output - Raw output from the LiteRT-LM binary
 * @returns {Object} - Structured output with response and metadata
 */
function parseStructuredOutput(output) {
  const result = {
    response: parseLiteRTOutput(output),
    metrics: {}
  };

  // Try to extract performance metrics
  const lines = output.split('\n');

  for (const line of lines) {
    // Prefill performance
    if (line.includes('Prefill:')) {
      const match = line.match(/Prefill:.*?(\d+\.?\d*)\s*tokens\/sec/i);
      if (match) {
        result.metrics.prefillTokensPerSec = parseFloat(match[1]);
      }
    }

    // Decode performance
    if (line.includes('Decode:')) {
      const match = line.match(/Decode:.*?(\d+\.?\d*)\s*tokens\/sec/i);
      if (match) {
        result.metrics.decodeTokensPerSec = parseFloat(match[1]);
      }
    }

    // Peak memory
    if (line.includes('Peak memory')) {
      const match = line.match(/Peak memory.*?(\d+\.?\d*)\s*MB/i);
      if (match) {
        result.metrics.peakMemoryMB = parseFloat(match[1]);
      }
    }
  }

  return result;
}

module.exports = {
  parseLiteRTOutput,
  parseStructuredOutput
};