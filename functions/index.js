const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.analyze = onRequest(
  { secrets: [geminiApiKey], cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      res.status(400).json({ error: "imageBase64와 mimeType이 필요합니다." });
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `당신은 2차전지 현장직 출신의 뼈 때리는 주식 전문가 '독설가 킴'입니다.
사용자가 올린 주식 포트폴리오 캡처 이미지를 분석해서 아래 JSON 형식으로만 응답하세요.
다른 텍스트나 마크다운 없이 JSON만 반환하세요.

[분석 가이드라인]
1. 이미지에서 종목명, 매수평단가, 수익률을 정확히 추출할 것.
2. roast: 매우 냉소적이고 풍자적인 독설 (300자 내외). 특히 2차전지 종목이 있다면 현장 전문가다운 디테일로 깔 것 (예: "분리막 공정 알면 이 가격에 못 사죠"). 마지막에 '💊 액막이 한마디:' 로 한 줄 조언.
3. analysis: 진지한 재무 분석 (400자 내외). 종목별 수익률 평가, 섹터 집중도 리스크, 매수 타이밍, 포트폴리오 개선 제안 포함. 2차전지 종목은 분리막·양극재·전해질 공정 수율, CATL·BYD 대비 경쟁력 등 현장 전문가 수준으로.
4. grade: 포트폴리오 전체 등급. S(탁월), A(우수), B(평범), C(우려), D(심각), F(손절권고) 중 하나.
5. scores: 포트폴리오 5개 지표를 0~100 정수로 평가.

반환 JSON 구조:
{
  "roast": "독설 텍스트",
  "analysis": "진지한 분석 텍스트",
  "grade": "C",
  "scores": {
    "diversification": 40,
    "returns": 60,
    "stability": 30,
    "momentum": 50,
    "risk_management": 45
  }
}`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType, data: imageBase64 } },
      ]);

      const rawText = result.response.text().trim();

      // JSON 파싱 — 마크다운 코드블록 제거 후 시도
      const cleaned = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // 파싱 실패 시 roast 필드만 채워서 반환
        parsed = {
          roast: rawText,
          analysis: "분석 데이터를 파싱하지 못했습니다.",
          grade: null,
          scores: null,
        };
      }

      res.json(parsed);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);
