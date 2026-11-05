import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('================================================================');
console.log('⚡ Starting DG Billing — GST Billing & Multi-Business Platform');
console.log('================================================================\n');

// 1. Start Backend REST API Server (Port 5050)
const server = spawn('node', ['server/server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

// 2. Start Frontend Vite Client (Port 5174)
const client = spawn('npm', ['--prefix', 'client', 'run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

console.log('📡 Backend API : http://localhost:5050/api');
console.log('🖥️ Frontend App : http://localhost:5174\n');

process.on('SIGINT', () => {
  console.log('\nStopping Vyapar servers...');
  server.kill();
  client.kill();
  process.exit(0);
});
