/**
 * 서버 없이 Firestore 수신자에게 채용 공고 이메일을 직접 발송합니다.
 * 사용: pnpm job-alerts:direct
 * 옵션: --dry-run (발송 없이 수신자·공고만 확인)
 *       --email=주소 (특정 이메일만 발송)
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

const JOB_LIST_PAGE_SIZE = 10;
const SERVICE_NAME = 'JobLink 365';

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

function getKoreaDateLocalToday() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function hasFilterPrefs(prefs) {
  return (
    prefs.employmentTypes.length > 0 ||
    prefs.roles.length > 0 ||
    prefs.regions.length > 0
  );
}

function overlaps(selected, values) {
  if (selected.length === 0) return true;
  return selected.some((item) => values.includes(item));
}

function jobMatchesPrefs(job, prefs) {
  if (job.status !== 'active') return false;
  if (!hasFilterPrefs(prefs)) return true;
  return (
    overlaps(prefs.employmentTypes, job.employmentTypes) &&
    overlaps(prefs.roles, job.roles) &&
    overlaps(prefs.regions, job.regions)
  );
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDigestHtml({ nickname, jobs, myJobsUrl, hasFilterPrefs: hasPrefs }) {
  const rows = jobs.length
    ? jobs
        .map(
          (job) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            <div style="font-size:14px;font-weight:700;color:#111;">${escapeHtml(job.title)}</div>
            <div style="font-size:13px;color:#555;margin-top:4px;">${escapeHtml(job.companyName)} · ${escapeHtml(job.sourceName)}</div>
            <a href="${escapeHtml(job.applyUrl)}" style="display:inline-block;margin-top:8px;font-size:13px;color:#2563eb;text-decoration:none;">지원하기</a>
          </td>
        </tr>`,
        )
        .join('')
    : `<tr><td style="padding:16px 0;font-size:14px;color:#555;">조건에 맞는 새 공고가 없습니다. 사이트에서 전체 공고를 확인해 주세요.</td></tr>`;

  const intro = hasPrefs ? '조건에 맞는 공고를' : '최근 채용 공고를';

  return `<!doctype html>
<html lang="ko"><body style="margin:0;background:#f6f7f9;font-family:Pretendard,Apple SD Gothic Neo,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111;">오늘의 채용 공고</p>
      <p style="margin:0 0 20px;font-size:14px;color:#555;">${escapeHtml(nickname)}님, ${SERVICE_NAME}에서 ${intro} 보내 드립니다.</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${escapeHtml(myJobsUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:10px;">맞춤 채용 공고 더보기</a>
      </div>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#888;text-align:center;">본 메일은 ${SERVICE_NAME} 맞춤 채용 설정에 따라 발송됩니다.</p>
  </div>
</body></html>`;
}

function readEnv(primary, legacy) {
  const value = process.env[primary]?.trim();
  if (value) return value;
  if (legacy) return process.env[legacy]?.trim();
  return undefined;
}

function createTransporter() {
  const host = readEnv('SMTP_HOST', 'NAVER_SMTP_HOST') ?? 'smtp.gmail.com';
  const user = readEnv('SMTP_USER', 'NAVER_SMTP_USER');
  const pass = readEnv('SMTP_PASS', 'NAVER_SMTP_PASS');
  if (!user || !pass) {
    throw new Error('SMTP_USER 또는 SMTP_PASS가 .env.local에 없습니다.');
  }
  let loginUser = user;
  if (!loginUser.includes('@') && host.includes('naver.com')) {
    loginUser = `${loginUser}@naver.com`;
  }
  return nodemailer.createTransport({
    host,
    port: Number(readEnv('SMTP_PORT', 'NAVER_SMTP_PORT') ?? 587),
    secure: String(readEnv('SMTP_SECURE', 'NAVER_SMTP_SECURE') ?? 'false') === 'true',
    auth: { user: loginUser, pass },
  });
}

function parseJobDoc(id, data) {
  if (!data || data.status === 'closed') return null;
  const companyName = typeof data.companyName === 'string' ? data.companyName : '';
  const title = typeof data.title === 'string' ? data.title : '';
  const applyUrl = typeof data.applyUrl === 'string' ? data.applyUrl : '';
  const sourceName = typeof data.sourceName === 'string' ? data.sourceName : '';
  const companySize = typeof data.companySize === 'string' ? data.companySize : '';
  if (!companyName || !title || !applyUrl) return null;
  return {
    id,
    status: 'active',
    companyName,
    title,
    applyUrl,
    sourceName,
    companySize,
    employmentTypes: Array.isArray(data.employmentTypes) ? data.employmentTypes : [],
    roles: Array.isArray(data.roles) ? data.roles : [],
    regions: Array.isArray(data.regions) ? data.regions : [],
  };
}

async function main() {
  loadEnvLocal();

  const dryRun = process.argv.includes('--dry-run');
  const emailArg = process.argv.find((arg) => arg.startsWith('--email='));
  const onlyEmail = emailArg ? emailArg.slice('--email='.length).trim().toLowerCase() : '';

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    console.error('Firebase Admin 환경 변수가 필요합니다.');
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  const db = getFirestore();
  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const myJobsUrl = `${siteUrl}/my-jobs`;
  const todayDate = getKoreaDateLocalToday();

  const [prefsSnap, jobsSnap] = await Promise.all([
    db.collection('jobAlertPrefs').where('emailEnabled', '==', true).get(),
    db.collection('crawledJobs').get(),
  ]);

  const allJobs = jobsSnap.docs
    .map((doc) => parseJobDoc(doc.id, doc.data()))
    .filter(Boolean);

  const recipients = [];
  for (const doc of prefsSnap.docs) {
    const prefsData = doc.data();
    const userId = doc.id;
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) continue;
    const user = userSnap.data() ?? {};
    if (user.status === 'suspended' || user.status === 'deleted') continue;
    const email = typeof user.email === 'string' ? user.email.trim() : '';
    if (!email) continue;
    if (onlyEmail && email.toLowerCase() !== onlyEmail) continue;

    const prefs = {
      employmentTypes: Array.isArray(prefsData.employmentTypes) ? prefsData.employmentTypes : [],
      roles: Array.isArray(prefsData.roles) ? prefsData.roles : [],
      regions: Array.isArray(prefsData.regions) ? prefsData.regions : [],
    };

    recipients.push({
      userId,
      email,
      nickname: typeof user.nickname === 'string' && user.nickname.trim() ? user.nickname.trim() : '회원',
      prefs,
    });
  }

  console.log(`수신 설정 ON 회원: ${recipients.length}명, 활성 공고: ${allJobs.length}건`);

  if (recipients.length === 0) {
    console.log('발송 대상이 없습니다.');
    return;
  }

  if (dryRun) {
    for (const recipient of recipients) {
      const matched = allJobs.filter((job) => jobMatchesPrefs(job, recipient.prefs)).slice(0, JOB_LIST_PAGE_SIZE);
      const filterNote = hasFilterPrefs(recipient.prefs) ? '조건 있음' : '조건 없음(전체)';
      console.log(`- ${recipient.email} (${recipient.nickname}): ${matched.length}건 [${filterNote}]`);
      if (hasFilterPrefs(recipient.prefs)) {
        console.log(`  조건: ${JSON.stringify(recipient.prefs)}`);
      }
    }
    return;
  }

  const transporter = createTransporter();
  const from = readEnv('SMTP_FROM', 'NAVER_SMTP_FROM') || readEnv('SMTP_USER', 'NAVER_SMTP_USER');

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const matched = allJobs.filter((job) => jobMatchesPrefs(job, recipient.prefs)).slice(0, JOB_LIST_PAGE_SIZE);
    const subject = matched.length
      ? `[${SERVICE_NAME}] 오늘의 채용 공고 ${matched.length}건`
      : `[${SERVICE_NAME}] 오늘의 채용 공고 안내`;
    const text = matched.length
      ? matched.map((job) => `${job.companyName} - ${job.title}`).join('\n')
      : '조건에 맞는 새 공고가 없습니다.';
    const html = buildDigestHtml({
      nickname: recipient.nickname,
      jobs: matched,
      myJobsUrl,
      hasFilterPrefs: hasFilterPrefs(recipient.prefs),
    });

    try {
      await transporter.sendMail({
        from,
        to: recipient.email,
        subject,
        text: `${text}\n\n맞춤 채용 공고 더보기: ${myJobsUrl}`,
        html,
      });
      sent += 1;
      await db.collection('emailDigests').add({
        userId: recipient.userId,
        email: recipient.email,
        jobCount: matched.length,
        todayDate,
        status: 'sent',
        createdAt: FieldValue.serverTimestamp(),
      });
      console.log(`발송 완료: ${recipient.email} (${matched.length}건)`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : '이메일 발송 실패';
      await db.collection('emailDigests').add({
        userId: recipient.userId,
        email: recipient.email,
        jobCount: matched.length,
        todayDate,
        status: 'failed',
        error: message,
        createdAt: FieldValue.serverTimestamp(),
      });
      console.error(`발송 실패: ${recipient.email} — ${message}`);
    }
  }

  console.log(JSON.stringify({ sent, failed, todayDate }, null, 2));
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
