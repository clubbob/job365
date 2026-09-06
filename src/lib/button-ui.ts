export const buttonBaseClassName =
  'inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45';

export const buttonSizeDefaultClassName = 'rounded-lg px-4 py-3 text-sm';

export const buttonSizeLargeClassName =
  'rounded-xl px-6 py-4 text-base font-bold sm:text-lg sm:py-[1.125rem]';

export const buttonPrimaryClassName =
  'bg-primary text-white shadow-sm hover:bg-primary-hover active:scale-[0.99]';

export const buttonSecondaryClassName =
  'border border-border-strong bg-surface text-foreground hover:bg-neutral-50';

export const buttonGhostClassName = 'text-muted hover:bg-neutral-100 hover:text-foreground';

export const pagePrimaryButtonClassName = `w-full ${buttonSizeDefaultClassName} ${buttonPrimaryClassName}`;
