'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { marked } from 'marked';
import StockInput from '../components/StockInput';
import ModeSelector from '../components/ModeSelector';
import ProgressTracker from '../components/ProgressTracker';
import ImagePreview from '../components/ImagePreview';
import DartResults from '../components/DartResults';
import OutputActions from '../components/OutputActions';

const INITIAL_STEPS = [
  { id: 1, label: 'Firebase 데이터 추출', status: 'pending', detail: '' },
  { id: 2, label: '스크린샷 캡처', status: 'pending', detail: '' },
  { id: 3, label: 'DART 공시 체크', status: 'pending', detail: '' },
  { id: 4, label: '블로그 글 생성', status: 'pending', detail: '' },
];

export default function Home() {
  const [stockCode, setStockCode] = useState('');
  const [stockName, setStockName] = useState('');
  const [mode, setMode] = useState(null);
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [images, setImages] = useState([]);
  const [dartResults, setDartResults] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [outputDir, setOutputDir] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const handleRun = useCallback(async (selectedMode) => {
    if (!stockCode || isRunning) return;

    setMode(selectedMode);
    setIsRunning(true);
    setSteps(INITIAL_STEPS);
    setImages([]);
    setDartResults(null);
    setMarkdown('');
    setOutputDir('');
    setElapsed(0);

    // 경과 시간 타이머
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockCode, mode: selectedMode }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const event = JSON.parse(data);
            handleSSEEvent(event);
          } catch {
            // skip invalid JSON
          }
        }
      }
    } catch (err) {
      console.error('Pipeline error:', err);
    } finally {
      setIsRunning(false);
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [stockCode, isRunning]);

  const handleSSEEvent = useCallback((event) => {
    switch (event.type) {
      case 'step_start':
        setSteps(prev => prev.map(s =>
          s.id === event.step ? { ...s, status: 'running', detail: event.message || '' } : s
        ));
        break;
      case 'step_progress':
        setSteps(prev => prev.map(s =>
          s.id === event.step ? { ...s, detail: event.message || '' } : s
        ));
        break;
      case 'step_done':
        setSteps(prev => prev.map(s =>
          s.id === event.step ? { ...s, status: 'done', detail: event.message || '' } : s
        ));
        break;
      case 'step_error':
        setSteps(prev => prev.map(s =>
          s.id === event.step ? { ...s, status: 'error', detail: event.message || '' } : s
        ));
        break;
      case 'images':
        setImages(event.files || []);
        break;
      case 'dart':
        setDartResults(event.data);
        break;
      case 'markdown':
        setMarkdown(event.content || '');
        break;
      case 'output_dir':
        setOutputDir(event.path || '');
        break;
    }
  }, []);

  const handleReset = useCallback(() => {
    setSteps(INITIAL_STEPS);
    setImages([]);
    setDartResults(null);
    setMarkdown('');
    setIsRunning(false);
    setMode(null);
    setOutputDir('');
    setElapsed(0);
  }, []);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  const hasResults = steps.some(s => s.status === 'done' || s.status === 'error');

  const renderedHtml = useMemo(() => {
    if (!markdown) return '';
    // 이미지 마커를 <img> 태그로 변환 (캡처 실패한 이미지는 마커 제거)
    const withImages = markdown.replace(
      /━+\n📸 여기에 이미지 삽입:\s*(.+?)\n/g,
      (_, filename) => {
        const name = filename.trim();
        // 경로 정규화: images/ 중복 방지 + dart 공시 이미지 경로 보정
        let imgPath;
        if (name.startsWith('images/')) {
          imgPath = name;
        } else if (name.includes('_공시.png') || name.startsWith('dart/')) {
          imgPath = name.startsWith('dart/') ? `images/${name}` : `images/dart/${name}`;
        } else {
          imgPath = `images/${name}`;
        }
        // images 배열에 해당 파일이 없으면 마커 블록 전체 제거
        const basename = imgPath.replace(/^images\//, '');
        const exists = images.some(img => img === imgPath || img === basename || img.endsWith(basename));
        if (!exists) return '';
        const src = outputDir
          ? `/api/image?dir=${encodeURIComponent(outputDir)}&path=${encodeURIComponent(imgPath)}`
          : '';
        return `![${name}](${src})\n`;
      }
    ).replace(/━+\n?/g, ''); // 남은 보더 라인 제거
    return marked.parse(withImages);
  }, [markdown, outputDir, images]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          SimplyStock Blog Generator
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          종목 분석 블로그 글 자동 생성
        </p>
      </div>

      {/* 종목 입력 */}
      <section className="mb-6">
        <StockInput
          stockCode={stockCode}
          stockName={stockName}
          onCodeChange={setStockCode}
          onNameChange={setStockName}
          disabled={isRunning}
        />
      </section>

      {/* 실행 모드 */}
      <section className="mb-6">
        <ModeSelector
          mode={mode}
          onRun={handleRun}
          disabled={isRunning || !stockCode || stockCode.length < 6}
        />
      </section>

      {/* 진행 상황 */}
      {(isRunning || hasResults) && (
        <section className="mb-6">
          <ProgressTracker steps={steps} mode={mode} />
          {isRunning && (
            <p className="text-xs text-slate-500 mt-2 text-right">
              경과: {formatTime(elapsed)}
            </p>
          )}
        </section>
      )}

      {/* 캡처 미리보기 */}
      {images.length > 0 && (
        <section className="mb-6">
          <ImagePreview images={images} outputDir={outputDir} />
        </section>
      )}

      {/* DART 공시 결과 */}
      {dartResults && (
        <section className="mb-6">
          <DartResults data={dartResults} />
        </section>
      )}

      {/* 블로그 미리보기 (HTML 렌더링) */}
      {markdown && (
        <section className="mb-6">
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="text-sm font-medium text-slate-300 mb-3">
              블로그 미리보기
            </h2>
            <div
              className="bg-white rounded-lg border border-slate-700 p-6 max-h-[600px] overflow-y-auto
                         prose prose-sm max-w-none text-slate-900
                         prose-headings:text-slate-900 prose-strong:text-slate-900
                         prose-table:border-collapse prose-td:border prose-td:border-slate-300 prose-td:px-3 prose-td:py-1.5
                         prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:px-3 prose-th:py-1.5
                         prose-img:max-w-full prose-img:rounded-md"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        </section>
      )}

      {/* 결과물 액션 */}
      {hasResults && !isRunning && (
        <section className="mb-6">
          <OutputActions
            outputDir={outputDir}
            markdown={markdown}
            renderedHtml={renderedHtml}
            onRerun={handleReset}
          />
        </section>
      )}
    </main>
  );
}
