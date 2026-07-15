import fs from 'node:fs';
import path from 'node:path';

const source = process.argv[2];
const destination = process.argv[3];
if (!source || !destination) {
  throw new Error('Usage: node extract-godot-pck.js <archive.pck> <output-folder>');
}

const archive = fs.readFileSync(source);
const u32 = (offset) => archive.readUInt32LE(offset);
const u64 = (offset) => Number(archive.readBigUInt64LE(offset));

if (archive.subarray(0, 4).toString('ascii') !== 'GDPC') {
  throw new Error('Not a Godot PCK archive (missing GDPC signature).');
}
const format = u32(4);
if (format !== 1) throw new Error(`Unsupported PCK format version: ${format}`);
const flags = u32(20);
if (flags !== 0) throw new Error(`Archive has unsupported flags: ${flags}`);

const fileCount = u32(0x54);
let cursor = 0x58;
const manifest = [];
for (let index = 0; index < fileCount; index += 1) {
  const nameLength = u32(cursor); cursor += 4;
  const storedName = archive.subarray(cursor, cursor + nameLength).toString('utf8').replace(/\0+$/, ''); cursor += nameLength;
  const offset = u64(cursor); cursor += 8;
  const size = u64(cursor); cursor += 8;
  const md5 = archive.subarray(cursor, cursor + 16).toString('hex'); cursor += 16;
  const relative = storedName.replace(/^res:\/\//, '').replace(/\\/g, '/');
  const normalized = path.posix.normalize(relative);
  if (!normalized || normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new Error(`Unsafe archive path: ${storedName}`);
  }
  if (offset + size > archive.length) throw new Error(`File data is outside the archive: ${storedName}`);
  const target = path.join(destination, ...normalized.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, archive.subarray(offset, offset + size));
  manifest.push({ path: normalized, size, md5 });
}

fs.mkdirSync(destination, { recursive: true });
fs.writeFileSync(path.join(destination, '_pck_manifest.json'), JSON.stringify({
  source: path.resolve(source),
  godot: { major: u32(8), minor: u32(12), patch: u32(16) },
  fileCount,
  files: manifest,
}, null, 2));
console.log(`Extracted ${fileCount} files to ${destination}`);
