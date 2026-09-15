'use client';

import { loadBizVerify } from '@/lib/biz-verify-store';
import {
  jobCareerLabel,
  jobDeadlineLabel,
  jobEducationLabel,
  jobHeadcountLabel,
} from '@/lib/job-display';
import {
  jobCompanyBusinessNumberLabel,
  jobCompanyEmployeeCountLabel,
  jobCompanyFoundedLabel,
  jobCompanyRevenueLabel,
  resolveJobCompany,
} from '@/lib/job-company';
import { jobPositionLabel, jobWorkTypesLabel, type JobCompanyInfo, type JobPosting } from '@/types/job';

const PAGE_WIDTH_PX = 794;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jobFileName(title: string): string {
  const base =
    title
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || '채용 정보';
  return `${base}.pdf`;
}

function textHtml(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return '<p class="empty">없음</p>';
  return `<p>${escapeHtml(trimmed).replace(/\r\n|\n|\r/g, '<br>')}</p>`;
}

function row(label: string, value?: string | null): string {
  const trimmed = value?.trim();
  return `<div class="row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(trimmed || '—')}</dd></div>`;
}

function section(title: string, body: string): string {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function rows(items: Array<[string, string | null | undefined]>): string {
  return `<div class="rows">${items.map(([label, value]) => row(label, value)).join('')}</div>`;
}

function buildJobFileHtml(
  job: JobPosting,
  company: JobCompanyInfo,
  registrant?: { name?: string; email?: string },
): string {
  const title = job.title.trim() || '채용 정보';
  const companyName = (company.companyName || job.companyName).trim() || '회사명 없음';
  const workType = jobWorkTypesLabel(job);
  const career = jobCareerLabel(job);
  const education = jobEducationLabel(job.education);
  const headcount = jobHeadcountLabel(job.headcount);
  const deadline = jobDeadlineLabel(job.deadline);
  const businessNumber = jobCompanyBusinessNumberLabel(company.businessNumber || job.businessNumber);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; color: #171717; font: 15px/1.6 "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; background: #fff; }
    main { width: ${PAGE_WIDTH_PX}px; padding: 36px 40px 48px; }
    header { margin-bottom: 8px; padding-bottom: 20px; border-bottom: 2px solid #171717; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    .headline { margin: 0 0 8px; color: #525252; }
    .meta { margin: 0; color: #737373; font-size: 13px; }
    h2 { margin: 28px 0 12px; font-size: 16px; }
    section:first-of-type h2 { margin-top: 20px; }
    .rows { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; }
    .rows + .rows { margin-top: 10px; }
    .row { display: grid; grid-template-columns: 8.5em minmax(0, 1fr); gap: 10px; align-items: start; }
    dt { color: #737373; font-weight: 600; white-space: nowrap; }
    dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
    h3 { margin: 16px 0 8px; font-size: 14px; }
    p { margin: 0; }
    .empty { color: #a3a3a3; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(title)}</h1>
      <p class="headline">${escapeHtml(companyName)}</p>
      <p class="meta">${escapeHtml(
        [workType, career, education, job.payLabel].filter(Boolean).join(' · '),
      )}</p>
    </header>
    ${section(
      '회사 정보',
      `${rows([
        ['사업자등록번호', businessNumber],
        ['회사명', companyName],
        ['대표자명', company.ceo],
        ['전화번호', company.phone],
        ['팩스번호', company.fax],
        ['설립일', jobCompanyFoundedLabel(company.foundedOn)],
        ['직원 수', jobCompanyEmployeeCountLabel(company.employeeCount)],
        ['전년 매출액', jobCompanyRevenueLabel(company.lastYearRevenue)],
        ['사업장 주소', company.address],
        ['홈페이지', company.website],
      ])}
      <h3>회사 소개</h3>${textHtml(company.intro)}
      ${rows([
        ['등록자 이름', registrant?.name],
        ['이메일', registrant?.email],
      ])}`,
    )}
    ${section(
      '모집 요강',
      rows([
        ['채용 제목', title],
        ['근무 형태', workType],
        ['모집 인원', headcount],
        ['지급 기준', job.payLabel],
        ['경력 유무', career],
        ['학력', education],
        ['직급/직책', jobPositionLabel(job.positionLevel)],
        ['수습 기간', job.probation],
        ['근무지', job.location],
        ['근무 요일', job.workDays],
        ['근무 시간', job.workHours],
        ['접수 마감', deadline],
      ]),
    )}
    ${section(
      '상세 내용',
      `<h3>담당 업무</h3>${textHtml(job.summary)}
      <h3>자격 요건</h3>${textHtml(job.requirements)}
      <h3>우대 사항</h3>${textHtml(job.preferred)}
      <h3>복리후생</h3>${textHtml(job.benefits)}
      <h3>전형 절차</h3>${textHtml(job.process)}`,
    )}
  </main>
</body>
</html>`;
}

function waitForIframeDocument(iframe: HTMLIFrameElement): Promise<Document> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      const doc = iframe.contentDocument;
      if (!doc?.querySelector('main')) return false;
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      resolve(doc);
      return true;
    };
    const timeout = window.setTimeout(() => {
      window.clearInterval(poll);
      reject(new Error('timeout'));
    }, 8000);
    const poll = window.setInterval(() => {
      finish();
    }, 50);
    iframe.onload = () => {
      finish();
    };
  });
}

async function renderJobPdf(html: string, filename: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:0;top:0;width:${PAGE_WIDTH_PX}px;height:200px;border:0;opacity:0.01;pointer-events:none;z-index:-1;`;
  document.body.appendChild(iframe);
  iframe.srcdoc = html;
  try {
    const doc = await waitForIframeDocument(iframe);
    const root = doc.querySelector('main') ?? doc.body;
    const height = Math.max(root.scrollHeight, doc.documentElement.scrollHeight, doc.body.scrollHeight, 200);
    iframe.style.height = `${height}px`;
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: PAGE_WIDTH_PX,
      windowWidth: PAGE_WIDTH_PX,
      windowHeight: height,
      height,
      scrollX: 0,
      scrollY: 0,
    });
    const image = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    let left = imageHeight;
    let offset = 0;
    pdf.addImage(image, 'JPEG', 0, offset, pageWidth, imageHeight);
    left -= pageHeight;
    while (left > 1) {
      offset -= pageHeight;
      pdf.addPage();
      pdf.addImage(image, 'JPEG', 0, offset, pageWidth, imageHeight);
      left -= pageHeight;
    }
    pdf.save(filename);
  } finally {
    iframe.remove();
  }
}

export async function downloadJobFile(job: JobPosting, userId?: string): Promise<void> {
  try {
    const account = userId ? loadBizVerify(userId) : null;
    const company = resolveJobCompany(job, userId);
    await renderJobPdf(
      buildJobFileHtml(job, company, {
        name: company.registrantName || account?.registrantName,
        email: company.registrantEmail || account?.registrantEmail,
      }),
      jobFileName(job.title),
    );
  } catch {
    window.alert('채용 정보 PDF를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
}
