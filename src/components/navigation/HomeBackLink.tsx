'use client';

import Link from 'next/link';
import { openUserFacingSiteInNewTab } from '@/lib/open-user-site-tab';

export {
  openInDesktopBrowserWindow,
  openInNewBrowserTab,
  openUserFacingSiteInNewTab,
} from '@/lib/open-user-site-tab';

const linkClassName =
  'inline-flex shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:bg-neutral-50 hover:text-primary active:scale-[0.99] print:hidden';

export default function HomeBackLink({
  href = '/',
  label = '홈으로',
  openInNewWindow = false,
  onClick,
}: {
  href?: string;
  label?: string;
  openInNewWindow?: boolean;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={linkClassName}>
        ← {label}
      </button>
    );
  }

  if (openInNewWindow) {
    return (
      <button
        type="button"
        className={linkClassName}
        onClick={() => openUserFacingSiteInNewTab(href)}
      >
        ← {label}
      </button>
    );
  }

  return (
    <Link href={href} className={linkClassName}>
      ← {label}
    </Link>
  );
}
