'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isNetworkError = error.message.toLowerCase().includes('network');

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h2 className="text-lg font-semibold text-foreground">페이지를 불러오지 못했습니다</h2>
      <p className="mt-2 text-sm text-muted">
        {isNetworkError
          ? '개발 서버 연결이 끊어졌습니다. `pnpm dev`가 실행 중인지 확인한 뒤 다시 시도해 주세요.'
          : '일시적인 오류가 발생했습니다. 다시 시도해 주세요.'}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm"
      >
        다시 시도
      </button>
    </div>
  );
}
