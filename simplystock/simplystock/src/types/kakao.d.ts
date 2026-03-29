interface KakaoShareContent {
  title: string;
  description?: string;
  imageUrl?: string;
  link: { mobileWebUrl: string; webUrl: string };
}

interface KakaoShareButton {
  title: string;
  link: { mobileWebUrl: string; webUrl: string };
}

interface KakaoShareFeedParams {
  objectType: "feed";
  content: KakaoShareContent;
  buttons?: KakaoShareButton[];
}

interface KakaoSDK {
  init(appKey: string): void;
  isInitialized(): boolean;
  Share: {
    sendDefault(params: KakaoShareFeedParams): void;
    uploadImage(params: { file: File[] }): Promise<{ infos: { original: { url: string } } }>;
  };
}

interface Window {
  Kakao?: KakaoSDK;
}
