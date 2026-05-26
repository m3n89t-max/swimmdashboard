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
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
        <h2 className="text-lg font-bold text-yellow-300 mb-4">📋 엑셀 형식 안내</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-300">
            <thead>
              <tr className="border-b border-gray-700">
                {['event_no', 'event_name', 'heat_no', 'category', 'lane', 'name', 'team', 'region(선택)'].map((col) => (
                  <th key={col} className="text-left py-2 px-3 text-cyan-400 font-mono font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-gray-400">
                <td className="py-2 px-3">1</td>
                <td className="py-2 px-3">남자 자유형 50m</td>
                <td className="py-2 px-3">1</td>
                <td className="py-2 px-3">일반부</td>
                <td className="py-2 px-3">3</td>
                <td className="py-2 px-3">홍길동</td>
                <td className="py-2 px-3">서울</td>
                <td className="py-2 px-3">S14</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          • lane: 1~8 정수 · record: mm:ss.hh 형식 · 같은 조 내 레인 번호 중복 불가
        </p>
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
