'use client';

type LegalCloseButtonProps = {
  className?: string;
  onClose?: () => void;
};

export default function LegalCloseButton({ className, onClose }: LegalCloseButtonProps) {
  function handleClose() {
    if (onClose) {
      onClose();
      return;
    }

    window.close();

    window.setTimeout(() => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.assign('/');
      }
    }, 150);
  }

  return (
    <button
      type="button"
      onClick={handleClose}
      className={
        className ??
        'inline-flex w-full shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:bg-neutral-50 hover:text-primary active:scale-[0.99] sm:w-auto'
      }
    >
      닫기
    </button>
  );
}
