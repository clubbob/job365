import type { Metadata } from 'next';
import { LegalOl, LegalP, LegalSection, LegalUl } from '@/components/legal/LegalDocument';
import LegalPageShell from '@/components/legal/LegalPageShell';
import { COMPANY } from '@/lib/company';
import { LEGAL_EFFECTIVE_DATE } from '@/lib/legal-effective-date';

export const metadata: Metadata = {
  title: '개인정보처리방침',
};

const EFFECTIVE_DATE = LEGAL_EFFECTIVE_DATE;

const mailtoClassName =
  'font-medium text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60';

function MailLink() {
  return (
    <a href={`mailto:${COMPANY.email}`} className={mailtoClassName}>
      {COMPANY.email}
    </a>
  );
}

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="개인정보처리방침"
      effectiveDate={EFFECTIVE_DATE}
      companySectionTitle="개인정보처리자"
    >
      <LegalSection title="1. 총칙">
        <LegalP>
          {COMPANY.name}(이하 &quot;회사&quot;)은 {COMPANY.serviceName} 서비스 이용과 관련하여 「개인정보 보호법」 등
          법령에 따라 개인정보를 처리합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="2. 처리 목적 및 항목">
        <LegalP>회사는 다음 목적에 필요한 범위에서만 개인정보를 처리합니다.</LegalP>
        <LegalOl>
          <li>회원 가입·로그인·이용 주체 구분, 계정·동의 기록 관리</li>
          <li>이력서·회사 정보·회원 등록 채용 정보 등록·열람·매칭(지원·면접 제안 등)</li>
          <li>수집 채용 공고 찜, 맞춤 채용 설정·이메일(「채용 공고 이메일 받기」 선택·저장 시)</li>
          <li>사업자등록번호 상태조회, 문의·답변·첨부, 비밀번호 재설정·운영 안내</li>
          <li>부정 이용 방지, 서비스 개선, 마케팅 수신 동의 시 광고성 안내(선택)</li>
        </LegalOl>
        <LegalP>
          주요 항목: 이메일, 닉네임, 비밀번호(암호화), 이력서·채용·회사 정보 입력 내용, 찜·맞춤 설정, 문의 내용,
          접속·쿠키·기기 정보 등. 수집 채용 공고는 공개 채용 정보를 요약 제공하며, 개인 식별 정보는 원칙적으로
          다루지 않습니다.
        </LegalP>
        <LegalP>
          계정·이력서·찜·맞춤 설정·문의 등은 서버(Firebase 등)에, 입사 지원·면접 제안·관심 회사·열람 제한 등은 브라우저
          저장소에 저장될 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="3. 보유·파기">
        <LegalP>
          목적 달성 시 지체 없이 파기합니다. 회원 탈퇴 시 등록 정보는 삭제합니다. 전자상거래법·통신비밀보호법 등
          법령상 보관 기록, 분쟁 대응용 최소 기록(탈퇴 후 1년)은 예외로 보관할 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="4. 제3자 제공·위탁·국외 이전">
        <LegalP>동의 또는 법령에 따른 경우에만 제3자에게 제공합니다.</LegalP>
        <LegalUl>
          <li>국세청(공공데이터포털): 사업자등록번호 상태조회</li>
          <li>입사 지원·면접 제안 상대 회원: 공개된 지원·이력서 정보(면접 수락 시 구직자 실명)</li>
        </LegalUl>
        <LegalP>
          위탁: Google(Firebase·인증·저장), 네이버 메일 SMTP(운영·맞춤 채용 메일 등). Firebase 이용에 따라 개인정보가
          미국으로 이전될 수 있으며, 회원가입 시 개인정보처리방침(국외 이전 포함) 동의로 이전·이용합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="5. 이용자 권리">
        <LegalP>
          마이페이지에서 열람·수정·탈퇴가 가능하고, <MailLink /> 또는 문의하기로 요청할 수 있습니다. 만 14세 미만
          가입은 받지 않습니다.
        </LegalP>
        <LegalP>
          개인정보 보호책임자: {COMPANY.ceo} (대표), 이메일 <MailLink />. 침해 신고는 개인정보침해신고센터(118) 등
          관계 기관에 할 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="6. 쿠키·광고">
        <LegalP>
          로그인·설정 유지 등을 위해 쿠키·로컬 저장소를 사용합니다. Google AdSense 등 제3자 광고가 쿠키·광고 ID를 사용할
          수 있으며, 브라우저·광고 설정으로 제한할 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="7. 변경">
        <LegalP>방침 변경 시 서비스에 게시하며, 중요한 변경은 시행 7일 전부터 알립니다.</LegalP>
      </LegalSection>
    </LegalPageShell>
  );
}
