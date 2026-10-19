import type { ReactNode } from 'react';
import HomeBackLink from '@/components/navigation/HomeBackLink';
import RefreshButton from '@/components/navigation/RefreshButton';

/** 페이지 공통 동작. 새 화면은 PageHeader를 쓰거나 이 버튼을 레이아웃에서 그대로 받습니다. */
export default function PageActions({
  showHome = true,
  showRefresh = true,
  homeHref,
  homeLabel,
  homeOpenInNewWindow,
  onHomeClick,
  trailing,
}: {
  showHome?: boolean;
  showRefresh?: boolean;
  homeHref?: string;
  homeLabel?: string;
  homeOpenInNewWindow?: boolean;
  onHomeClick?: () => void;
  /** 홈·새로 고침 오른쪽에 붙는 버튼 등 */
  trailing?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      {showRefresh ? <RefreshButton /> : null}
      {showHome ? (
        <HomeBackLink
          href={homeHref}
          label={homeLabel}
          openInNewWindow={homeOpenInNewWindow}
          onClick={onHomeClick}
        />
      ) : null}
      {trailing}
    </div>
  );
}
