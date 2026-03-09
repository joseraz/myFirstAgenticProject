/**
 * Cross-platform backend setup: creates Python venv and installs dependencies.
 * Works on Mac/Linux and Windows.
 */
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';
const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'backend');
const venvDir = path.join(backendDir, '.venv');

// Python binary inside the venv (platform-aware)
const venvPython = isWindows
  ? path.join(venvDir, 'Scripts', 'python.exe')
  : path.join(venvDir, 'bin', 'python');

// Resolve the system Python command
function getPythonCmd() {
  for (const cmd of ['python3', 'python']) {
    const result = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (result.status === 0) return cmd;
  }
  console.error('ERROR: Python not found. Install Python 3.9+ and try again.');
  process.exit(1);
}

function setup() {
  if (!fs.existsSync(venvPython)) {
    const pythonCmd = getPythonCmd();
    console.log('  Creating Python virtualenv...');
    execSync(`${pythonCmd} -m venv "${venvDir}"`, { stdio: 'inherit' });
  }

  console.log('  Installing Python dependencies...');
  const pip = isWindows
    ? path.join(venvDir, 'Scripts', 'pip.exe')
    : path.join(venvDir, 'bin', 'pip');
  execSync(`"${pip}" install -q -r "${path.join(backendDir, 'requirements.txt')}"`, {
    stdio: 'inherit',
  });
}

module.exports = { setup, venvPython, backendDir };

// Run directly if called as a script
if (require.main === module) {
  setup();
  console.log('  Backend setup complete.');
}
