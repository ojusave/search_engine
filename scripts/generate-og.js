/**
 * Generates the Open Graph image (1200x630 PNG)
 * Run: node scripts/generate-og.js
 */

const sharp = require('sharp');
const path = require('path');

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7e22ce"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.08)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>

  <!-- Subtle grid pattern -->
  <g opacity="0.06">
    ${Array.from({ length: 30 }, (_, i) => `<line x1="${i * 42}" y1="0" x2="${i * 42}" y2="${HEIGHT}" stroke="white" stroke-width="1"/>`).join('')}
    ${Array.from({ length: 16 }, (_, i) => `<line x1="0" y1="${i * 42}" x2="${WIDTH}" y2="${i * 42}" stroke="white" stroke-width="1"/>`).join('')}
  </g>

  <!-- Decorative corner accent -->
  <rect x="0" y="0" width="6" height="${HEIGHT}" fill="rgba(255,255,255,0.15)"/>

  <!-- Render logo mark (simplified) -->
  <g transform="translate(80, 180)" opacity="0.12">
    <path d="m85.7 7.5c-13.4-.63-24.7 9.06-26.6 21.8-.08.6-.19 1.17-.29 1.74-2.99 15.9-16.9 27.95-33.6 27.95-5.96 0-11.56-1.53-16.43-4.21-.59-.32-1.3.1-1.3.76v3.42 51.57h51.34v-38.66c0-7.11 5.75-12.89 12.83-12.89h12.83c14.53 0 26.22-12.1 25.65-26.83-.51-13.25-11.22-24.07-24.41-24.7z" fill="white"/>
  </g>

  <!-- Title -->
  <text x="80" y="280" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="700" font-size="64" fill="white" letter-spacing="-1">AI Search Assistant</text>

  <!-- Subtitle -->
  <text x="80" y="340" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="400" font-size="26" fill="rgba(255,255,255,0.75)">Perplexity-style search with conversational memory</text>

  <!-- Tech stack pills -->
  <g transform="translate(80, 390)">
    <rect x="0" y="0" width="100" height="36" rx="0" fill="rgba(255,255,255,0.15)"/>
    <text x="50" y="23" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" font-size="15" fill="white" text-anchor="middle">Groq</text>

    <rect x="116" y="0" width="100" height="36" rx="0" fill="rgba(255,255,255,0.15)"/>
    <text x="166" y="23" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" font-size="15" fill="white" text-anchor="middle">Exa.ai</text>

    <rect x="232" y="0" width="120" height="36" rx="0" fill="rgba(255,255,255,0.15)"/>
    <text x="292" y="23" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" font-size="15" fill="white" text-anchor="middle">PostgreSQL</text>

    <rect x="368" y="0" width="120" height="36" rx="0" fill="rgba(255,255,255,0.15)"/>
    <text x="428" y="23" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" font-size="15" fill="white" text-anchor="middle">Streaming</text>
  </g>

  <!-- Bottom bar -->
  <rect x="0" y="${HEIGHT - 70}" width="${WIDTH}" height="70" fill="rgba(0,0,0,0.2)"/>
  <text x="80" y="${HEIGHT - 30}" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="600" font-size="22" fill="white">Deployed on Render</text>
  <text x="${WIDTH - 80}" y="${HEIGHT - 30}" font-family="Inter, Helvetica, Arial, sans-serif" font-weight="400" font-size="16" fill="rgba(255,255,255,0.6)" text-anchor="end">render.com</text>
</svg>`;

async function generate() {
  const outputPath = path.join(__dirname, '..', 'public', 'img', 'og.png');
  await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(outputPath);
  console.log(`OG image generated: ${outputPath}`);
}

generate().catch(console.error);
