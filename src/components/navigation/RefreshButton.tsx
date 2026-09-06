'use client';

export default function RefreshButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:bg-neutral-50 hover:text-primary active:scale-[0.99] print:hidden"
    >
      새로 고침
    </button>
  );
}
