import type { Metadata } from 'next';
import { LegalOl, LegalP, LegalSection, LegalUl } from '@/components/legal/LegalDocument';
import LegalPageShell from '@/components/legal/LegalPageShell';
import { COMPANY } from '@/lib/company';

export const metadata: Metadata = {
  title: '개인정보처리방침',
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

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="개인정보처리방침"
      effectiveDate={EFFECTIVE_DATE}
      companySectionTitle="개인정보처리자"
    >
      <LegalSection title="1. 총칙">
        <LegalP>
          {COMPANY.name}(이하 &quot;회사&quot;)은 {COMPANY.serviceName} 채용 매칭 서비스(이하 &quot;서비스&quot;)를
          제공하면서 「개인정보 보호법」 등 관련 법령에 따라 이용자의 개인정보를 보호하고, 이와 관련한 고충을 신속하게
          처리하기 위하여 이 개인정보처리방침을 둡니다. 회사가 개인정보를 처리하는 목적·항목·보유 기간·제3자 제공·위탁·국외
          이전은 아래와 같습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="2. 개인정보의 처리 목적">
        <LegalP>회사는 다음 목적에 필요한 범위에서만 개인정보를 처리합니다. 목적이 바뀌면 미리 알리고 동의를 받습니다.</LegalP>
        <LegalOl>
          <li>회원 가입·로그인·이용 주체(구직자·구인자) 구분 등 회원 관리</li>
          <li>채용 정보·이력서·회사 정보의 등록, 공개, 열람, 수정, 삭제</li>
          <li>입사 지원과 합격·불합격 안내, 면접 제안의 발송·수락·거절, 수락 시 해당 구인자에게만 실명 공개</li>
          <li>구인자 회사 정보 등록을 위한 국세청 사업자등록 상태조회(계속·휴업·폐업·미등록)</li>
          <li>관심 회사, 이력서 열람 제한 등 이용자가 선택한 설정 유지</li>
          <li>비밀번호 재설정, 고객 문의 응대, 약관·정책 안내 등 서비스 운영 통지</li>
          <li>부정 이용 방지, 분쟁 대응, 서비스 개선</li>
          <li>마케팅 수신에 동의한 회원에 대한 이벤트·신규 기능·채용 관련 광고성 정보 안내(선택)</li>
        </LegalOl>
      </LegalSection>

      <LegalSection title="3. 처리하는 개인정보 항목">
        <LegalP>
          회사는 서비스 이용 과정에서 다음 정보를 수집할 수 있습니다. 선택 항목을 입력하지 않아도 회원가입, 채용 정보
          열람, 이력서·채용 정보 작성 등 필수 서비스는 이용할 수 있습니다.
        </LegalP>
        <LegalOl>
          <li>
            회원 계정(필수): 이메일, 닉네임(표시 이름), 로그인 식별값(회원 ID), 가입 방식(이메일 또는 Google), 비밀번호(이메일
            가입 시, 암호화되어 저장), 이용약관·개인정보처리방침·마케팅 수신 동의 기록 및 동의 일시
          </li>
          <li>
            구직자 이력서: 이력서 제목, 이름, 생년월, 성별, 이메일, 거주 지역, 사진, 희망 근무 조건(근무 형태,
            지역, 직종, 근무 가능), 학력·학교·전공, 경력 유무 및 경력 내역, 자격증·어학·스킬, 자기 소개. 휴대폰, 홈페이지·SNS,
            희망 급여(선택)
          </li>
          <li>
            구인자 회사 정보: 사업자등록번호, 회사명, 대표자명, 전화번호, 설립일, 직원 수, 전년 매출액, 사업장 주소,
            회사 소개, 등록자 이름·이메일·핸드폰 번호. 팩스번호·홈페이지(선택). 상태조회 결과(계속사업자 여부 등)
          </li>
          <li>
            채용 정보: 공고 제목, 근무 형태·지역·급여·모집 인원, 담당 업무, 자격 요건, 우대·복리후생, 전형 절차, 마감일
            등 구인자가 입력한 내용
          </li>
          <li>문의하기: 이름, 이메일, 문의 내용</li>
          <li>
            자동 수집: 서비스 이용 기록, 접속 로그, 쿠키, 기기·브라우저 정보. 접속 IP는 보안·부정 이용 방지 목적에서
            처리될 수 있습니다.
          </li>
        </LegalOl>
        <LegalP>
          입사 지원, 면접 제안, 관심 회사, 이력서 열람 제한은 현재 이용자 기기(브라우저 저장소)에 저장될 수 있습니다.
          계정, 이력서, 채용 정보, 회사 정보, 동의 기록은 회사의 서버(아래 국외 이전 항목의 Firebase)에 저장됩니다.
        </LegalP>
        <LegalP>
          개인사업자의 사업자등록번호는 개인정보에 해당할 수 있으며, 회사 정보 등록과 채용 정보 운영에 필요한 범위에서만
          처리합니다. 이력서의 실명은 면접 제안을 수락한 구인자에게만 공개됩니다. 공개된 채용 정보와 공개된 이력서(실명
          제외)는 다른 이용자가 열람할 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="4. 수집 방법">
        <LegalOl>
          <li>회원가입, 마이페이지, 이력서·회사 정보·채용 정보 등록 화면에서 이용자가 직접 입력</li>
          <li>Google 로그인 시 Google이 제공하는 계정 식별 정보·이메일·표시 이름</li>
          <li>입사 지원·면접 제안·문의 등 서비스 이용 과정에서 생성</li>
          <li>구인자가 상태조회를 요청할 때 입력한 사업자등록번호</li>
        </LegalOl>
        <LegalP>
          카카오·네이버 로그인은 준비 중이며, 연결되면 해당 사업자가 제공하는 계정 식별 정보·이메일·표시 이름을 같은
          목적·범위에서 처리하고 이 방침을 갱신합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="5. 보유 및 이용 기간">
        <LegalP>
          회사는 목적이 달성되면 지체 없이 개인정보를 파기합니다. 회원 탈퇴 시 계정, 회사 정보, 채용 정보, 이력서는
          삭제합니다. 다만 다음 정보는 해당 기간 동안 보관할 수 있습니다.
        </LegalP>
        <LegalOl>
          <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
          <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (같은 법). 현재 서비스는 이용 수수료를 받지 않습니다.</li>
          <li>소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (같은 법)</li>
          <li>접속에 관한 기록: 3개월 (통신비밀보호법)</li>
          <li>부정 이용 방지 및 분쟁 대응을 위해 필요한 최소 기록: 탈퇴일부터 1년 (내부 기준)</li>
        </LegalOl>
        <LegalP>
          이미 전달된 입사 지원·면접 제안은 상대 회원의 이용에 필요한 범위에서 남을 수 있습니다. 마케팅 수신 동의 기록은
          동의 철회 또는 회원 탈퇴 시까지 보관합니다. 브라우저에만 저장된 정보는 이용자가 해당 브라우저의 저장 데이터를
          지우면 함께 삭제됩니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="6. 제3자 제공">
        <LegalP>
          회사는 이용자의 동의가 있거나 법령에 근거가 있는 경우에만 개인정보를 제3자에게 제공합니다. 현재 다음 제공이
          있습니다.
        </LegalP>
        <LegalOl>
          <li>
            제공받는 자: 국세청(공공데이터포털 경유)
            <LegalUl>
              <li>목적: 사업자등록 상태조회(계속·휴업·폐업·미등록)</li>
              <li>항목: 사업자등록번호</li>
              <li>보유·이용 기간: 국세청 및 공공데이터포털의 운영 기준</li>
            </LegalUl>
          </li>
          <li>
            제공받는 자: 입사 지원 또는 면접 제안을 주고받은 상대 회원
            <LegalUl>
              <li>목적: 채용 매칭(지원 확인, 면접 제안, 수락 시 실명 확인)</li>
              <li>항목: 공개된 채용 정보·이력서 내용. 면접 제안 수락 시에 한하여 구직자 실명</li>
              <li>보유·이용 기간: 상대 회원이 해당 기록을 삭제하거나 회원 탈퇴할 때까지</li>
            </LegalUl>
          </li>
        </LegalOl>
        <LegalP>
          상호·대표자 성명·개업일자는 국세청에 보내지 않습니다. 상태조회 결과는 국세청이나 회사의 인증·보증이 아닙니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="7. 처리 위탁">
        <LegalP>원활한 서비스 제공을 위해 다음과 같이 처리를 위탁합니다.</LegalP>
        <LegalOl>
          <li>
            Google LLC(Firebase Authentication, Cloud Firestore, Cloud Storage): 회원 인증, 데이터·파일 저장·동기화
          </li>
          <li>네이버(네이버 메일 SMTP): 비밀번호 재설정, 운영 안내 메일 발송</li>
        </LegalOl>
        <LegalP>
          회사는 위탁 계약으로 개인정보 보호 의무를 규정하고, 수탁자가 바뀌면 이 방침에 공개합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="8. 개인정보의 국외 이전">
        <LegalP>
          서비스 운영을 위해 다음 개인정보를 국외로 이전합니다. 이전에 동의하지 않으면 회원가입과 서비스 이용이 제한될 수
          있습니다.
        </LegalP>
        <LegalOl>
          <li>
            이전받는 자: Google LLC (Firebase)
            <LegalUl>
              <li>이전 국가: 미국</li>
              <li>이전 시기·방법: 회원가입·로그인 및 이력서·채용 정보·회사 정보 저장 시 네트워크를 통해 암호화 전송</li>
              <li>
                항목: 계정 정보, 이력서, 채용 정보, 회사 정보, 동의 기록, 서비스 이용에 필요한 식별값. 사진 파일을
                올리면 해당 이미지
              </li>
              <li>목적: 회원 인증 및 데이터 저장</li>
              <li>보유·이용 기간: 회원 탈퇴 또는 위탁 계약 종료 시까지. 법령에 따른 보관 정보는 해당 기간</li>
            </LegalUl>
          </li>
        </LegalOl>
      </LegalSection>

      <LegalSection title="9. 정보주체의 권리">
        <LegalP>
          이용자는 언제든지 자신의 개인정보를 열람·정정·삭제·처리정지 요구할 수 있습니다. 회원은 마이페이지에서 계정,
          이력서, 회사 정보, 채용 정보, 마케팅 수신 동의를 확인하고 수정·삭제할 수 있으며, 회원 탈퇴로 이용 계약을 종료할
          수 있습니다.
        </LegalP>
        <LegalP>
          회사는 만 14세 미만의 회원가입을 받지 않습니다. 만 14세 미만의 개인정보는 법정대리인 동의 없이는 수집하지
          않습니다.
        </LegalP>
        <LegalP>
          권리 행사는 사이트 하단 &quot;문의하기&quot; 또는 <MailLink />으로 요청할 수 있습니다. 회사는 관련 법령에 따라
          지체 없이 조치합니다. 다른 사람의 권리를 침해하거나 법령에 어긋나는 요청은 제한될 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="10. 개인정보의 파기">
        <LegalP>
          보유 기간이 끝나거나 처리 목적이 달성되면 해당 정보를 지체 없이 파기합니다. 전자 파일은 복구할 수 없는 방법으로
          삭제하고, 종이 문서는 분쇄하거나 소각합니다. 법령에 따라 보관하는 정보는 다른 정보와 분리하여 보관합니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="11. 안전성 확보조치">
        <LegalP>회사는 개인정보의 안전성 확보를 위해 다음 조치를 합니다.</LegalP>
        <LegalOl>
          <li>권한 관리: 개인정보 처리 접근 권한을 필요한 범위로 제한</li>
          <li>기술적 조치: 전송 구간 암호화(HTTPS), 인증 토큰·비밀번호의 안전한 저장, 접속 기록 보관</li>
          <li>관리적 조치: 내부 방침에 따른 처리, 침해 사고 대응</li>
        </LegalOl>
      </LegalSection>

      <LegalSection title="12. 쿠키 등 자동 수집 장치">
        <LegalP>
          서비스는 로그인 유지, 이용 주체 선택, 목록 위치 기억, 입사 지원·면접 제안 목록 표시 등을 위해 쿠키와 브라우저
          저장소(로컬 스토리지)를 사용할 수 있습니다. 브라우저 설정에서 쿠키 저장을 거부하거나 사이트 데이터를 지울 수
          있으나, 이 경우 로그인·일부 기능이 제한될 수 있습니다.
        </LegalP>
      </LegalSection>

      <LegalSection title="13. 개인정보 보호책임자">
        <LegalP>
          개인정보 처리에 관한 업무는 대표가 총괄합니다. 개인정보 관련 문의, 불만, 열람 청구는 아래로 해 주세요.
        </LegalP>
        <LegalUl>
          <li>개인정보 보호책임자: {COMPANY.ceo} (대표)</li>
          <li>이메일: <MailLink /></li>
          <li>문의: 사이트 하단 &quot;문의하기&quot;</li>
        </LegalUl>
      </LegalSection>

      <LegalSection title="14. 권익침해 구제">
        <LegalP>개인정보 침해에 대한 신고나 상담이 필요하면 아래 기관에 문의할 수 있습니다.</LegalP>
        <LegalUl>
          <li>개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)</li>
          <li>개인정보 분쟁조정위원회 (www.kopico.go.kr / 1833-6972)</li>
          <li>대검찰청 사이버수사과 (www.spo.go.kr / 국번없이 1301)</li>
          <li>경찰청 사이버수사국 (ecrm.police.go.kr / 국번없이 182)</li>
        </LegalUl>
      </LegalSection>

      <LegalSection title="15. 방침의 변경">
        <LegalP>
          이 방침을 변경하면 시행일과 변경 내용을 서비스에 게시합니다. 중요한 변경은 시행 7일 전부터 알립니다.
        </LegalP>
      </LegalSection>
    </LegalPageShell>
  );
}
