#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Database Designer Tests\n');

// Check if we're in the tests directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the tests directory');
  process.exit(1);
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Run unit tests
console.log('🔬 Running Unit Tests...');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✅ Unit tests passed\n');
} catch (error) {
  console.error('❌ Unit tests failed:', error.message);
  process.exit(1);
}

// Check if Playwright is installed
try {
  execSync('npx playwright --version', { stdio: 'pipe' });
} catch (error) {
  console.log('🎭 Installing Playwright...');
  try {
    execSync('npx playwright install', { stdio: 'inherit' });
    console.log('✅ Playwright installed\n');
  } catch (error) {
    console.error('❌ Failed to install Playwright:', error.message);
    process.exit(1);
  }
}

// Run integration tests
console.log('🔗 Running Integration Tests...');
try {
  execSync('npm run test:integration', { stdio: 'inherit' });
  console.log('✅ Integration tests passed\n');
} catch (error) {
  console.error('❌ Integration tests failed:', error.message);
  process.exit(1);
}

console.log('🎉 All tests passed!');
