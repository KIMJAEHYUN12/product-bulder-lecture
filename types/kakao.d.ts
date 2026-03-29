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

interface KakaoShareUploadImageParams {
  file: File[];
}

interface KakaoShareUploadImageResult {
  infos: {
    original: { url: string; length: number; content_type: string; width: number; height: number };
  };
}

interface KakaoSDK {
  init(appKey: string): void;
  isInitialized(): boolean;
  Share: {
    sendDefault(params: KakaoShareFeedParams): void;
    uploadImage(params: KakaoShareUploadImageParams): Promise<KakaoShareUploadImageResult>;
  };
}

interface Window {
  Kakao?: KakaoSDK;
}
