#!/usr/bin/env node

/**
 * This script checks if the Python LLM client is working correctly.
 * Run with: node lib/check-llm.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execPromise = promisify(exec);

async function checkPythonCommands() {
  console.log('Checking available Python commands...');
  
  try {
    const { stdout: pythonVersion } = await execPromise('python --version');
    console.log(`✅ python available: ${pythonVersion.trim()}`);
  } catch (e) {
    console.log('❌ python not available');
  }
  
  try {
    const { stdout: python3Version } = await execPromise('python3 --version');
    console.log(`✅ python3 available: ${python3Version.trim()}`);
  } catch (e) {
    console.log('❌ python3 not available');
  }
  
  // Check pip/pip3 installation
  try {
    const { stdout: pipVersion } = await execPromise('pip --version');
    console.log(`✅ pip available: ${pipVersion.trim()}`);
  } catch (e) {
    console.log('❌ pip not available');
  }
  
  try {
    const { stdout: pip3Version } = await execPromise('pip3 --version');
    console.log(`✅ pip3 available: ${pip3Version.trim()}`);
  } catch (e) {
    console.log('❌ pip3 not available');
  }
}

async function checkLlmScript() {
  console.log('\nChecking LLM script locations...');
  
  const potentialLocations = [
    path.resolve(process.cwd(), '../avos-bot-clean/src/llm_client.py'),
    path.resolve(process.cwd(), 'src/llm_client.py'),
    path.resolve(process.cwd(), '../src/llm_client.py'),
    path.resolve(process.cwd(), 'lib/llm_client.py'),
    path.resolve(process.cwd(), '../llm_client.py'),
    path.resolve(process.cwd(), 'llm_client.py')
  ];
  
  let found = false;
  
  for (const location of potentialLocations) {
    if (fs.existsSync(location)) {
      console.log(`✅ Found script at: ${location}`);
      found = true;
      
      // Check if file is executable
      try {
        fs.accessSync(location, fs.constants.X_OK);
        console.log('✅ Script is executable');
      } catch (e) {
        console.log('⚠️ Script is not executable. Consider running: chmod +x ' + location);
      }
      
      // Check script content
      const content = fs.readFileSync(location, 'utf8');
      if (content.includes('get_llm_response')) {
        console.log('✅ Script appears to contain necessary LLM functions');
      } else {
        console.log('❌ Script might not be the correct LLM client (get_llm_response function not found)');
      }
    }
  }
  
  if (!found) {
    console.log('❌ Could not find LLM client script in any expected location');
    console.log('⚠️ You may need to specify the correct path in lib/llmClient.ts');
  }
}

async function checkDependencies() {
  console.log('\nChecking Python dependencies...');
  
  const requiredPackages = ['requests', 'openai'];
  
  for (const pkg of requiredPackages) {
    try {
      // Try different python commands
      try {
        await execPromise(`python -c "import ${pkg}"`);
        console.log(`✅ ${pkg} is installed for python`);
        continue;
      } catch (e) {
        // Try with python3 if python fails
        try {
          await execPromise(`python3 -c "import ${pkg}"`);
          console.log(`✅ ${pkg} is installed for python3`);
          continue;
        } catch (e2) {
          throw new Error(`${pkg} not found for either python or python3`);
        }
      }
    } catch (e) {
      console.log(`❌ ${pkg} is not installed. Install with: pip install ${pkg}`);
    }
  }
}

async function testLlmQuery() {
  console.log('\nTesting a simple LLM query...');
  
  // Find the script path
  let scriptPath = null;
  const potentialLocations = [
    path.resolve(process.cwd(), '../avos-bot-clean/src/llm_client.py'),
    path.resolve(process.cwd(), 'src/llm_client.py'),
    path.resolve(process.cwd(), '../src/llm_client.py'),
    path.resolve(process.cwd(), 'lib/llm_client.py'),
    path.resolve(process.cwd(), 'llm_client.py')
  ];
  
  for (const location of potentialLocations) {
    if (fs.existsSync(location)) {
      scriptPath = location;
      break;
    }
  }
  
  if (!scriptPath) {
    console.log('❌ Could not find LLM script to test');
    return;
  }
  
  const testQuery = "What is AVOS?";
  
  try {
    // Try with python3 first
    try {
      console.log(`Running: python3 "${scriptPath}" "${testQuery}"`);
      const { stdout, stderr } = await execPromise(`python3 "${scriptPath}" "${testQuery}"`);
      
      if (stderr) {
        console.log(`⚠️ Warning output: ${stderr}`);
      }
      
      if (stdout.trim()) {
        console.log('✅ Received response from LLM client!');
        console.log('Response preview: ' + stdout.trim().substring(0, 100) + '...');
      } else {
        console.log('❌ Empty response from LLM client');
      }
    } catch (e) {
      // Try with python instead
      console.log('Python3 command failed, trying python...');
      console.log(`Running: python "${scriptPath}" "${testQuery}"`);
      const { stdout, stderr } = await execPromise(`python "${scriptPath}" "${testQuery}"`);
      
      if (stderr) {
        console.log(`⚠️ Warning output: ${stderr}`);
      }
      
      if (stdout.trim()) {
        console.log('✅ Received response from LLM client!');
        console.log('Response preview: ' + stdout.trim().substring(0, 100) + '...');
      } else {
        console.log('❌ Empty response from LLM client');
      }
    }
  } catch (e) {
    console.log('❌ Failed to run LLM client test:', e.message);
  }
}

async function main() {
  console.log('LLM Client Diagnostic Tool\n');
  
  await checkPythonCommands();
  await checkLlmScript();
  await checkDependencies();
  await testLlmQuery();
  
  console.log('\nDiagnostic completed.');
  console.log('\nTo fix LLM client issues:');
  console.log('1. Ensure Python is installed (python or python3)');
  console.log('2. Install required packages: pip install requests openai');
  console.log('3. Check the LLM script path in lib/llmClient.ts');
  console.log('4. Try running the script manually: python path/to/llm_client.py "test query"');
}

main().catch(console.error); 