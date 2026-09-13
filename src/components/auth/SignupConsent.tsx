'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

function ConsentRow({
  id,
  checked,
  onChange,
  required,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface px-3 py-3 shadow-sm ring-1 ring-border">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-border-strong text-primary focus:ring-primary/25"
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className="flex cursor-pointer select-none items-center gap-1.5 text-[13px] text-foreground sm:text-sm"
        >
          {required ? (
            <span className="inline-flex shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
              필수
            </span>
          ) : (
            <span className="inline-flex shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200/80">
              선택
            </span>
          )}
          <span className="leading-snug">{children}</span>
        </label>
      </div>
    </div>
  );
}

export type SignupConsentState = {
  agreedAll: boolean;
  agreedTerms: boolean;
  agreedPrivacy: boolean;
  agreedMarketing: boolean;
};

type SignupConsentProps = {
  value: SignupConsentState;
  onChange: (next: SignupConsentState) => void;
  className?: string;
};

export function createSignupConsentState(
  partial?: Partial<SignupConsentState>,
): SignupConsentState {
  return {
    agreedAll: partial?.agreedAll ?? false,
    agreedTerms: partial?.agreedTerms ?? false,
    agreedPrivacy: partial?.agreedPrivacy ?? false,
    agreedMarketing: partial?.agreedMarketing ?? false,
  };
}

export function isRequiredSignupConsentMet(consent: SignupConsentState): boolean {
  return consent.agreedTerms && consent.agreedPrivacy;
}

export default function SignupConsent({ value, onChange, className }: SignupConsentProps) {
  function handleAgreeAll(checked: boolean) {
    onChange({
      agreedAll: checked,
      agreedTerms: checked,
      agreedPrivacy: checked,
      agreedMarketing: checked,
    });
  }

  function patchConsent(patch: Partial<SignupConsentState>) {
    const next = { ...value, ...patch };
    next.agreedAll = next.agreedTerms && next.agreedPrivacy && next.agreedMarketing;
    onChange(next);
  }

  const linkClassName = 'font-semibold text-primary underline underline-offset-2 hover:text-primary-hover';

  return (
    <div
      role="group"
      aria-label="약관 동의"
      className={cn(
        'space-y-3 rounded-xl border-2 border-primary/35 bg-primary-light/20 px-4 py-4 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-3">
        <input
          id="signup-consent-all"
          type="checkbox"
          checked={value.agreedAll}
          onChange={(e) => handleAgreeAll(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/25"
        />
        <label htmlFor="signup-consent-all" className="cursor-pointer text-sm font-bold text-foreground">
          전체 동의
        </label>
      </div>

      <ConsentRow
        id="signup-consent-terms"
        checked={value.agreedTerms}
        onChange={(checked) => patchConsent({ agreedTerms: checked })}
        required
      >
        <>
          이용약관에 동의합니다.{' '}
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className={linkClassName}>
            이용약관
          </Link>
        </>
      </ConsentRow>

      <ConsentRow
        id="signup-consent-privacy"
        checked={value.agreedPrivacy}
        onChange={(checked) => patchConsent({ agreedPrivacy: checked })}
        required
      >
        <>
          개인정보처리방침에 동의합니다.{' '}
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={linkClassName}>
            개인정보처리방침
          </Link>
        </>
      </ConsentRow>

      <ConsentRow
        id="signup-consent-marketing"
        checked={value.agreedMarketing}
        onChange={(checked) => patchConsent({ agreedMarketing: checked })}
      >
        <>
          마케팅 활용 및 광고성 정보 수신에 동의합니다.{' '}
          <Link href="/marketing" target="_blank" rel="noopener noreferrer" className={linkClassName}>
            마케팅 수신 동의
          </Link>
        </>
      </ConsentRow>
    </div>
  );
}
