import fs from 'node:fs';
import path from 'node:path';

const musicDir = path.resolve('public/music');
const outputFile = path.resolve('public/music-manifest.json');

// Ensure directory exists
if (!fs.existsSync(musicDir)) {
  console.error(`Music directory not found: ${musicDir}`);
  process.exit(1);
}

const files = fs.readdirSync(musicDir).filter((file) => {
  return /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file);
});

const manifest = {};

files.forEach((file) => {
  // Key is the filename, value is also the filename (or relative path if we had subdirs)
  // The app will prepend the base URL (local or R2)
  manifest[file] = file;
});

fs.writeFileSync(outputFile, JSON.stringify(manifest, null, 2));

console.log(`Generated manifest with ${files.length} tracks at ${outputFile}`);
