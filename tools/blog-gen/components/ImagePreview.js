'use client';

import { useState } from 'react';

const TAB_LABELS = {
  '01_월봉': '월봉',
  '02_주봉': '주봉',
  '03_일봉': '일봉',
  '04_수급': '수급',
  '05_매매': '매매동향',
  '06_forward': 'F-PER',
  '07_trailing': 'T-PER',
  '08_pbr': 'PBR',
  'dart_01_매출실적': 'DART 매출',
  'dart_02_연결재무상태표': 'DART 재무',
  'dart_03_포괄손익계산서': 'DART 손익',
  'dart_semi_재무상태표': 'DART 반기재무',
  'dart_semi_손익계산서': 'DART 반기손익',
  'dart_quarterly_재무상태표': 'DART 분기재무',
  'dart_quarterly_손익계산서': 'DART 분기손익',
  'dart_audit': 'DART 감사',
  'dart_critical': 'DART 중요',
  'dart_stake': 'DART 지분',
  'dart_corporate': 'DART 기업',
};

function getTabLabel(filename) {
  for (const [prefix, label] of Object.entries(TAB_LABELS)) {
    if (filename.includes(prefix)) return label;
  }
  // DART 캡처
  if (filename.includes('dart/')) {
    const name = filename.split('/').pop().replace(/^\d+_/, '').replace('_공시.png', '');
    return name;
  }
  return filename;
}

export default function ImagePreview({ images, outputDir }) {
  const [selected, setSelected] = useState(0);

  if (!images.length) return null;

  // outputDir이 있으면 dir 파라미터 추가
  const imgSrc = outputDir
    ? `/api/image?dir=${encodeURIComponent(outputDir)}&path=${encodeURIComponent(images[selected])}`
    : `/api/image?path=${encodeURIComponent(images[selected])}`;

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-slate-300 mb-3">
        캡처 미리보기 ({images.length}장)
      </h2>

      {/* 탭 버튼 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        {images.map((img, i) => (
          <button
            key={img}
            onClick={() => setSelected(i)}
            className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                        ${i === selected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            {getTabLabel(img)}
          </button>
        ))}
      </div>

      {/* 이미지 표시 */}
      <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden min-h-[200px] flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={images[selected]}
          src={imgSrc}
          alt={getTabLabel(images[selected])}
          className="w-full h-auto"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = '<p class="text-slate-500 text-sm p-4">이미지를 불러올 수 없습니다 (로컬 실행 시 확인 가능)</p>';
          }}
        />
      </div>

      {/* 파일명 표시 */}
      <p className="mt-2 text-xs text-slate-500">{images[selected]}</p>
    </div>
  );
}
