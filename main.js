import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

// --- 상태 ---
let uploadedImageBase64 = null;
let uploadedMimeType = null;

// --- DOM ---
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const apiStatus = document.getElementById('apiStatus');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const dropContent = document.getElementById('dropContent');
const preview = document.getElementById('preview');
const roastBtn = document.getElementById('roastBtn');
const resultCard = document.getElementById('resultCard');
const resultText = document.getElementById('resultText');

// --- API 키 로드/저장 ---
const savedKey = localStorage.getItem('gemini_api_key');
if (savedKey) {
  apiKeyInput.value = savedKey;
  showApiStatus('저장된 키가 있습니다', 'ok');
}

saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showApiStatus('API 키를 입력하세요', 'err');
    return;
  }
  localStorage.setItem('gemini_api_key', key);
  showApiStatus('저장됐습니다', 'ok');
  updateRoastBtn();
});

function showApiStatus(msg, type) {
  apiStatus.textContent = msg;
  apiStatus.className = type;
}

// --- 이미지 업로드 ---
uploadBtn.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('click', (e) => {
  if (e.target === dropZone || e.target.closest('#dropContent')) fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadImage(fileInput.files[0]);
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImage(file);
});

function loadImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    uploadedImageBase64 = dataUrl.split(',')[1];
    uploadedMimeType = file.type;

    preview.src = dataUrl;
    preview.hidden = false;
    dropContent.hidden = true;
    updateRoastBtn();
  };
  reader.readAsDataURL(file);
}

function updateRoastBtn() {
  const hasKey = !!localStorage.getItem('gemini_api_key') || !!apiKeyInput.value.trim();
  roastBtn.disabled = !(uploadedImageBase64 && hasKey);
}

// --- 팩폭 실행 ---
roastBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim() || localStorage.getItem('gemini_api_key');
  if (!apiKey || !uploadedImageBase64) return;

  roastBtn.disabled = true;
  roastBtn.classList.add('loading');
  roastBtn.textContent = '분석 중...';
  resultCard.hidden = false;
  resultText.textContent = '';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `당신은 2차전지 현장직 출신의 뼈 때리는 주식 전문가 '독설가 킴'입니다.
사용자가 올린 주식 포트폴리오 캡처 이미지를 보고 다음 조건에 맞춰 비평하세요.

[비평 가이드라인]
1. 이미지에서 종목명, 매수평단가, 수익률을 정확히 추출할 것.
2. 말투는 매우 냉소적이고 풍자적이어야 함 (예: "이건 투자가 아니라 기부네요").
3. 특히 2차전지 종목이 있다면 현장 전문가다운 디테일로 깔 것 (예: "분리막 공정 알면 이 가격에 못 사죠").
4. 마지막에는 '💊 액막이 한마디:' 로 한 줄 조언을 해줄 것.
5. 전체 길이는 300자 내외로 임팩트 있게.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: uploadedMimeType,
          data: uploadedImageBase64,
        },
      },
    ]);

    const text = result.response.text();
    await typeText(text);
  } catch (err) {
    resultText.textContent = `오류가 발생했습니다: ${err.message}`;
  } finally {
    roastBtn.disabled = false;
    roastBtn.classList.remove('loading');
    roastBtn.textContent = '다시 팩폭';
  }
});

// --- 타이핑 효과 ---
async function typeText(text) {
  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  resultText.appendChild(cursor);

  for (const char of text) {
    cursor.insertAdjacentText('beforebegin', char);
    await sleep(18);
  }

  cursor.remove();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
