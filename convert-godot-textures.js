import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const sourceFolder = process.argv[2];
const destinationFolder = process.argv[3];
if (!sourceFolder || !destinationFolder) {
  throw new Error('Usage: node convert-godot-textures.js <stex-folder> <output-folder>');
}

fs.mkdirSync(destinationFolder, { recursive: true });
const results = [];
for (const fileName of fs.readdirSync(sourceFolder).filter((name) => name.endsWith('.stex'))) {
  const texture = fs.readFileSync(path.join(sourceFolder, fileName));
  const riffOffset = texture.indexOf(Buffer.from('RIFF'));
  if (riffOffset < 0 || texture.subarray(riffOffset + 8, riffOffset + 12).toString('ascii') !== 'WEBP') {
    throw new Error(`No embedded WebP image found in ${fileName}`);
  }
  const webpLength = texture.readUInt32LE(riffOffset + 4) + 8;
  const webp = texture.subarray(riffOffset, riffOffset + webpLength);
  const outputName = fileName.replace(/\.stex$/i, '.png');
  const outputPath = path.join(destinationFolder, outputName);
  const metadata = await sharp(webp).png().toFile(outputPath);
  results.push({ source: fileName, output: path.basename(outputPath), width: metadata.width, height: metadata.height });
}
fs.writeFileSync(path.join(destinationFolder, '_texture_manifest.json'), JSON.stringify(results, null, 2));
console.log(`Converted ${results.length} textures to ${destinationFolder}`);
