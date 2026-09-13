import type { Metadata } from 'next';
import { LegalOl, LegalP, LegalSection, LegalUl } from '@/components/legal/LegalDocument';
import LegalPageShell from '@/components/legal/LegalPageShell';
import { COMPANY } from '@/lib/company';

export const metadata: Metadata = {
  title: '마케팅 수신 동의',
};

const EFFECTIVE_DATE = '2026년 9월 13일';

const mailtoClassName =
  'font-medium text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60';

function MailLink() {
  return (
    <a href={`mailto:${COMPANY.email}`} className={mailtoClassName}>
      {COMPANY.email}
    </a>
  );
}

export default function MarketingPage() {
  return (
    <LegalPageShell title="마케팅 수신 동의" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection title="1. 동의의 성격">
        <LegalP>
          이 동의는 {COMPANY.name}(이하 &quot;회사&quot;)이 운영하는 {COMPANY.serviceName}에서 「정보통신망 이용촉진 및
          정보보호 등에 관한 법률」 제50조에 따라 영리 목적의 광고성 정보를 보내기 위한 선택 동의입니다. 동의하지 않아도
          회원가입, 채용 정보 열람·입사 지원, 이력서·채용 정보 등록 등 필수 서비스는 이용할 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="2. 수신 목적">
        <LegalP>회사는 동의한 회원에게 다음 목적의 정보를 보낼 수 있습니다.</LegalP>
        <LegalOl>
          <li>신규 채용 정보, 인재 정보, 추천 매칭 안내</li>
          <li>이벤트, 프로모션, 설문, 혜택 안내</li>
          <li>서비스 신규 기능·이용 방법 소개</li>
        </LegalOl>
      </LegalSection>

      <LegalSection title="3. 수집·이용 항목">
        <LegalP>광고성 정보 발송에 이용하는 항목은 다음과 같습니다.</LegalP>
        <LegalUl>
          <li>이메일 주소, 닉네임</li>
          <li>선택한 이용 주체(구직자·구인자)</li>
          <li>동의 여부, 동의·철회 일시</li>
        </LegalUl>
      </LegalSection>

      <LegalSection title="4. 수신 수단">
        <LegalP>
          현재 주된 수단은 이메일입니다. 앞으로 서비스 안 알림이 추가되면 같은 동의 범위에서 안내할 수 있습니다. 문자
          메시지(SMS)·전화는 보내지 않습니다. 해당 수단을 쓰게 되면 이 동의를 갱신하고 다시 받습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="5. 보유 기간">
        <LegalP>
          동의일부터 동의 철회 또는 회원 탈퇴 시까지 보관·이용합니다. 철회하거나 탈퇴하면 광고성 정보 발송을 중단하고,
          관련 법령에 따라 보관이 필요한 기록을 제외하고 파기합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="6. 동의 철회">
        <LegalP>동의는 언제든지 철회할 수 있습니다. 철회 방법은 다음과 같습니다.</LegalP>
        <LegalOl>
          <li>마이페이지의 내 계정에서 마케팅 수신 동의를 해제하고 저장</li>
          <li>수신한 이메일에 수신 거부 안내가 있으면 그 안내를 따름</li>
          <li>
            사이트 하단 &quot;문의하기&quot; 또는 <MailLink />으로 철회 요청
          </li>
        </LegalOl>
        <LegalP>철회 후에도 처리에 시간이 걸릴 수 있으며, 이미 발송이 시작된 안내는 도달할 수 있습니다.</LegalP>
      </LegalSection>

      <LegalSection title="7. 거래·운영 안내와의 구분">
        <LegalP>
          비밀번호 재설정, 입사 지원·면접 제안·합격·불합격 등 이용자가 요청하거나 서비스 이용에 필수인 안내는 이 동의와
          관계없이 보내질 수 있습니다. 그런 안내는 광고성 정보가 아닙니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="8. 야간 수신">
        <LegalP>
          회사는 오후 9시부터 다음날 오전 8시까지 전자적 전송 매체로 광고성 정보를 보내지 않습니다. 이 시간대에 보내려면
          별도의 동의를 받습니다.
        </LegalP>
      </LegalSection>
    </LegalPageShell>
  );
}
