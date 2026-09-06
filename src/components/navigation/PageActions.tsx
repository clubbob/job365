import HomeBackLink from '@/components/navigation/HomeBackLink';
import RefreshButton from '@/components/navigation/RefreshButton';

/** 페이지 공통 동작. 새 화면은 PageHeader를 쓰거나 이 버튼을 레이아웃에서 그대로 받습니다. */
export default function PageActions({
  showHome = true,
  showRefresh = true,
}: {
  showHome?: boolean;
  showRefresh?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {showRefresh ? <RefreshButton /> : null}
      {showHome ? <HomeBackLink /> : null}
    </div>
  );
}
