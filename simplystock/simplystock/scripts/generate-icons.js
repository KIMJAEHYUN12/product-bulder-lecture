const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// "S" 글자를 path로 표현 (viewBox 0 0 512 512 기준, 중앙 배치)
const S_PATH = `M 310 135 C 290 100 240 80 205 80 C 150 80 105 115 105 168 C 105 230 160 250 215 268 C 270 286 325 310 325 375 C 325 430 280 445 230 445 C 185 445 140 425 115 385 L 145 360 C 162 392 195 415 230 415 C 265 415 295 398 295 370 C 295 310 240 295 185 265 C 145 253 75 225 75 165 C 75 100 135 50 205 50 C 250 50 300 70 330 110 Z`;

// SimplyStock 앱 아이콘 SVG — 다크 배경 + "S" + 인디고 라인
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#0a0a14"/>
  <path d="${S_PATH}" fill="#ffffff"/>
  <line x1="100" y1="460" x2="412" y2="460" stroke="#6366f1" stroke-width="14" stroke-linecap="round"/>
</svg>`;

// Adaptive icon foreground (투명 배경)
const foregroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <path d="${S_PATH}" fill="#ffffff"/>
  <line x1="100" y1="460" x2="412" y2="460" stroke="#6366f1" stroke-width="14" stroke-linecap="round"/>
</svg>`;

// 스플래시 (중앙 로고)
const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2400" width="1200" height="2400">
  <rect width="1200" height="2400" fill="#0a0a14"/>
  <g transform="translate(450, 1000) scale(0.6)">
    <path d="${S_PATH}" fill="#ffffff"/>
    <line x1="100" y1="460" x2="412" y2="460" stroke="#6366f1" stroke-width="14" stroke-linecap="round"/>
  </g>
</svg>`;

const androidRes = path.join(__dirname, "../android/app/src/main/res");
const androidDrawable = path.join(androidRes, "drawable");

const sizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};

const foregroundSizes = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

async function generate() {
  for (const [density, size] of Object.entries(sizes)) {
    const dir = path.join(androidRes, `mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });

    await sharp(Buffer.from(iconSvg))
      .resize(size, size)
      .png()
      .toFile(path.join(dir, "ic_launcher.png"));

    await sharp(Buffer.from(iconSvg))
      .resize(size, size)
      .png()
      .toFile(path.join(dir, "ic_launcher_round.png"));

    console.log(`  mipmap-${density}: ${size}x${size}`);
  }

  for (const [density, size] of Object.entries(foregroundSizes)) {
    const dir = path.join(androidRes, `mipmap-${density}`);
    await sharp(Buffer.from(foregroundSvg))
      .resize(size, size)
      .png()
      .toFile(path.join(dir, "ic_launcher_foreground.png"));
  }

  fs.mkdirSync(androidDrawable, { recursive: true });
  await sharp(Buffer.from(splashSvg))
    .resize(1200, 2400)
    .png()
    .toFile(path.join(androidDrawable, "splash.png"));
  console.log("  splash: 1200x2400");

  console.log("Done!");
}

generate().catch(console.error);
