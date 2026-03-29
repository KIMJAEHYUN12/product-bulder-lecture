/**
 * OG 이미지 생성 스크립트 (sharp 사용)
 * 실행: node scripts/generate-og.js
 * 출력: public/og-image.png (1200x630)
 */
const sharp = require("sharp");
const path = require("path");

const W = 1200;
const H = 630;

// 그리드 라인 생성
let gridLines = "";
for (let x = 0; x < W; x += 60) {
  gridLines += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`;
}
for (let y = 0; y < H; y += 60) {
  gridLines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0a0a0a"/>
      <stop offset="0.5" stop-color="#111827"/>
      <stop offset="1" stop-color="#0a0a0a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="transparent"/>
      <stop offset="0.3" stop-color="#4f46e5"/>
      <stop offset="0.7" stop-color="#4f46e5"/>
      <stop offset="1" stop-color="transparent"/>
    </linearGradient>
  </defs>
  <!-- 배경 -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <!-- 상단 액센트 -->
  <rect y="0" width="${W}" height="3" fill="url(#accent)"/>
  <!-- 그리드 -->
  ${gridLines}
  <!-- 타이틀 -->
  <text x="${W / 2}" y="${H / 2 - 30}" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="72" fill="#ffffff">오 비 젼</text>
  <!-- 서브텍스트 -->
  <text x="${W / 2}" y="${H / 2 + 30}" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#9ca3af">AI가 분석하고, 팩트로 때립니다</text>
  <!-- 하단 태그 -->
  <text x="${W / 2}" y="${H / 2 + 80}" text-anchor="middle" font-family="monospace" font-size="18" fill="#6b7280">포폴 진단 · 빗각 차트 · 모의투자 · 종목 분석실</text>
  <!-- 하단 액센트 -->
  <rect y="${H - 3}" width="${W}" height="3" fill="url(#accent)"/>
</svg>`;

const out = path.join(__dirname, "..", "public", "og-image.png");

sharp(Buffer.from(svg))
  .png()
  .toFile(out)
  .then((info) => console.log(`OG image saved: ${out} (${info.size} bytes)`))
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
