import { LegalOl, LegalP, LegalSection } from '@/components/legal/LegalDocument';
import LegalPageShell from '@/components/legal/LegalPageShell';

const EFFECTIVE_DATE = '2026년 9월 6일';

export default function TermsPage() {
  return (
    <LegalPageShell title="이용약관" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection title="제1조 (목적)">
        <LegalP>
          본 약관은 JOB 365(이하 &quot;회사&quot;)가 제공하는 채용 매칭 웹 서비스(이하 &quot;서비스&quot;)의
          이용과 관련하여, 회사와 이용자 간 권리·의무 및 책임사항을 규정합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제2조 (정의)">
        <LegalOl>
          <li>&quot;구직자&quot;란 공고를 열람하고 지원하는 이용 방식을 말합니다.</li>
          <li>&quot;구인자&quot;란 공고를 등록하고 지원자를 관리하는 이용 방식을 말합니다.</li>
          <li>&quot;공고&quot;란 구인자가 등록한 채용 정보를 말합니다.</li>
          <li>&quot;이용자&quot;란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
        </LegalOl>
      </LegalSection>

      <LegalSection title="제3조 (서비스의 내용)">
        <LegalP>
          회사는 정규직, 계약직, 인턴, 프리랜서, 파트타임, 파견·도급, 프로젝트 일자리를 중심으로 한 무료 매칭
          서비스를 제공합니다. 공고 열람과 지원, 공고 등록은 이용 수수료 없이 제공되며, 서비스 내 광고가 표시될 수
          있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제4조 (회원가입)">
        <LegalP>
          회원은 이메일 또는 소셜 계정으로 가입하며, 한 계정으로 구직자와 구인자를 모두 이용할 수 있습니다.
          구인자의 첫 공고는 사업자 확인 및 관리자 승인 후 게시될 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제5조 (면책)">
        <LegalP>
          회사는 이용자 간 채용 계약의 당사자가 아니며, 공고 내용의 진실성·근로조건 이행에 대해 보증하지 않습니다.
        </LegalP>
      </LegalSection>
    </LegalPageShell>
  );
}
