/**
 * crawledJobs·jobAlertPrefs의 직무 표기 → IT·AI·프로그래밍
 * 사용: node scripts/migrate-job-role-it-programming.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const FROM = new Set(['IT·개발', 'IT. 개발', 'IT, 프로그래밍', 'IT, AI, 프로그래밍']);
const TO = 'IT·AI·프로그래밍';

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

function migrateRoles(roles) {
  if (!Array.isArray(roles)) return null;
  let changed = false;
  const next = roles.map((item) => {
    if (typeof item !== 'string') return item;
    if (FROM.has(item)) {
      changed = true;
      return TO;
    }
    return item;
  });
  const deduped = [...new Set(next)];
  if (deduped.length !== next.length) changed = true;
  return changed ? deduped : null;
}

loadEnvLocal();

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
let jobsUpdated = 0;
let prefsUpdated = 0;

const jobsSnap = await db.collection('crawledJobs').get();
for (const doc of jobsSnap.docs) {
  const data = doc.data();
  const nextRoles = migrateRoles(data.roles);
  if (!nextRoles) continue;
  await doc.ref.update({ roles: nextRoles });
  jobsUpdated += 1;
}

const prefsSnap = await db.collection('jobAlertPrefs').get();
for (const doc of prefsSnap.docs) {
  const data = doc.data();
  const nextRoles = migrateRoles(data.roles);
  if (!nextRoles) continue;
  await doc.ref.update({ roles: nextRoles });
  prefsUpdated += 1;
}

console.log(`crawledJobs updated: ${jobsUpdated}`);
console.log(`jobAlertPrefs updated: ${prefsUpdated}`);
