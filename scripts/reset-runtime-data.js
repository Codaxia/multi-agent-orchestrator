const fs = require('fs');
const path = require('path');

const runtimeDir = path.join(__dirname, '..', 'data', 'runtime');
const backupRoot = path.join(__dirname, '..', 'data', 'runtime-backups');

if (!fs.existsSync(runtimeDir)) {
  console.log('No runtime directory found. Nothing to reset.');
  process.exit(0);
}

const files = fs.readdirSync(runtimeDir);

if (files.length > 0) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(backupRoot, stamp);
  fs.mkdirSync(backupDir, { recursive: true });

  for (const file of files) {
    fs.copyFileSync(path.join(runtimeDir, file), path.join(backupDir, file));
  }

  console.log(`Backed up ${files.length} runtime file(s) to ${backupDir}`);
}

for (const file of files) {
  fs.rmSync(path.join(runtimeDir, file), { force: true });
}

console.log(`Reset ${files.length} runtime file(s). Restart the API to rebootstrap from data/seeds/.`);
