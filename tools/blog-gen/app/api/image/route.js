import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let imgPath = searchParams.get('path');
  let outputDir = searchParams.get('dir');

  if (!imgPath) {
    return NextResponse.json({ error: 'path 파라미터가 필요합니다' }, { status: 400 });
  }

  // 이중 인코딩 방어: %25 등이 남아있으면 한 번 더 디코딩
  try { imgPath = decodeURIComponent(imgPath); } catch {}
  try { if (outputDir) outputDir = decodeURIComponent(outputDir); } catch {}

  // outputDir이 있으면 그 기준, 없으면 output/ 기준
  let fullPath;
  if (outputDir) {
    fullPath = path.join(outputDir, imgPath);
  } else {
    fullPath = path.join(process.cwd(), 'output', imgPath);
  }

  // 경로 탐색 방지 (.. 포함 차단)
  const resolved = path.resolve(fullPath);
  if (resolved.includes('..') || !resolved.includes('output')) {
    console.log('[image 404] 경로 차단:', resolved);
    return NextResponse.json({ error: '잘못된 경로' }, { status: 400 });
  }

  try {
    if (!fs.existsSync(resolved)) {
      console.log('[image 404] 파일 없음:', resolved);
      return NextResponse.json({ error: '파일을 찾을 수 없습니다', path: resolved }, { status: 404 });
    }

    const buffer = fs.readFileSync(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
