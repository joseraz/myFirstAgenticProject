/**
 * Cross-platform Flask backend launcher.
 * Runs setup first (idempotent), then starts app.py using the venv Python.
 */
const { spawn } = require('child_process');
const path = require('path');
const { setup, venvPython, backendDir } = require('./setup-backend');

setup();

console.log('  Starting Flask on http://localhost:5001 ...');

const flask = spawn(venvPython, [path.join(backendDir, 'app.py')], {
  stdio: 'inherit',
  env: { ...process.env, FLASK_ENV: 'development' },
});

flask.on('error', (err) => {
  console.error('  Failed to start Flask:', err.message);
  process.exit(1);
});

flask.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`  Flask exited with code ${code}`);
    process.exit(code);
  }
});
