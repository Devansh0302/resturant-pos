const fs = require('fs');
const path = require('path');

const prismaDir = path.join(__dirname, 'prisma');

function walkDir(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const replacements = [
  ['@spiceroute.in', '@nxtdine.in'],
  ['@spiceroute.com', '@nxtdine.com'],
  ['@bitepoint.com', '@nxtdine.com'],
  ['spice-route', 'nxtdine'],
  ['Spice Route', 'NxtDine']
];

const files = walkDir(prismaDir);
let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', path.relative(prismaDir, file));
    count++;
  }
}

console.log(`\nDone! Updated ${count} files.`);
