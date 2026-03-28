'use client';

const MODES = [
  {
    id: 'data',
    label: '데이터+캡처만',
    icon: '📦',
    desc: 'Claude 채팅용',
    color: 'bg-slate-600 hover:bg-slate-500',
  },
  {
    id: 'sonnet',
    label: 'Sonnet',
    icon: '🤖',
    desc: '자동 글 생성',
    color: 'bg-violet-600 hover:bg-violet-500',
  },
  {
    id: 'opus',
    label: 'Opus',
    icon: '🧠',
    desc: '최고 품질',
    color: 'bg-amber-600 hover:bg-amber-500',
  },
];

export default function ModeSelector({ mode, onRun, disabled }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-slate-300 mb-3">실행 모드</h2>
      <div className="grid grid-cols-3 gap-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onRun(m.id)}
            disabled={disabled}
            className={`${m.color} rounded-lg px-3 py-3 text-white transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed text-center
                       ${mode === m.id ? 'ring-2 ring-white ring-offset-2 ring-offset-bg' : ''}`}
          >
            <div className="text-xl mb-1">{m.icon}</div>
            <div className="text-sm font-medium">{m.label}</div>
            <div className="text-xs opacity-70 mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
