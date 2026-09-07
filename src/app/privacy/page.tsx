import { LegalOl, LegalP, LegalSection } from '@/components/legal/LegalDocument';
import LegalPageShell from '@/components/legal/LegalPageShell';

const EFFECTIVE_DATE = '2026년 9월 6일';

export default function PrivacyPage() {
  return (
    <LegalPageShell title="개인정보처리방침" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection title="1. 수집 항목">
        <LegalP>서비스 제공을 위해 아래 정보를 수집할 수 있습니다.</LegalP>
        <LegalOl>
          <li>필수: 이메일, 닉네임, 회원 유형(구직자/기업), 인증 식별값</li>
          <li>기업 추가: 사업자등록번호, 상호, 담당자 연락처</li>
          <li>지원 시: 이력서 파일, 지원 메시지</li>
        </LegalOl>
      </LegalSection>

      <LegalSection title="2. 이용 목적">
        <LegalP>
          회원 식별, 채용 정보 등록·지원 처리, 합격/불합격 안내, 고객 문의 응대, 서비스 개선 및 부정 이용 방지에
          사용합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="3. 보관 및 파기">
        <LegalP>
          회원 탈퇴 시 관련 개인정보는 지체 없이 파기합니다. 다만 관계 법령에 따라 일정 기간 보관이 필요한
          정보는 해당 기간 동안 보관합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="4. 문의">
        <LegalP>개인정보 관련 문의는 사이트 하단 &quot;문의하기&quot;를 이용해 주세요.</LegalP>
      </LegalSection>
    </LegalPageShell>
  );
}
