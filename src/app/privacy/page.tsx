import { LegalOl, LegalP, LegalSection } from '@/components/legal/LegalDocument';
import LegalPageShell from '@/components/legal/LegalPageShell';

const EFFECTIVE_DATE = '2026년 9월 9일';

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="개인정보처리방침"
      effectiveDate={EFFECTIVE_DATE}
      companySectionTitle="개인정보처리자"
    >
      <LegalSection title="1. 수집 항목">
        <LegalP>서비스 제공을 위해 아래 정보를 수집할 수 있습니다.</LegalP>
        <LegalOl>
          <li>필수: 이메일, 닉네임, 회원 유형(구직자/구인자), 로그인 식별값</li>
          <li>구인자 추가: 사업자등록번호, 이용자가 입력한 상호, 등록자 이름·핸드폰 번호, 대표자명·주소·전화·팩스·설립일·직원 수·전년 매출액·홈페이지·회사 소개(선택)</li>
          <li>지원 시: 이력서 파일, 지원 메시지</li>
        </LegalOl>
      </LegalSection>

      <LegalSection title="2. 이용 목적">
        <LegalP>
          회원 식별, 채용 정보 등록·지원 처리, 구인자 사업자등록 상태조회(계속사업자 여부), 합격/불합격 안내, 고객 문의
          응대, 서비스 개선 및 부정 이용 방지에 사용합니다. 개인사업자의 사업자등록번호는 개인정보에 해당할 수 있으며,
          채용 정보 등록에 필요한 범위에서만 처리합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="3. 제3자 제공">
        <LegalP>
          구인자가 상태조회를 요청하면, 입력한 사업자등록번호를 공공데이터포털을 통해 국세청 사업자등록 상태조회 서비스에
          전달합니다.
        </LegalP>
        <LegalOl>
          <li>제공받는 자: 국세청 (공공데이터포털 경유)</li>
          <li>목적: 사업자등록 상태조회(계속·휴업·폐업·미등록)</li>
          <li>항목: 사업자등록번호</li>
          <li>보유·이용 기간: 국세청 및 공공데이터포털의 운영 기준에 따릅니다.</li>
        </LegalOl>
        <LegalP>
          상호·대표자 성명·개업일자는 국세청에 보내지 않습니다. 조회 결과는 채용 정보 등록 처리 목적 범위에서 보관할 수
          있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="4. 보관 및 파기">
        <LegalP>
          회원 탈퇴 시 관련 개인정보는 지체 없이 파기합니다. 다만 관계 법령에 따라 일정 기간 보관이 필요한
          정보는 해당 기간 동안 보관합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="5. 문의">
        <LegalP>
          개인정보 관련 문의는 사이트 하단 &quot;문의하기&quot; 또는{' '}
          <a
            href="mailto:job365.admin@gmail.com"
            className="font-medium text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60"
          >
            job365.admin@gmail.com
          </a>
          으로 해 주세요.
        </LegalP>
      </LegalSection>
    </LegalPageShell>
  );
}
