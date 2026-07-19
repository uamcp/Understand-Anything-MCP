import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function convert() {
  const svgPath = path.resolve('icon.svg');
  const outLogoPath = path.resolve('docs/logo.png');
  const outIconPath = path.resolve('assets/icon.png');

  // Ensure directories exist
  fs.mkdirSync(path.dirname(outLogoPath), { recursive: true });
  fs.mkdirSync(path.dirname(outIconPath), { recursive: true });

  try {
    await sharp(svgPath)
      .png()
      .toFile(outLogoPath);
    console.log(`Successfully converted ${svgPath} to ${outLogoPath}`);

    await sharp(svgPath)
      .png()
      .toFile(outIconPath);
    console.log(`Successfully converted ${svgPath} to ${outIconPath}`);
  } catch (error) {
    console.error('Conversion failed:', error);
    process.exit(1);
  }
}

convert();
