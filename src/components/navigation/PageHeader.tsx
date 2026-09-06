import PageActions from '@/components/navigation/PageActions';

/** 제목이 있는 페이지는 이 헤더를 쓰면 새로 고침·홈으로가 같이 붙습니다. */
export default function PageHeader({
  title,
  description,
  showRefresh = true,
}: {
  title: string;
  description?: string;
  showRefresh?: boolean;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      <PageActions showRefresh={showRefresh} />
    </header>
  );
}
