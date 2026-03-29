const { GoogleGenerativeAI } = require("@google/generative-ai");
const { execSync } = require("child_process");
const apiKey = execSync("firebase functions:secrets:access GEMINI_API_KEY --project simplystock-b3b85 2>/dev/null").toString().trim();

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const prompt = `너는 전형적인 한국 개인투자자야. 감정적이고, FOMO에 약해.

[시장 상황]
- 공포탐욕지수: 45
- 인기종목: 삼성전자, SK하이닉스, NAVER

[내 포트폴리오]
- 현금: 10,000,000원
- 보유종목: 없음

[매수 가능 종목]
삼성전자(005930.KS): 55000원 (+1.2%)
SK하이닉스(000660.KS): 210000원 (-0.5%)
NAVER(035420.KS): 180000원 (+2.1%)

[규칙]
- 최대 5종목, 현금 10% 유지, 종목당 25%

반드시 JSON만 응답:
{"thinking":"독백","actions":[{"type":"buy","symbol":"005930.KS","name":"삼성전자","reason":"이유","conviction":7,"amountPct":20}]}`;

(async () => {
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 1.2, maxOutputTokens: 2048, responseMimeType: "application/json" },
  });

  const cand = result.response.candidates[0];
  console.log("parts count:", cand.content.parts.length);
  for (let i = 0; i < cand.content.parts.length; i++) {
    const p = cand.content.parts[i];
    console.log("part", i, "- thought:", !!p.thought, "- text length:", (p.text || "").length);
    if (p.text) console.log("  text:", p.text.slice(0, 300));
  }

  const t = result.response.text();
  console.log("\ntext() length:", t.length);
  console.log("text():", t.slice(0, 400));

  try { JSON.parse(t); console.log("PARSE: OK"); } catch (e) { console.log("PARSE FAIL:", e.message); }
  process.exit(0);
})();
