import { cn } from '@/lib/utils';
import { buttonBaseClassName, pagePrimaryButtonClassName } from '@/lib/button-ui';

export const AUTH_CARD =
  'mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-card';

export const authInputClassName =
  'w-full rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 sm:text-base';

/** 로그인·회원가입 등 PageHeader + Card 인증 폼 입력 */
export const authFormInputClassName =
  'h-10 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/25';

export const authPrimaryButtonClassName = cn(buttonBaseClassName, pagePrimaryButtonClassName);

export const authLinkClassName = 'text-sm font-semibold text-primary hover:underline';
