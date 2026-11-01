'use client';

import { useRouter } from 'next/navigation';
import { type MouseEvent, type ReactNode } from 'react';

type AdminInstantLinkProps = {
  href: string;
  className?: string;
  title?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/** 관리자 메뉴: 데이터 로딩과 무관하게 즉시 화면 전환합니다. */
export default function AdminInstantLink({
  href,
  className,
  title,
  children,
  onClick,
}: AdminInstantLinkProps) {
  const router = useRouter();

  function handlePrefetch() {
    router.prefetch(href);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    router.push(href);
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      className={className}
      title={title}
    >
      {children}
    </a>
  );
}
