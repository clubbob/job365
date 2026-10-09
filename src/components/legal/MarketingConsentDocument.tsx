import { LegalOl, LegalP, LegalSection, LegalUl } from '@/components/legal/LegalDocument';
import { COMPANY } from '@/lib/company';
import { LEGAL_EFFECTIVE_DATE } from '@/lib/legal-effective-date';

export const MARKETING_CONSENT_EFFECTIVE_DATE = LEGAL_EFFECTIVE_DATE;

const mailtoClassName =
  'font-medium text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60';

function MailLink() {
  return (
    <a href={`mailto:${COMPANY.email}`} className={mailtoClassName}>
      {COMPANY.email}
    </a>
  );
}

export default function MarketingConsentDocument() {
  return (
    <>
      <LegalSection title="1. 선택 동의">
        <LegalP>
          {COMPANY.name}의 {COMPANY.serviceName}에서 영리 목적 광고성 정보를 보내기 위한 선택 동의입니다. 동의하지
          않아도 회원가입·채용 공고 열람·지원·등록 등 필수 기능은 이용할 수 있습니다.
        </LegalP>
        <LegalP>
          마이페이지 「맞춤 채용 설정」의 채용 공고 이메일은 별도 설정이며, 이 동의와 무관합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="2. 내용·항목·수단">
        <LegalP>이벤트·혜택·신규 기능·채용·취업 관련 소식 등을 이메일로 보낼 수 있습니다.</LegalP>
        <LegalUl>
          <li>이용 항목: 이메일, 닉네임, 이용 주체, 동의·철회 일시</li>
          <li>수단: 이메일(문자·전화 광고는 하지 않음)</li>
          <li>보유: 동의 철회 또는 탈퇴 시까지</li>
        </LegalUl>
      </LegalSection>

      <LegalSection title="3. 철회·운영 안내">
        <LegalOl>
          <li>마이페이지에서 마케팅 수신 해제 후 저장</li>
          <li>문의하기 또는 <MailLink /></li>
        </LegalOl>
        <LegalP>
          비밀번호 재설정, 지원·제안·문의 답변, 맞춤 채용 메일 등 서비스 운영 안내는 광고성 정보가 아닙니다.
        </LegalP>
        <LegalP>
          광고성 정보는 오후 9시~다음날 오전 8시에는 보내지 않습니다. 해당 시간대에 광고성 정보를 내려면 별도 동의를 받습니다.
        </LegalP>
      </LegalSection>
    </>
  );
}
