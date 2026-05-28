'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setMessage('');

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/events', { method: 'POST', body: form });
      const json = await res.json();

      if (json.ok) {
        setStatus('success');
        setMessage(`✅ ${json.data.count}개 조가 등록되었습니다.`);
        setTimeout(() => router.push('/admin'), 2000);
      } else {
        setStatus('error');
        setMessage(json.error);
      }
    } catch {
      setStatus('error');
      setMessage('네트워크 오류가 발생했습니다.');
    }
  };

  const handleReset = async () => {
    if (!confirm('모든 대진표 데이터를 삭제하시겠습니까?')) return;
    await fetch('/api/events', { method: 'DELETE' });
    setStatus('idle');
    setFile(null);
    setMessage('데이터가 초기화되었습니다.');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-black text-white">📂 대진표 업로드</h1>

      {/* 엑셀 형식 안내 */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-bold text-yellow-300">📋 엑셀 형식 안내</h2>

        {/* 섹션 헤더 예시 */}
        <div>
          <p className="text-xs text-gray-500 mb-1">① 종목 헤더 행 (종목번호 + 종목명)</p>
          <div className="bg-gray-800 rounded-lg px-4 py-2 font-mono text-cyan-300 text-sm">
            101&nbsp;&nbsp;&nbsp;계영 100M S14/비장애 중등,고등 통합
          </div>
        </div>

        {/* 컬럼 헤더 + 데이터 예시 */}
        <div>
          <p className="text-xs text-gray-500 mb-1">② 컬럼 헤더 행 + 데이터 행</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300 border-collapse">
              <thead>
                <tr className="border-b border-gray-600">
                  {['레인', '성명', '소속', '등급', '기록', '순위', '비고'].map((col) => (
                    <th key={col} className="text-center py-2 px-3 text-yellow-300 font-bold">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="text-gray-500 border-b border-gray-800">
                  <td className="text-center py-1 px-3">1</td>
                  <td className="py-1 px-3 text-gray-600">(빈 레인)</td>
                  <td className="py-1 px-3"></td>
                  <td className="py-1 px-3"></td>
                  <td className="py-1 px-3"></td>
                  <td className="py-1 px-3"></td>
                  <td className="py-1 px-3"></td>
                </tr>
                <tr className="text-gray-300">
                  <td className="text-center py-1 px-3">2</td>
                  <td className="py-1 px-3">배민준, 배연지</td>
                  <td className="py-1 px-3">니모</td>
                  <td className="py-1 px-3 text-purple-300">S14, 비장애</td>
                  <td className="py-1 px-3 text-gray-500">—</td>
                  <td className="py-1 px-3"></td>
                  <td className="py-1 px-3">중등</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• 종목 헤더 행: 첫 셀에 종목번호(101, 102…), 나머지 셀에 종목명</p>
          <p>• 컬럼 헤더: <span className="text-yellow-400">레인 · 성명 · 소속 · 등급 · 기록 · 순위 · 비고</span> (한글 그대로)</p>
          <p>• 빈 레인: 성명·소속이 모두 비어 있으면 자동 제외</p>
          <p>• 계영(릴레이): 성명에 &quot;이름1, 이름2&quot; 쉼표 구분</p>
          <p>• 기록: mm:ss.hh 형식 또는 &apos;-&apos; (대회 전 업로드는 비워도 됨)</p>
        </div>
      </div>

      {/* 파일 업로드 영역 */}
      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
          file ? 'border-cyan-500 bg-cyan-950/20' : 'border-gray-700 hover:border-gray-500'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) setFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) setFile(e.target.files[0]);
          }}
        />
        {file ? (
          <div>
            <p className="text-2xl font-bold text-cyan-400 mb-2">📄 {file.name}</p>
            <p className="text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-3xl mb-2">📂</p>
            <p className="text-xl text-gray-400">엑셀 파일을 드래그하거나 클릭해서 선택</p>
            <p className="text-sm text-gray-600 mt-2">.xlsx · .xls · .csv 지원</p>
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="flex gap-4">
        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl font-bold text-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {status === 'uploading' ? '업로드 중…' : '업로드 & 등록'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-4 bg-red-950 hover:bg-red-900 border border-red-800 text-red-400 rounded-xl font-bold transition-colors cursor-pointer"
        >
          전체 초기화
        </button>
      </div>

      {/* 결과 메시지 */}
      {message && (
        <div
          className={`rounded-xl p-4 text-center font-semibold ${
            status === 'success'
              ? 'bg-green-950 border border-green-700 text-green-300'
              : status === 'error'
              ? 'bg-red-950 border border-red-700 text-red-300'
              : 'bg-gray-800 text-gray-300'
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
