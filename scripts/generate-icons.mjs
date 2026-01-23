import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// SVG icon with dark background and padding for maskable icons
// Safe zone for maskable is inner 80%, so we add 10% padding on each side
const createSvg = (size, padding = 0) => {
  const iconSize = size - (padding * 2);
  const scale = iconSize / 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#1a1a1a"/>
  <g transform="translate(${padding}, ${padding}) scale(${scale})">
    <path d="M13 5h8" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13 12h8" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M13 19h8" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="m3 17 2 2 4-4" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="3" y="4" width="6" height="6" rx="1" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
};

async function generateIcons() {
  const sizes = [192, 512];

  for (const size of sizes) {
    // Regular icon (no extra padding)
    const regularSvg = createSvg(size, size * 0.15); // 15% padding looks balanced
    const regularPng = await sharp(Buffer.from(regularSvg)).png().toBuffer();
    writeFileSync(join(publicDir, `pwa-${size}x${size}.png`), regularPng);
    console.log(`Generated pwa-${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  const appleSvg = createSvg(180, 180 * 0.15);
  const applePng = await sharp(Buffer.from(appleSvg)).png().toBuffer();
  writeFileSync(join(publicDir, 'apple-touch-icon.png'), applePng);
  console.log('Generated apple-touch-icon.png');
}

generateIcons().catch(console.error);
