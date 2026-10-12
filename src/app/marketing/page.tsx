import type { Metadata } from 'next';
import { Suspense } from 'react';
import LegalPageShell from '@/components/legal/LegalPageShell';
import MarketingConsentDocument, {
  MARKETING_CONSENT_EFFECTIVE_DATE,
} from '@/components/legal/MarketingConsentDocument';

export const metadata: Metadata = {
  title: '마케팅수신동의',
};

export default function MarketingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
      <LegalPageShell title="마케팅수신동의" effectiveDate={MARKETING_CONSENT_EFFECTIVE_DATE}>
        <MarketingConsentDocument />
      </LegalPageShell>
    </Suspense>
  );
}
