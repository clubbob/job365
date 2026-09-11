'use client';

import Link from 'next/link';

const linkClassName =
  'inline-flex shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:bg-neutral-50 hover:text-primary active:scale-[0.99] print:hidden';

function openInDesktopBrowserWindow(href: string) {
  const url = new URL(href, window.location.origin).toString();
  const width = Math.min(window.screen.availWidth, Math.max(1280, Math.round(window.screen.availWidth * 0.92)));
  const height = Math.min(window.screen.availHeight, Math.max(800, Math.round(window.screen.availHeight * 0.92)));
  const left = Math.max(0, Math.round((window.screen.availWidth - width) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - height) / 2));
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'menubar=yes',
    'toolbar=yes',
    'location=yes',
    'status=yes',
    'scrollbars=yes',
    'resizable=yes',
  ].join(',');

  const win = window.open(url, 'joblink365-site', features);
  if (win) win.opener = null;
}

export default function HomeBackLink({
  href = '/',
  label = '홈으로',
  openInNewWindow = false,
}: {
  href?: string;
  label?: string;
  openInNewWindow?: boolean;
}) {
  if (openInNewWindow) {
    return (
      <a
        href={href}
        className={linkClassName}
        onClick={(event) => {
          event.preventDefault();
          openInDesktopBrowserWindow(href);
        }}
      >
        ← {label}
      </a>
    );
  }

  return (
    <Link href={href} className={linkClassName}>
      ← {label}
    </Link>
  );
}
