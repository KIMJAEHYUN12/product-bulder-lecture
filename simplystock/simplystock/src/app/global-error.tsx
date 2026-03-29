"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <h1>오류가 발생했습니다</h1>
          <button onClick={() => reset()} style={{ marginTop: 16, padding: "8px 16px", cursor: "pointer" }}>
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
