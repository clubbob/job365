'use client';

import { useSearchParams } from 'next/navigation';
import LegalCompanyInfo from '@/components/legal/LegalCompanyInfo';
import PageHeader from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { getSafeReturnPath } from '@/lib/auth-return';

type LegalPageShellProps = {
  title: string;
  effectiveDate: string;
  companySectionTitle?: string;
  /** 마이페이지 등 오버레이에서 문서만 닫을 때 */
  onClose?: () => void;
  children: React.ReactNode;
};

export default function LegalPageShell({
  title,
  effectiveDate,
  companySectionTitle = '회사 정보',
  onClose,
  children,
}: LegalPageShellProps) {
  const searchParams = useSearchParams();
  const backHref = getSafeReturnPath(searchParams.get('next'));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={title}
        description={`시행일: ${effectiveDate}`}
        showRefresh={false}
        homeHref={onClose ? undefined : backHref}
        homeLabel="돌아가기"
        onHomeClick={onClose}
      />

      <Card>
        <div className="space-y-8 [&_strong]:font-semibold [&_strong]:text-foreground">
          {children}
          <LegalCompanyInfo title={companySectionTitle} />
        </div>
      </Card>
    </div>
  );
}
