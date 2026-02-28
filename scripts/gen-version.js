const fs = require("fs");
const path = require("path");

const version = { v: Date.now().toString() };
const publicDir = path.join(__dirname, "../public");
const outPath = path.join(publicDir, "version.json");

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

fs.writeFileSync(outPath, JSON.stringify(version));
console.log("✓ version.json generated:", version.v);
