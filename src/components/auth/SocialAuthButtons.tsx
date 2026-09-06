'use client';

import type { ReactNode } from 'react';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import { cn } from '@/lib/utils';

function KakaoIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 4c-5.05 0-9.15 3.2-9.15 7.15 0 2.56 1.7 4.8 4.25 6.1l-.86 3.16c-.08.28.2.52.45.38l3.76-2.5c.51.07 1.03.11 1.55.11 5.05 0 9.15-3.2 9.15-7.15S17.05 4 12 4z"
      />
    </svg>
  );
}

function NaverIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M14.8 12.65 9.35 4.8H6v14.4h3.2v-7.85l5.45 7.85H18V4.8h-3.2v7.85z"
      />
    </svg>
  );
}

function UpcomingButton({
  label,
  className,
  icon,
}: {
  label: string;
  className: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled
      className={cn(
        'inline-flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold opacity-70',
        className,
      )}
    >
      {icon}
      {label} (준비 중)
    </button>
  );
}

export default function SocialAuthButtons({
  googleLabel,
  kakaoLabel,
  naverLabel,
  pending = false,
  disabled = false,
  onGoogleClick,
}: {
  googleLabel: string;
  kakaoLabel: string;
  naverLabel: string;
  pending?: boolean;
  disabled?: boolean;
  onGoogleClick: () => void;
}) {
  return (
    <div className="space-y-3">
      <GoogleAuthButton
        label={googleLabel}
        pending={pending}
        disabled={disabled}
        onClick={onGoogleClick}
      />
      <UpcomingButton
        label={kakaoLabel}
        className="bg-[#FEE500] text-[#191919]"
        icon={<KakaoIcon />}
      />
      <UpcomingButton
        label={naverLabel}
        className="bg-[#03C75A] text-white"
        icon={<NaverIcon />}
      />
      <p className="text-center text-xs leading-relaxed text-subtle">
        구글, 카카오톡, 네이버 중 하나로 로그인합니다. 카카오톡·네이버는 곧 연결됩니다.
      </p>
    </div>
  );
}
