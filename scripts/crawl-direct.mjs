/**
 * 서버 없이 Firestore에 직접 크롤링 결과를 저장합니다.
 * 사용: node scripts/crawl-direct.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const PARTS = ['TECHNOLOGY', 'DESIGN', 'BUSINESS_SERVICES', 'STAFF'];
const SOURCE_ID = 'kakao-careers';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseTypes(title) {
  const types = [];
  if (/신입/.test(title)) types.push('신입');
  if (/경력/.test(title)) types.push('경력');
  if (/인턴/.test(title)) types.push('인턴');
  if (types.length === 0) types.push('경력');
  return types;
}

async function fetchKakaoJobs() {
  const jobs = [];
  for (const part of PARTS) {
    const res = await fetch(`https://careers.kakao.com/public/api/job-list?page=0&size=100&part=${part}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'JobLink365Bot/1.0' },
    });
    if (!res.ok) throw new Error(`Kakao ${part} HTTP ${res.status}`);
    const data = await res.json();
    for (const item of data.jobList ?? []) {
      if (item.privateFlag) continue;
      jobs.push(item);
    }
  }
  return jobs;
}

async function main() {
  loadEnvLocal();
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase Admin 환경 변수가 필요합니다.');
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  const db = getFirestore();
  const crawledAt = new Date().toISOString();
  const rawJobs = await fetchKakaoJobs();
  const seen = new Set();

  for (const item of rawJobs) {
    const id = `${SOURCE_ID}-${item.realId}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const ref = db.collection('crawledJobs').doc(id);
    const existing = await ref.get();
    const createdAt = existing.exists && existing.data()?.createdAt ? existing.data().createdAt : item.regDate;

    await ref.set({
      id,
      sourceId: SOURCE_ID,
      sourceName: '카카오 채용',
      companyName: item.companyName || '카카오',
      title: item.jobOfferTitle,
      employmentTypes: parseTypes(item.jobOfferTitle),
      roles: ['IT·개발'],
      regions: ['경기'],
      companySize: '대기업',
      deadline: item.endDate ? item.endDate.slice(0, 10) : null,
      applyUrl: `https://careers.kakao.com/jobs/${item.realId}`,
      description: `${item.introduction ?? ''}${item.workContentDesc ?? ''}${item.qualification ?? ''}`,
      status: item.closeFlag || item.statusCode !== 'PROGRESS' ? 'closed' : 'active',
      crawledAt,
      createdAt: typeof createdAt === 'string' ? createdAt : crawledAt,
      closedAt: item.closeFlag ? crawledAt : null,
      updatedAt: crawledAt,
    });
  }

  const activeSnap = await db.collection('crawledJobs').where('sourceId', '==', SOURCE_ID).get();
  let closed = 0;
  for (const doc of activeSnap.docs) {
    if (doc.data().status === 'active' && !seen.has(doc.id)) {
      await doc.ref.set({ status: 'closed', closedAt: crawledAt, updatedAt: crawledAt }, { merge: true });
      closed += 1;
    }
  }

  await db.collection('crawlRuns').add({
    startedAt: crawledAt,
    finishedAt: crawledAt,
    sources: [{ sourceId: SOURCE_ID, sourceName: '카카오 채용', fetched: rawJobs.length, upserted: seen.size, closed, errors: [] }],
    totalUpserted: seen.size,
    totalClosed: closed,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`완료: 저장 ${seen.size}건, 마감 ${closed}건`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
