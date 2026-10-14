import { LegalSection } from '@/components/legal/LegalDocument';
import { COMPANY } from '@/lib/company';

const mailtoClassName =
  'font-medium text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary/60';

export default function LegalCompanyInfo({ title = '회사 정보' }: { title?: string }) {
  return (
    <LegalSection title={title}>
      <dl className="min-w-0 space-y-2">
        <div>
          <dt className="inline">상호 : </dt>
          <dd className="inline">{COMPANY.name}</dd>
        </div>
        <div>
          <dt className="inline">대표 : </dt>
          <dd className="inline">{COMPANY.ceo}</dd>
        </div>
        <div>
          <dt className="inline">사업자등록번호 : </dt>
          <dd className="inline break-all">{COMPANY.businessNumber}</dd>
        </div>
        <div className="min-w-0">
          <dt className="inline">주소 : </dt>
          <dd className="inline break-words">{COMPANY.address}</dd>
        </div>
        <div>
          <dt className="inline">직업정보제공사업 : </dt>
          <dd className="inline break-all">{COMPANY.jobInfoProviderReportNo}</dd>
        </div>
        <div>
          <dt className="inline">전화 : </dt>
          <dd className="inline">{COMPANY.phone}</dd>
        </div>
        <div className="min-w-0">
          <dt className="inline">웹사이트 : </dt>
          <dd className="inline break-all">
            <a href={COMPANY.website} className={mailtoClassName}>
              joblink365.com
            </a>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="inline">이메일 : </dt>
          <dd className="inline break-all">{COMPANY.email}</dd>
        </div>
      </dl>
    </LegalSection>
  );
}
