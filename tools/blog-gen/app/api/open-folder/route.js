import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';

export async function POST(request) {
  const { path: folderPath } = await request.json();

  if (!folderPath) {
    return NextResponse.json({ error: '경로가 필요합니다' }, { status: 400 });
  }

  if (!fs.existsSync(folderPath)) {
    return NextResponse.json({ error: '폴더를 찾을 수 없습니다' }, { status: 404 });
  }

  // OS별 폴더 열기 명령어
  const platform = process.platform;
  let cmd;
  if (platform === 'win32') {
    cmd = `explorer "${folderPath.replace(/\//g, '\\')}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${folderPath}"`;
  } else {
    cmd = `xdg-open "${folderPath}"`;
  }

  return new Promise((resolve) => {
    exec(cmd, (err) => {
      if (err) {
        resolve(NextResponse.json({ error: err.message }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true }));
      }
    });
  });
}
