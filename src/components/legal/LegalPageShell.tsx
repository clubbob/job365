import LegalCloseButton from '@/components/legal/LegalCloseButton';
import LegalCompanyInfo from '@/components/legal/LegalCompanyInfo';

type LegalPageShellProps = {
  title: string;
  effectiveDate: string;
  companySectionTitle?: string;
  children: React.ReactNode;
};

export default function LegalPageShell({
  title,
  effectiveDate,
  companySectionTitle = '회사 정보',
  children,
}: LegalPageShellProps) {
  return (
    <div className="flex flex-col gap-5">
      <header className="rounded-xl border border-border bg-surface px-4 py-5 shadow-card sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
            <p className="text-sm text-muted">시행일: {effectiveDate}</p>
          </div>
          <LegalCloseButton />
        </div>
      </header>

      <article className="rounded-xl border border-border bg-surface p-4 shadow-card sm:p-8">
        <div className="space-y-8 [&_strong]:font-semibold [&_strong]:text-foreground">
          {children}
          <LegalCompanyInfo title={companySectionTitle} />
        </div>
      </article>

      <div className="flex justify-center pb-2">
        <LegalCloseButton className="inline-flex w-full max-w-xs items-center justify-center rounded-lg border border-border-strong bg-surface px-6 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:bg-neutral-50 hover:text-primary active:scale-[0.99] sm:w-auto" />
      </div>
    </div>
  );
}
