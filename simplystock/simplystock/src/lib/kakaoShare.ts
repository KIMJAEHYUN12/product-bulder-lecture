import { isNative } from "@/lib/platform";

const KAKAO_APP_KEY = "879eb3c1fc8e7d5bc8bd539d81a5c02b";
const SITE_URL = "https://simplystock.co.kr";

async function nativeShare(title: string, text: string, url?: string) {
  const { Share } = await import("@capacitor/share");
  await Share.share({ title, text, url: url ?? SITE_URL, dialogTitle: title });
}

function initKakao(): boolean {
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

/** 종목 차트 공유 (차트 이미지 첨부 가능) */
export async function shareStock(stockName: string, symbol: string, chartImageDataUrl?: string): Promise<void> {
  if (isNative()) {
    await nativeShare(
      `${stockName} 차트 분석`,
      `회귀 채널과 수급 흐름으로 ${stockName}(${symbol})을 분석해보세요.`,
    );
    return;
  }
  if (!initKakao() || !window.Kakao) {
    alert("카카오 SDK를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  let imageUrl = `${SITE_URL}/og-image.png`;

  if (chartImageDataUrl) {
    try {
      const file = dataUrlToFile(chartImageDataUrl, "simplystock-chart.png");
      const result = await window.Kakao.Share.uploadImage({ file: [file] });
      imageUrl = result.infos.original.url;
    } catch {
      // 업로드 실패 시 OG 이미지 fallback
    }
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: `${stockName} 차트 분석`,
      description: `회귀 채널과 수급 흐름으로 ${stockName}(${symbol})을 분석해보세요.`,
      imageUrl,
      link: { mobileWebUrl: SITE_URL, webUrl: SITE_URL },
    },
    buttons: [
      {
        title: "차트 보러 가기",
        link: { mobileWebUrl: SITE_URL, webUrl: SITE_URL },
      },
    ],
  });
}

/** 범용 카카오 피드 공유 */
export async function kakaoShareFeed(options: {
  title: string;
  description: string;
  imageDataUrl?: string;
  shareUrl?: string;
  buttonTitle?: string;
}): Promise<void> {
  if (isNative()) {
    await nativeShare(options.title, options.description, options.shareUrl);
    return;
  }
  if (!initKakao() || !window.Kakao) {
    alert("카카오 SDK를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  const url = options.shareUrl ?? SITE_URL;
  let imageUrl = `${SITE_URL}/og-image.png`;

  if (options.imageDataUrl) {
    try {
      const file = dataUrlToFile(options.imageDataUrl, "simplystock-share.png");
      const result = await window.Kakao.Share.uploadImage({ file: [file] });
      imageUrl = result.infos.original.url;
    } catch {
      // 업로드 실패 시 OG 이미지 fallback
    }
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: options.title,
      description: options.description,
      imageUrl,
      link: { mobileWebUrl: url, webUrl: url },
    },
    buttons: [
      {
        title: options.buttonTitle ?? "자세히 보기",
        link: { mobileWebUrl: url, webUrl: url },
      },
    ],
  });
}

/** 사이트 홍보 공유 */
export async function shareSite(): Promise<void> {
  if (isNative()) {
    await nativeShare(
      "SimplyStock — 주식 차트 분석 도구",
      "회귀 채널, 수급 흐름, 수급 스캔까지. 무료 데이터 기반 주식 분석 도구.",
    );
    return;
  }
  if (!initKakao() || !window.Kakao) {
    alert("카카오 SDK를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    return;
  }

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: "SimplyStock — 주식 차트 분석 도구",
      description:
        "회귀 채널, 수급 흐름, 수급 스캔까지. 무료 데이터 기반 주식 분석 도구.",
      imageUrl: `${SITE_URL}/og-image.png`,
      link: { mobileWebUrl: SITE_URL, webUrl: SITE_URL },
    },
    buttons: [
      {
        title: "무료로 시작하기",
        link: { mobileWebUrl: SITE_URL, webUrl: SITE_URL },
      },
    ],
  });
}
