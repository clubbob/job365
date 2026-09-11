import { cn } from '@/lib/utils';

type LogoProps = {
  showWordmark?: boolean;
  className?: string;
  iconClassName?: string;
};

export default function Logo({ showWordmark = true, className, iconClassName }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg',
          iconClassName,
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <rect width="32" height="32" rx="8" fill="url(#job365-gradient)" />
          <path
            d="M18 8.4v10.6c0 3.5-2.6 5.4-5.6 5.4"
            stroke="white"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="job365-gradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60a5fa" />
              <stop offset="1" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
      </span>

      {showWordmark && (
        <span className="flex items-baseline gap-1.5 font-bold tracking-tight text-foreground">
          <span className="text-[15px] sm:text-base">JobLink</span>
          <span className="text-[15px] text-primary sm:text-base">365</span>
        </span>
      )}
    </span>
  );
}
