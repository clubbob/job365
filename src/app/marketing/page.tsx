import type { Metadata } from 'next';
import LegalPageShell from '@/components/legal/LegalPageShell';
import MarketingConsentDocument, {
  MARKETING_CONSENT_EFFECTIVE_DATE,
} from '@/components/legal/MarketingConsentDocument';

export const metadata: Metadata = {
  title: '마케팅 수신 동의',
};

export default function MarketingPage() {
  return (
    <LegalPageShell title="마케팅 수신 동의" effectiveDate={MARKETING_CONSENT_EFFECTIVE_DATE}>
      <MarketingConsentDocument />
    </LegalPageShell>
  );
}
