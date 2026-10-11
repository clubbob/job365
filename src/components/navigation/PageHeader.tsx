import PageActions from '@/components/navigation/PageActions';

/** 제목이 있는 페이지는 이 헤더를 쓰면 새로 고침·홈으로가 같이 붙습니다. */
export default function PageHeader({
  title,
  description,
  showRefresh = true,
  homeHref,
  homeLabel,
  homeOpenInNewWindow,
  onHomeClick,
}: {
  title: string;
  description?: string;
  showRefresh?: boolean;
  homeHref?: string;
  homeLabel?: string;
  homeOpenInNewWindow?: boolean;
  /** 링크 대신 버튼(오버레이 닫기 등) */
  onHomeClick?: () => void;
}) {
  return (
    <header className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      <PageActions
        showRefresh={showRefresh}
        homeHref={homeHref}
        homeLabel={homeLabel}
        homeOpenInNewWindow={homeOpenInNewWindow}
        onHomeClick={onHomeClick}
      />
    </header>
  );
}
