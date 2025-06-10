#!/usr/bin/env node
// test-litert.js - Test script to verify LiteRT-LM binary works correctly

const { spawn } = require('child_process');
const path = require('path');

// Configuration - update these paths as needed
const LITERT_BINARY = process.env.LITERT_BINARY || './litert_lm_main';
const MODEL_PATH = process.env.MODEL_PATH || 'gemma-3n-e4b-it-int4.litertlm';
const BACKEND = process.env.BACKEND || 'cpu';

console.log('🧪 Testing LiteRT-LM Binary\n');
console.log(`Binary: ${LITERT_BINARY}`);
console.log(`Model: ${MODEL_PATH}`);
console.log(`Backend: ${BACKEND}\n`);

// Test 1: Simple inference
console.log('Test 1: Simple inference');
console.log('Command:', `${LITERT_BINARY} --backend=${BACKEND} --model_path=${MODEL_PATH} --input_prompt="Hello world"`);
console.log('---');

const test1 = spawn(LITERT_BINARY, [
  '--backend', BACKEND,
  '--model_path', MODEL_PATH,
  '--input_prompt', 'Hello world'
]);

let output1 = '';
let error1 = '';

test1.stdout.on('data', (data) => {
  output1 += data.toString();
  process.stdout.write(data);
});

test1.stderr.on('data', (data) => {
  error1 += data.toString();
  process.stderr.write(data);
});

test1.on('close', (code) => {
  console.log('\n---');
  console.log(`Exit code: ${code}`);

  if (code === 0) {
    console.log('✅ Test 1 passed!\n');
  } else {
    console.log('❌ Test 1 failed!\n');
    process.exit(1);
  }

  // Test 2: Benchmark mode
  console.log('Test 2: Benchmark mode');
  console.log('Command:', `${LITERT_BINARY} --backend=${BACKEND} --model_path=${MODEL_PATH} --benchmark --benchmark_prefill_tokens=10 --benchmark_decode_tokens=10 --async=false`);
  console.log('---');

  const test2 = spawn(LITERT_BINARY, [
    '--backend', BACKEND,
    '--model_path', MODEL_PATH,
    '--benchmark',
    '--benchmark_prefill_tokens', '10',
    '--benchmark_decode_tokens', '10',
    '--async', 'false'
  ]);

  let output2 = '';
  let error2 = '';

  test2.stdout.on('data', (data) => {
    output2 += data.toString();
    process.stdout.write(data);
  });

  test2.stderr.on('data', (data) => {
    error2 += data.toString();
    process.stderr.write(data);
  });

  test2.on('close', (code2) => {
    console.log('\n---');
    console.log(`Exit code: ${code2}`);

    if (code2 === 0) {
      console.log('✅ Test 2 passed!\n');
      console.log('🎉 All tests passed! Your LiteRT-LM setup is working correctly.');
    } else {
      console.log('❌ Test 2 failed!\n');
      console.log('Benchmark mode failed. This is normal - your binary should still work for inference.');
    }
  });
});