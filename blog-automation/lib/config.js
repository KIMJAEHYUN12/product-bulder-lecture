const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

module.exports = {
  FIREBASE_HOST: "https://bitgak.co.kr",
  SIMPLYSTOCK_URL: "https://www.simplystock.co.kr",
  DART_API_KEY: process.env.DART_API_KEY || "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  DART_BASE_URL: "https://opendart.fss.or.kr/api",
  OUTPUT_DIR: path.join(__dirname, "..", "output"),
};
