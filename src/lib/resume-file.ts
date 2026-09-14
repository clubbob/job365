'use client';

import { formatBirthDate } from '@/lib/talent-contact';
import {
  talentCareerLabel,
  talentEducation,
  talentResumeTitle,
  talentWorkTypesLabel,
} from '@/lib/talent-display';
import { locationLabelFromRegions, workPreferencesFromTalent } from '@/lib/work-preferences';
import { WORK_TYPE_LABELS } from '@/types/job';
import { talentSchools, talentWorkTypes, type TalentProfile } from '@/types/talent';

const PAGE_WIDTH_PX = 794;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resumeFileName(title: string): string {
  const base =
    title
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || '이력서';
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

function photoHtml(photoUrl?: string, name?: string): string {
  const src = photoUrl?.trim();
  if (!src) return '';
  return `<div class="photo-frame"><img class="photo" src="${escapeHtml(src)}" alt="${escapeHtml(name?.trim() || '사진')}"></div>`;
}

function displayValue(value?: string | null, emptyLabel = '미입력'): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === emptyLabel) return '';
  return trimmed;
}

function workConditionFields(talent: TalentProfile) {
  const prefs = workPreferencesFromTalent(talent);
  const workTypes = prefs.workTypes.length
    ? prefs.workTypes.map((item) => WORK_TYPE_LABELS[item]).join(', ')
    : displayValue(talentWorkTypesLabel(talent));
  const regions = prefs.regions.length
    ? locationLabelFromRegions(prefs.regions)
    : displayValue(talent.location);
  const occupations = prefs.occupations.length
    ? prefs.occupations.join(', ')
    : displayValue(talent.headline);
  const available = displayValue(prefs.available) || displayValue(talent.available);
  return { workTypes, regions, occupations, available };
}

function buildResumeFileHtml(talent: TalentProfile): string {
  const title = talentResumeTitle(talent);
  const name = talent.name?.trim() || '이름 없음';
  const conditions = workConditionFields(talent);
  const workType = talentWorkTypes(talent).length > 0 ? talentWorkTypesLabel(talent) : conditions.workTypes;
  const career = talentCareerLabel(talent);
  const education = talentEducation(talent);

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; color: #171717; font: 15px/1.6 "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; background: #fff; }
    main { width: ${PAGE_WIDTH_PX}px; padding: 36px 40px 48px; }
    header { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 8px; padding-bottom: 20px; border-bottom: 2px solid #171717; }
    .photo-frame { flex: 0 0 105px; width: 105px; height: 140px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #e5e5e5; border-radius: 12px; background: #fff; }
    .photo { max-width: 100%; max-height: 100%; object-fit: contain; }
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
      ${photoHtml(talent.photoUrl, name)}
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p class="headline">${escapeHtml(conditions.occupations || name)}</p>
        <p class="meta">${escapeHtml([name, workType, career !== '미입력' ? career : '', education !== '미입력' ? education : ''].filter(Boolean).join(' · '))}</p>
      </div>
    </header>
    ${section(
      '기본 정보',
      rows([
        ['이름', name],
        ['생년월', formatBirthDate(talent.birthDate)],
        ['성별', talent.gender],
        ['휴대폰', talent.phone],
        ['이메일', talent.email],
        ['거주 지역', talent.address],
        ['홈페이지 / SNS', talent.homepage],
      ]),
    )}
    ${section(
      '희망 근무 조건',
      rows([
        ['근무 형태', conditions.workTypes],
        ['지역', conditions.regions],
        ['직종', conditions.occupations],
        ['근무 가능', conditions.available],
        ...(talent.desiredPay?.trim() ? ([['희망 급여', talent.desiredPay]] as Array<[string, string]>) : []),
      ]),
    )}
    ${section(
      '학력 정보',
      `${rows([['최종 학력', education === '미입력' ? '' : education]])}
      ${talentSchools(talent)
        .map((item) => rows([['학교', item.school], ['전공', item.major]]))
        .join('') || rows([['학교', ''], ['전공', '']])}`,
    )}
    ${section(
      '경력 정보',
      `${rows([['경력 유무', career === '미입력' ? '' : career]])}
      <h3>경력 내역</h3>
      ${textHtml(talent.careerHistory)}`,
    )}
    ${section(
      '보유 역량',
      rows([
        ['자격증', talent.experience],
        ['어학', talent.languages],
        ['스킬', (talent.tags ?? []).map((item) => item.trim()).filter(Boolean).join(', ')],
      ]),
    )}
    ${section('자기 소개', textHtml(talent.summary))}
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

function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  if (images.length === 0) return Promise.resolve();
  return Promise.all(
    images.map(
      (image) =>
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            }),
    ),
  ).then(() => undefined);
}

async function renderResumePdf(html: string, filename: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:0;top:0;width:${PAGE_WIDTH_PX}px;height:200px;border:0;opacity:0.01;pointer-events:none;z-index:-1;`;
  document.body.appendChild(iframe);
  iframe.srcdoc = html;
  try {
    const doc = await waitForIframeDocument(iframe);
    await waitForImages(doc);
    const root = doc.querySelector('main') ?? doc.body;
    const height = Math.max(root.scrollHeight, doc.documentElement.scrollHeight, doc.body.scrollHeight, 200) + 32;
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

export async function downloadResumeFile(talent: TalentProfile, _userId?: string): Promise<void> {
  try {
    await renderResumePdf(buildResumeFileHtml(talent), resumeFileName(talentResumeTitle(talent)));
  } catch {
    window.alert('이력서 PDF를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
}
