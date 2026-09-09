import { LegalP, LegalSection } from '@/components/legal/LegalDocument';
import LegalPageShell from '@/components/legal/LegalPageShell';

const EFFECTIVE_DATE = '2026년 9월 6일';

export default function MarketingPage() {
  return (
    <LegalPageShell title="마케팅 수신 동의" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection title="동의 내용">
        <LegalP>
          새봄인터내셔널(JOB 365)은 신규 채용 정보, 지원 현황, 이벤트 및 서비스 안내를 이메일 또는 웹 푸시로 보낼 수
          있습니다.
          마케팅 수신 동의는 선택 사항이며, 동의하지 않아도 채용 정보 열람·지원 등 필수 서비스는 이용할 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="철회">
        <LegalP>
          동의는 마이페이지, 문의하기 또는{' '}
          <a
            href="mailto:job365.admin@gmail.com"
            className="font-medium text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60"
          >
            job365.admin@gmail.com
          </a>
          으로 언제든지 철회할 수 있습니다.
        </LegalP>
      </LegalSection>
    </LegalPageShell>
  );
}
