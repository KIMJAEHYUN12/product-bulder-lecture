const KAKAO_APP_KEY = "879eb3c1fc8e7d5bc8bd539d81a5c02b";
const SITE_URL = "https://bitgak.co.kr";

function initKakao() {
  const Kakao = window.Kakao;
  if (!Kakao) return false;
  if (!Kakao.isInitialized()) {
    Kakao.init(KAKAO_APP_KEY);
  }
  return true;
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

interface KakaoShareFeedOptions {
  title: string;
  description: string;
  imageDataUrl?: string;
  shareUrl?: string;
}

export async function kakaoShareFeed({
  title,
  description,
  imageDataUrl,
  shareUrl = SITE_URL,
}: KakaoShareFeedOptions): Promise<void> {
  if (!initKakao() || !window.Kakao) {
    alert("카카오 SDK를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  let imageUrl = `${SITE_URL}/og-image.png`;

  if (imageDataUrl) {
    try {
      const file = dataUrlToFile(imageDataUrl, "ovision-share.png");
      const result = await window.Kakao.Share.uploadImage({ file: [file] });
      imageUrl = result.infos.original.url;
    } catch {
      // 업로드 실패 시 OG 이미지 fallback
    }
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl,
      link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
    },
    buttons: [
      {
        title: "나도 분석 받기",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
    ],
  });
}
