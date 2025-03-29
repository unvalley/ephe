import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/**
 * Script to copy WASM file from @dprint/markdown package to public directory
 */
import { getPath } from '@dprint/markdown';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Source and target paths
const sourceWasmPath = getPath();
const targetDir = path.join(rootDir, 'public', 'wasm');
const targetPath = path.join(targetDir, 'dprint-markdown.wasm');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy WASM file
fs.copyFileSync(sourceWasmPath, targetPath);
console.log(`Copied WASM from ${sourceWasmPath} to ${targetPath}`); 