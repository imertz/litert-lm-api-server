#!/usr/bin/env node
// setup.js - Helper script to set up the LiteRT-LM API server

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🚀 LiteRT-LM API Server Setup\n');

  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found. Please run this script in the server directory.');
    process.exit(1);
  }

  // Install dependencies
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }

  // Check for LiteRT-LM binary
  console.log('🔍 Checking for LiteRT-LM binary...');
  const defaultBinaryPath = './litert_lm_main';
  let binaryPath = defaultBinaryPath;

  if (!fs.existsSync(binaryPath)) {
    console.log('⚠️  LiteRT-LM binary not found in current directory.');
    const customPath = await question('Enter the path to your litert_lm_main binary: ');

    if (fs.existsSync(customPath)) {
      // Create symlink
      try {
        fs.symlinkSync(path.resolve(customPath), defaultBinaryPath);
        console.log('✅ Created symlink to binary');
      } catch (error) {
        console.log('⚠️  Could not create symlink, will use absolute path');
        binaryPath = path.resolve(customPath);
      }
    } else {
      console.error('❌ Binary not found at specified path');
      process.exit(1);
    }
  } else {
    console.log('✅ Found LiteRT-LM binary');
  }

  // Check for model file
  console.log('\n🔍 Checking for model file...');
  const modelFiles = fs.readdirSync('.').filter(f => f.endsWith('.litertlm'));
  let modelPath;

  if (modelFiles.length === 0) {
    console.log('⚠️  No .litertlm model files found in current directory.');
    const customModelPath = await question('Enter the path to your .litertlm model file: ');

    if (fs.existsSync(customModelPath)) {
      const modelFileName = path.basename(customModelPath);
      // Create symlink
      try {
        fs.symlinkSync(path.resolve(customModelPath), modelFileName);
        console.log('✅ Created symlink to model file');
        modelPath = modelFileName;
      } catch (error) {
        console.log('⚠️  Could not create symlink, will use absolute path');
        modelPath = path.resolve(customModelPath);
      }
    } else {
      console.error('❌ Model file not found at specified path');
      process.exit(1);
    }
  } else if (modelFiles.length === 1) {
    modelPath = modelFiles[0];
    console.log(`✅ Found model file: ${modelPath}`);
  } else {
    console.log('Found multiple model files:');
    modelFiles.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    const choice = await question('Select model (enter number): ');
    modelPath = modelFiles[parseInt(choice) - 1];
  }

  // Create .env file
  console.log('\n📝 Creating configuration file...');

  const backend = await question('Which backend do you want to use? (cpu/gpu) [cpu]: ') || 'cpu';
  const port = await question('Which port should the server run on? [3000]: ') || '3000';
  const apiKey = await question('Set an API key (or press enter for default): ') || 'sk-litert-demo-key';

  const envContent = `# LiteRT-LM API Server Configuration
PORT=${port}

# LiteRT-LM Configuration
LITERT_BINARY=${binaryPath === defaultBinaryPath ? defaultBinaryPath : binaryPath}
MODEL_PATH=${modelPath}
BACKEND=${backend}

# Security
API_KEY=${apiKey}

# Additional Options (uncomment to use)
# REPORT_PEAK_MEMORY_FOOTPRINT=true
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Created .env configuration file');

  // Test the setup
  console.log('\n🧪 Testing LiteRT-LM binary...');
  try {
    const testCommand = `${binaryPath === defaultBinaryPath ? defaultBinaryPath : binaryPath} --model_path=${modelPath} --backend=${backend} --input_prompt="Test" --benchmark_decode_tokens=1`;
    console.log(`Running: ${testCommand}`);

    execSync(testCommand, { stdio: 'ignore' });
    console.log('✅ LiteRT-LM binary test successful');
  } catch (error) {
    console.log('⚠️  LiteRT-LM test failed. Please check your binary and model paths.');
    console.log('You may need to approve the binary in your system security settings.');
  }

  console.log('\n✨ Setup complete! You can now start the server with:');
  console.log('   npm start\n');
  console.log('Test the API with:');
  console.log(`   curl http://localhost:${port}/v1/chat/completions \\
     -H "Content-Type: application/json" \\
     -H "Authorization: Bearer ${apiKey}" \\
     -d '{"model": "litert-lm", "messages": [{"role": "user", "content": "Hello!"}]}'`);

  rl.close();
}

main().catch(error => {
  console.error('Setup failed:', error);
  rl.close();
  process.exit(1);
});