'use client';

const STATUS_ICONS = {
  pending: '⬜',
  running: '⏳',
  done: '✅',
  error: '❌',
};

export default function ProgressTracker({ steps, mode }) {
  // data 모드에서는 Step 4 (블로그 글 생성) 비활성
  const visibleSteps = mode === 'data'
    ? steps.filter(s => s.id <= 3)
    : steps;

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-slate-300 mb-3">진행 상황</h2>
      <div className="space-y-2">
        {visibleSteps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm
                        ${step.status === 'running' ? 'bg-blue-500/10 border border-blue-500/30' : ''}
                        ${step.status === 'error' ? 'bg-red-500/10 border border-red-500/30' : ''}
                        ${step.status === 'done' ? 'bg-emerald-500/10' : ''}`}
          >
            <span className="text-base shrink-0">{STATUS_ICONS[step.status]}</span>
            <span className={`font-medium ${step.status === 'done' ? 'text-emerald-400' : 'text-slate-300'}`}>
              Step {step.id}/{visibleSteps.length}:
            </span>
            <span className={step.status === 'done' ? 'text-emerald-300' : 'text-slate-400'}>
              {step.label}
              {step.status === 'done' && ' 완료'}
            </span>
            {step.detail && step.status === 'running' && (
              <span className="text-blue-400 text-xs ml-auto">{step.detail}</span>
            )}
            {step.detail && step.status === 'error' && (
              <span className="text-red-400 text-xs ml-auto">{step.detail}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
