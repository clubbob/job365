/**
 * 개발용 크롤링 공고 시드 스크립트
 * 사용: node scripts/seed-crawled-jobs.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

const samples = [
  {
    id: 'sample-samsung-1',
    sourceId: 'samsung-careers',
    sourceName: '삼성 채용',
    companyName: '삼성전자',
    title: '소프트웨어 엔지니어 (신입)',
    employmentTypes: ['신입'],
    roles: ['IT·개발'],
    regions: ['경기'],
    companySize: '대기업',
    deadline: '2026-12-31',
    applyUrl: 'https://www.samsungcareers.com/',
    description: '<p>삼성전자 DX부문 소프트웨어 엔지니어 신입 채용입니다.</p>',
    status: 'active',
    crawledAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    closedAt: null,
  },
];

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
  for (const job of samples) {
    await db.collection('crawledJobs').doc(job.id).set(job, { merge: true });
    console.log(`seeded ${job.id}`);
  }

  console.log('완료');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
