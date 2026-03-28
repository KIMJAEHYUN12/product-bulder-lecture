'use client';

import { useState } from 'react';

export default function StockInput({ stockCode, stockName, onCodeChange, onNameChange, disabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!stockCode || stockCode.length !== 6 || disabled) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/stock-name?code=${stockCode}`);
      const data = await res.json();
      if (res.ok) {
        onNameChange(data.name);
      } else {
        setError(data.error || '종목을 찾을 수 없습니다');
        onNameChange('');
      }
    } catch {
      setError('조회 실패');
      onNameChange('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        종목코드
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={stockCode}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
            onCodeChange(val);
            onNameChange('');
            setError('');
            // 6자리 입력되면 자동 검색
            if (val.length === 6) {
              setTimeout(() => {
                fetch(`/api/stock-name?code=${val}`)
                  .then(r => r.json())
                  .then(d => { if (d.name) onNameChange(d.name); })
                  .catch(() => {});
              }, 0);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="008770"
          disabled={disabled}
          maxLength={6}
          className="flex-1 bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white
                     placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50"
        />
        <button
          onClick={handleSearch}
          disabled={disabled || !stockCode || stockCode.length < 6}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     text-sm font-medium"
        >
          {loading ? '...' : '검색'}
        </button>
      </div>
      {stockName && (
        <p className="mt-2 text-sm text-emerald-400">
          {stockName} ({stockCode})
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
