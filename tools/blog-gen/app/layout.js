import './globals.css';

export const metadata = {
  title: 'SimplyStock Blog Generator',
  description: '종목 분석 블로그 글 자동 생성 도구',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
