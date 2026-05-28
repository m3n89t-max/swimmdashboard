'use client';

interface Props {
  text: string;
}

export default function EmergencyPopup({ text }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 반투명 오버레이 — 블러 없이 부드럽게 */}
      <div className="absolute inset-0 bg-black/55" />

      {/* 안내 카드 */}
      <div className="relative mx-10 max-w-3xl w-full rounded-2xl border border-amber-400/70
                      bg-gray-950 shadow-xl"
        style={{ animation: 'noticeSlideIn 0.3s ease-out both' }}
      >
        {/* 상단 헤더 */}
        <div className="flex items-center justify-center gap-3 px-10 py-5
                        border-b border-amber-400/30 bg-amber-400/5 rounded-t-2xl">
          <span className="text-amber-400 text-3xl font-black tracking-widest">
            긴급 공지
          </span>
        </div>

        {/* 본문 */}
        <div className="px-12 py-10">
          <p className="text-4xl font-black text-white leading-relaxed text-center
                        break-keep whitespace-pre-wrap">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
