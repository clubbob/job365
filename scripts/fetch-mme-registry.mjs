/**
 * 중견기업정보마당 발급정보 공개 엑셀 자동 다운로드 → data/mid-sized-companies.json
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import XLSX from 'xlsx';

const root = process.cwd();
const outPath = resolve(root, 'data/mid-sized-companies.json');
const MME_URL = 'https://www.mme.or.kr/PGPC0010.do';

function normalizeHeader(value) {
  return String(value ?? '').replace(/\s+/g, '').trim();
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim()) return String(row[key]).trim();
  }
  for (const [key, value] of Object.entries(row)) {
    if (keys.some((part) => key.includes(part)) && value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function parseDateCell(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const match = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseValidity(validityText) {
  const text = String(validityText ?? '').trim();
  if (!text) return { validFrom: null, validTo: null };
  const parts = text.split(/~\s*/);
  return {
    validFrom: parseDateCell(parts[0]),
    validTo: parseDateCell(parts[1] ?? parts[0]),
  };
}

function mapRow(row) {
  const companyName = pick(row, ['기업명', '회사명']);
  const businessNumber = pick(row, ['사업자번호', '사업자등록번호']).replace(/\s/g, '');
  const corporateNumber = pick(row, ['법인번호', '법인등록번호']) || null;
  const certificateNo = pick(row, ['발급번호']) || null;
  const region = pick(row, ['지역']) || null;
  const industry = pick(row, ['업종']) || null;
  const validFrom = parseDateCell(pick(row, ['유효기간시작', '유효기간from']));
  const validTo = parseDateCell(pick(row, ['유효기간종료', '유효기간to']));
  const validity = validFrom || validTo ? { validFrom, validTo } : parseValidity(pick(row, ['유효기간']));

  if (!companyName || !businessNumber) return null;

  return {
    companyName,
    businessNumber,
    corporateNumber,
    certificateNo,
    validFrom: validity.validFrom,
    validTo: validity.validTo,
    region,
    industry,
  };
}

async function downloadExcel() {
  const body = new URLSearchParams({
    df_method_nm: 'excelRsolver',
    df_pmenu_no: '7',
    df_menu_no: '6',
    df_curr_page: '1',
    df_row_per_page: '10',
    search_year: '0',
    search_cp: 'BIZRNO',
    search_input: '',
  });

  const res = await fetch(MME_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (compatible; JobLink365/1.0; +https://joblink365.com)',
      Accept: '*/*',
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`엑셀 다운로드 실패: HTTP ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1000) {
    throw new Error('엑셀 파일이 비어 있거나 HTML 오류 응답입니다.');
  }
  return buffer;
}

async function main() {
  console.log('중견기업정보마당 엑셀 다운로드 중…');
  const buffer = await downloadExcel();
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const companies = [];
  for (const raw of rows) {
    const normalized = {};
    for (const [key, value] of Object.entries(raw)) {
      normalized[normalizeHeader(key)] = value;
    }
    const record = mapRow(normalized);
    if (record) companies.push(record);
  }

  const payload = {
    version: 1,
    source: 'mme',
    sourceNote: '중견기업정보마당 발급정보 공개',
    importedAt: new Date().toISOString(),
    companies,
  };

  writeFileSync(outPath, `${JSON.stringify(payload)}\n`, 'utf8');
  console.log(`저장: ${outPath} (${companies.length}건)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
