import { LegalOl, LegalP, LegalSection } from '@/components/legal/LegalDocument';
import LegalPageShell from '@/components/legal/LegalPageShell';

const EFFECTIVE_DATE = '2026년 9월 9일';

export default function TermsPage() {
  return (
    <LegalPageShell title="이용약관" effectiveDate={EFFECTIVE_DATE}>
      <LegalSection title="제1조 (목적)">
        <LegalP>
          본 약관은 새봄인터내셔널(이하 &quot;회사&quot;)이 운영하는 JOB 365 이용·매칭 웹 서비스(이하
          &quot;서비스&quot;)의 이용과 관련하여, 회사와 이용자 간 권리·의무 및 책임사항을 규정합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제2조 (정의)">
        <LegalOl>
          <li>&quot;구직자&quot;란 채용 정보를 열람하고 지원하는 이용 방식을 말합니다.</li>
          <li>&quot;구인자&quot;란 채용 정보를 등록하고 지원자를 관리하는 이용 방식을 말합니다.</li>
          <li>&quot;채용 정보&quot;란 구인자가 등록한 구인 내용을 말합니다.</li>
          <li>&quot;이용자&quot;란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
        </LegalOl>
      </LegalSection>

      <LegalSection title="제3조 (서비스의 내용)">
        <LegalP>
          회사는 파트타임부터 정규직까지, 계약직·인턴·프리랜서·파견·도급·프로젝트 일자리를 중심으로 한 무료
          이용·매칭 서비스를 제공합니다. 채용 정보 열람과 지원, 채용 정보 등록은 이용 수수료 없이 제공되며, 서비스 내 광고가 표시될 수
          있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제4조 (회원가입 및 구인자 자격)">
        <LegalP>
          회원은 이메일 또는 소셜 계정으로 가입하며, 한 계정으로 구직자와 구인자를 모두 이용할 수 있습니다.
        </LegalP>
        <LegalP>
          구인자가 채용 정보를 등록할 때마다 본인 또는 소속 사업자의 사업자등록번호로 국세청 사업자등록 상태조회(계속사업자,
          휴업자, 폐업자, 미등록)를 거쳐야 합니다. 이 조회는 공공데이터포털을 통해 이루어지며, 상호·대표자·개업일자 등
          진위확인은 하지 않습니다. 조회 결과는 조회 시점 기준이며, 이후 상태가 바뀔 수 있습니다. 타인의 사업자등록번호를
          무단으로 사용해서는 안 됩니다. 회사는 필요 시 게시 전 추가 확인을 할 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제5조 (면책)">
        <LegalP>
          회사는 이용자 간 채용 계약의 당사자가 아니며, 채용 정보 내용의 진실성·근로조건 이행에 대해 보증하지 않습니다.
          국세청 상태조회 결과는 해당 번호의 납세자 상태 정보일 뿐, 국세청이나 회사의 인증·보증이 아니며, 상호의 일치,
          사업의 실재, 구인자의 신용이나 채용 조건의 이행을 확인하거나 보장하지 않습니다. 국세청 및 공공데이터포털이
          제공하는 정보의 오류·지연에 대해 회사가 책임을 지지 않습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="제6조 (문의)">
        <LegalP>
          서비스 이용 관련 문의는 사이트 하단 &quot;문의하기&quot; 또는{' '}
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
