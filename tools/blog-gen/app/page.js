'use client';

import { useState, useCallback, useRef } from 'react';
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

      {/* 마크다운 프리뷰 */}
      {markdown && (
        <section className="mb-6">
          <div className="bg-card rounded-lg border border-border p-4">
            <h2 className="text-sm font-medium text-slate-300 mb-3">
              생성된 마크다운 (미리보기)
            </h2>
            <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 max-h-[400px] overflow-y-auto">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                {markdown.slice(0, 3000)}
                {markdown.length > 3000 && '\n\n... (전체 내용은 마크다운 복사 버튼으로 확인)'}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* 결과물 액션 */}
      {hasResults && !isRunning && (
        <section className="mb-6">
          <OutputActions
            outputDir={outputDir}
            markdown={markdown}
            onRerun={handleReset}
          />
        </section>
      )}
    </main>
  );
}
