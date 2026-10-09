import { LegalOl, LegalP, LegalSection } from '@/components/legal/LegalDocument';
import LegalPageShell from '@/components/legal/LegalPageShell';
import { COMPANY } from '@/lib/company';
import { LEGAL_EFFECTIVE_DATE } from '@/lib/legal-effective-date';

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

export default function TermsPage() {
  return (
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
          서비스는 공개된 채용 정보를 모아 검색·열람할 수 있게 하고, 회원이 등록한 채용 정보·이력서로 매칭을 돕는
          무료 플랫폼입니다. 회사는 채용·근로계약의 당사자가 아니며, 유료 직업소개업을 하지 않습니다.
        </LegalP>
        <LegalP>
          &quot;수집 채용 공고&quot;는 외부 채용 사이트·기업 채용 페이지 등 공개 출처에서 자동 수집한 정보를, 원문을
          그대로 옮기지 않고 요약·항목화하여 제공하는 것입니다. 상세·지원은 출처·원문 사이트에서 이루어집니다.
          &quot;회원 등록 채용 정보&quot;는 구인자 회원이 직접 등록·공개한 공고입니다.
        </LegalP>
        <LegalP>회사는 광고를 게재할 수 있으며, 광고 내용에 대한 책임은 광고주에게 있습니다.</LegalP>
      </LegalSection>

      <LegalSection title="제3조 (회원 및 이용)">
        <LegalP>
          회원은 이메일·비밀번호 또는 Google 계정으로 가입합니다(구직자 가입). 한 계정에서 구직자·구인자 이용 주체를
          선택할 수 있습니다. 비회원은 공개된 채용·인재 정보를 열람할 수 있고, 지원·등록·제안·찜·맞춤 설정 등은 회원
          기능입니다.
        </LegalP>
        <LegalP>
          구직자: 회원 등록 채용 정보에만 입사 지원, 이력서 공개(한 건), 면접 제안 수락 시 해당 구인자에만 실명 공개,
          수집 채용 공고 찜·맞춤 이메일(설정 시) 등. 구인자: 사업자 상태조회 후 회사·채용 정보 등록, 입사 지원 처리,
          면접 제안. 화면 안내·합격 표시는 실제 채용 결정을 대신하지 않습니다.
        </LegalP>
        <LegalP>
          회원은 정확한 정보를 등록하고 계정을 스스로 관리합니다. 허위·도용·약관 위반 시 이용이 제한될 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제4조 (게시물 및 수집 공고)">
        <LegalP>이용자 게시물의 책임은 게시자에게 있습니다. 회사는 법령 위반·권리 침해·허위 채용·운영 방해 등에 해당하면
          게시물을 제한·삭제할 수 있습니다.</LegalP>
        <LegalP>
          수집 채용 공고 관련 정정·게시 중단·삭제 요청은 &quot;문의하기&quot; 또는 <MailLink />으로 할 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제5조 (이용자 의무)">
        <LegalP>
          이용자는 허위 등록, 타인 정보 도용, 스팸·무단 수집, 서비스 정보의 무단 복제·대량 수집, 시스템 방해 등을 하지
          않습니다. 구인자는 관련 근로·채용 법령을 준수합니다.
        </LegalP>
        <LegalP>
          이용자 게시물에 대해 회사는 서비스 운영에 필요한 범위에서 이용할 수 있는 권한을 가집니다. 서비스 UI·프로그램
          등의 권리는 회사 또는 정당한 권리자에게 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제6조 (개인정보)">
        <LegalP>
          개인정보 처리는 개인정보처리방침에 따릅니다. 회원가입 시 개인정보처리방침(국외 이전 포함)에 동의합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제7조 (면책·변경·탈퇴)">
        <LegalP>
          회사는 고의·중과실이 없는 한, 이용자 간 채용·근로 관계, 이용자 게시물의 정확성, 수집 공고의 최신성·요약과
          원문의 차이, 외부 사이트 지원, 사업자 상태조회 결과, 무료 서비스 이용에 따른 기대 이익 등에 대해 책임을 지지
          않습니다. 서비스는 변경·중단될 수 있으며, 불가피한 경우 사전 공지 없이 중단될 수 있습니다.
        </LegalP>
        <LegalP>
          회원은 탈퇴할 수 있으며, 탈퇴 시 등록 정보는 삭제됩니다(법령상 보관 제외). 분쟁은 협의하고, 협의되지 않으면
          대한민국 법령과 관할 법원에 따릅니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제8조 (문의)">
        <LegalP>
          문의는 사이트 &quot;문의하기&quot; 또는 <MailLink />으로 해 주세요.
        </LegalP>
      </LegalSection>
    </LegalPageShell>
  );
}
