import { Suspense } from 'react';
import { LegalP, LegalSection } from '@/components/legal/LegalDocument';
import LegalPageShell from '@/components/legal/LegalPageShell';
import { COMPANY } from '@/lib/company';
import { TERMS_EFFECTIVE_DATE } from '@/lib/legal-effective-date';

const EFFECTIVE_DATE = TERMS_EFFECTIVE_DATE;

const mailtoClassName =
  'font-medium text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60';

function MailLink() {
  return (
    <a href={`mailto:${COMPANY.email}`} className={mailtoClassName}>
      {COMPANY.email}
    </a>
  );
}

export default function TermsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
    <LegalPageShell title="이용약관" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection title="제1조 (목적 및 약관)">
        <LegalP>
          이 약관은 {COMPANY.name}(이하 &quot;회사&quot;)이 운영하는 {COMPANY.serviceName}(이하 &quot;서비스&quot;) 이용에
          관한 회사와 이용자의 권리·의무를 정합니다. 서비스에 게시하며, 회원가입 시 동의한 경우 적용됩니다. 회사는
          법령 범위에서 약관을 개정할 수 있고, 시행일 7일 전(이용자에게 불리하면 30일 전)부터 공지합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제2조 (서비스 성격)">
        <LegalP>
          서비스는 공개된 채용 정보를 검색·열람할 수 있게 하는 무료 웹사이트입니다. 회사는 채용·근로의 당사자가 아니며,
          유료 직업소개업을 하지 않습니다. 회원이 채용 공고·이력서·인재 프로필을 등록·게시하는 기능은 제공하지
          않습니다.
        </LegalP>
        <LegalP>
          채용 공고는 외부 채용 사이트·기업 채용 페이지·고용24 등 공개 출처에서 자동 수집합니다. 원문 전체를 복제하지
          않고 제목·회사·요약 등으로 안내하며, 상세 확인·지원은 각 출처의 원문 링크에서 이루어집니다. 수집 시점이나 원문
          변경에 따라 내용이 달라지거나 목록에서 사라질 수 있습니다.
        </LegalP>
        <LegalP>회사는 Google AdSense 등 광고를 게재할 수 있으며, 광고 내용에 대한 책임은 광고주에게 있습니다.</LegalP>
      </LegalSection>

      <LegalSection title="제3조 (회원 및 이용)">
        <LegalP>
          회원은 이메일·비밀번호로 가입합니다. 비회원은 채용 공고 목록을 열람할 수 있고, 찜·맞춤
          채용·문의하기 등은 회원 기능입니다.
        </LegalP>
        <LegalP>
          회원은 채용 공고 찜, 맞춤 채용 설정·이메일(별도 수신 동의·설정 시), 문의하기 등을 이용할 수 있습니다. 회사는
          채용을 대행하거나 합격을 보장하지 않습니다.
        </LegalP>
        <LegalP>
          회원은 정확한 정보를 등록하고 계정을 스스로 관리합니다. 허위·도용·약관 위반 시 이용이 제한될 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제4조 (문의 및 수집 공고)">
        <LegalP>
          회원이 남긴 문의 내용에 대한 책임은 회원에게 있습니다. 회사는 법령 위반·권리 침해·운영 방해 등에 해당하면
          이용을 제한할 수 있습니다.
        </LegalP>
        <LegalP>
          수집 채용 공고의 오류·정정·게시 중단·삭제 요청은 로그인 후 &quot;문의하기&quot; 또는 <MailLink />으로 할 수
          있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제5조 (이용자 의무)">
        <LegalP>
          이용자는 허위 등록, 타인 정보 도용, 스팸·무단 수집, 서비스 정보의 무단 복제·대량 수집·재판매, 시스템 방해 등을
          하지 않습니다.
        </LegalP>
        <LegalP>
          회원이 제출한 문의 등에 대해 회사는 서비스 운영·개선·분쟁 처리에 필요한 범위에서 이용할 수 있는 권한을
          가집니다. 서비스 UI·프로그램·로고 등의 권리는 회사 또는 정당한 권리자에게 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제6조 (개인정보)">
        <LegalP>
          개인정보 처리는 개인정보처리방침에 따릅니다. 회원가입 시 개인정보처리방침(개인정보 국외 이전 포함)에
          동의합니다. 맞춤 채용 이메일·마케팅 수신은 각각 별도 동의·설정에 따릅니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제7조 (면책·변경·탈퇴)">
        <LegalP>
          회사는 고의·중과실이 없는 한, 이용자와 채용 주체(원문 사이트·기업 등) 간 채용·근로 관계, 수집 공고의
          완전성·최신성·요약과 원문의 차이, 외부 사이트 지원 결과, 무료 서비스 이용에 따른 기대 이익 등에 대해 책임을
          지지 않습니다. 서비스는 변경·중단될 수 있으며, 불가피한 경우 사전 공지 없이 중단될 수 있습니다.
        </LegalP>
        <LegalP>
          회원은 탈퇴할 수 있으며, 탈퇴 시 등록 정보는 삭제됩니다(법령상 보관·브라우저에 남은 정보는 예외). 분쟁은
          협의하고, 협의되지 않으면 대한민국 법령과 관할 법원에 따릅니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제8조 (문의)">
        <LegalP>
          문의는 로그인 후 사이트 &quot;문의하기&quot; 또는 <MailLink />으로 해 주세요.
        </LegalP>
      </LegalSection>
    </LegalPageShell>
    </Suspense>
  );
}
