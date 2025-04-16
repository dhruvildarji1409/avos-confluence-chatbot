import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = promisify(exec);

/**
 * This is a debug endpoint to test Python functionality.
 * Remove in production.
 */
export async function GET() {
  try {
    // Check if Python is available
    const pythonVersions = [];
    
    try {
      // Try python3 first
      const { stdout: python3Version } = await execPromise('python3 --version');
      pythonVersions.push({ command: 'python3', version: python3Version.trim() });
    } catch (e) {
      pythonVersions.push({ command: 'python3', error: String(e) });
    }
    
    try {
      // Try python next
      const { stdout: pythonVersion } = await execPromise('python --version');
      pythonVersions.push({ command: 'python', version: pythonVersion.trim() });
    } catch (e) {
      pythonVersions.push({ command: 'python', error: String(e) });
    }
    
    // Check for llm_client.py existence
    const scriptPath = path.resolve(process.cwd(), 'lib/llm_client.py');
    const scriptExists = fs.existsSync(scriptPath);
    
    // Try to run the script with a simple test input
    let scriptOutput = null;
    let scriptError = null;
    
    if (scriptExists) {
      try {
        const command = `python3 "${scriptPath}" "test query"`;
        const { stdout, stderr } = await execPromise(command);
        scriptOutput = stdout.trim();
        scriptError = stderr || null;
      } catch (e) {
        scriptError = String(e);
      }
    }
    
    // Try to get Python dependencies
    let dependencies = null;
    try {
      const { stdout } = await execPromise('python3 -m pip list');
      dependencies = stdout.trim();
    } catch (e) {
      dependencies = `Error: ${String(e)}`;
    }
    
    return NextResponse.json({
      success: true,
      pythonVersions,
      scriptInfo: {
        path: scriptPath,
        exists: scriptExists,
        output: scriptOutput,
        error: scriptError
      },
      dependencies: dependencies,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
} 