/**
 * 중견기업정보마당 발급정보 공개 엑셀 → data/mid-sized-companies.json
 * 사용: pnpm import:mid-sized -- path/to/download.xlsx
 * 이후: pnpm sync:mid-sized (Firestore 반영, .env.local 필요)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import XLSX from 'xlsx';

const root = process.cwd();
const outPath = resolve(root, 'data/mid-sized-companies.json');

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .trim();
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim()) return String(row[key]).trim();
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
  const companyName = pick(row, ['기업명', '회사명', 'companyName']);
  const businessNumber = pick(row, ['사업자번호', '사업자등록번호', 'businessNumber']).replace(/\s/g, '');
  const corporateNumber = pick(row, ['법인번호', '법인등록번호', 'corporateNumber']) || null;
  const certificateNo = pick(row, ['발급번호', 'certificateNo']) || null;
  const region = pick(row, ['지역', 'region']) || null;
  const industry = pick(row, ['업종', 'industry']) || null;
  const validFrom = parseDateCell(pick(row, ['유효기간시작']));
  const validTo = parseDateCell(pick(row, ['유효기간종료']));
  const validity = validFrom || validTo ? { validFrom, validTo } : parseValidity(pick(row, ['유효기간', 'validity']));

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

function main() {
  const inputArg = process.argv.find((arg) => !arg.startsWith('-') && arg.endsWith('.xlsx'));
  if (!inputArg) {
    console.error('사용법: pnpm import:mid-sized -- <엑셀파일경로>');
    console.error('중견기업정보마당 > 발급정보 공개에서 엑셀 다운로드 후 실행하세요.');
    process.exit(1);
  }

  const inputPath = resolve(root, inputArg);
  const workbook = XLSX.readFile(inputPath);
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

  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`저장: ${outPath} (${companies.length}건)`);
  console.log('Firestore 반영: pnpm sync:mid-sized');
}

main();
