import { getKoreaDateLocalToday } from '@/lib/datetime';
import { listCrawledJobs } from '@/lib/crawled-jobs-server';
import { hasJobAlertFilterPrefs, jobMatchesAlertPrefs } from '@/lib/job-board/match';
import { JOB_LIST_PAGE_SIZE } from '@/lib/job-board/constants';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { sendEmail, isEmailServiceConfigured } from '@/lib/smtp';
import { SITE_URL } from '@/lib/site';
import { MATCHED_JOBS_MORE_LINK_LABEL, MATCHED_JOBS_SETTINGS_TITLE } from '@/lib/site-menu-copy';
import { COMPANY } from '@/lib/company';
import type { JobAlertPrefs } from '@/types/job-alert-prefs';
import { saveEmailDigestLog } from '@/lib/email-digests-server';

type DigestRecipient = {
  userId: string;
  email: string;
  nickname: string;
  prefs: JobAlertPrefs;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDigestHtml(params: {
  nickname: string;
  jobs: Array<{ title: string; companyName: string; applyUrl: string; sourceName: string }>;
  myJobsUrl: string;
  alertSettingsUrl: string;
  hasFilterPrefs: boolean;
}): string {
  const rows = params.jobs.length
    ? params.jobs
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

  return `<!doctype html>
<html lang="ko"><body style="margin:0;background:#f6f7f9;font-family:Pretendard,Apple SD Gothic Neo,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111;">오늘의 채용 공고</p>
      <p style="margin:0 0 20px;font-size:14px;color:#555;">${escapeHtml(params.nickname)}님, ${COMPANY.serviceName}에서 ${params.hasFilterPrefs ? '조건에 맞는 공고를' : '최근 채용 공고를'} 보내 드립니다.</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${escapeHtml(params.myJobsUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:10px;">${escapeHtml(MATCHED_JOBS_MORE_LINK_LABEL)}</a>
      </div>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#888;text-align:center;line-height:1.5;">
      본 메일은 ${COMPANY.serviceName} ${escapeHtml(MATCHED_JOBS_SETTINGS_TITLE)}에서 &quot;채용 공고 이메일 받기&quot;를 선택한 회원에게 발송됩니다.<br />
      <a href="${escapeHtml(params.alertSettingsUrl)}" style="color:#2563eb;text-decoration:underline;">이메일 수신 끄기·맞춤 조건 변경</a>
    </p>
  </div>
</body></html>`;
}

async function listDigestRecipients(): Promise<DigestRecipient[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const prefsSnap = await db.collection('jobAlertPrefs').where('emailEnabled', '==', true).get();
  const recipients: DigestRecipient[] = [];

  for (const doc of prefsSnap.docs) {
    const prefsData = doc.data();
    const userId = doc.id;
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) continue;

    const user = userSnap.data() ?? {};
    if (user.status === 'suspended' || user.status === 'deleted') continue;

    const email = typeof user.email === 'string' ? user.email.trim() : '';
    if (!email) continue;

    const nickname =
      typeof user.nickname === 'string' && user.nickname.trim() ? user.nickname.trim() : '회원';

    recipients.push({
      userId,
      email,
      nickname,
      prefs: {
        userId,
        emailEnabled: true,
        employmentTypes: Array.isArray(prefsData.employmentTypes) ? prefsData.employmentTypes : [],
        roles: Array.isArray(prefsData.roles) ? prefsData.roles : [],
        regions: Array.isArray(prefsData.regions) ? prefsData.regions : [],
        updatedAt: null,
      },
    });
  }

  return recipients;
}

export type JobAlertEmailRunSummary = {
  sent: number;
  skipped: number;
  failed: number;
  todayDate: string;
};

export async function sendDailyJobAlertEmails(): Promise<JobAlertEmailRunSummary> {
  const todayDate = getKoreaDateLocalToday();
  const myJobsUrl = `${SITE_URL}/my-jobs`;
  const alertSettingsUrl = `${SITE_URL}/mypage?tab=alerts`;

  if (!isEmailServiceConfigured()) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  const [recipients, allJobs] = await Promise.all([listDigestRecipients(), listCrawledJobs()]);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const matched = allJobs
      .filter((job) => jobMatchesAlertPrefs(job, recipient.prefs))
      .slice(0, JOB_LIST_PAGE_SIZE);

    const subject = matched.length
      ? `[${COMPANY.serviceName}] 오늘의 채용 공고 ${matched.length}건`
      : `[${COMPANY.serviceName}] 오늘의 채용 공고 안내`;

    const text = matched.length
      ? matched.map((job) => `${job.companyName} - ${job.title}`).join('\n')
      : '조건에 맞는 새 공고가 없습니다.';

    const html = buildDigestHtml({
      nickname: recipient.nickname,
      jobs: matched.map((job) => ({
        title: job.title,
        companyName: job.companyName,
        applyUrl: job.applyUrl,
        sourceName: job.sourceName,
      })),
      myJobsUrl,
      alertSettingsUrl,
      hasFilterPrefs: hasJobAlertFilterPrefs(recipient.prefs),
    });

    const result = await sendEmail({
      to: recipient.email,
      subject,
      text: `${text}\n\n${MATCHED_JOBS_MORE_LINK_LABEL}: ${myJobsUrl}\n이메일 수신 끄기·맞춤 조건 변경: ${alertSettingsUrl}`,
      html,
    });

    if (result.success) {
      sent += 1;
      await saveEmailDigestLog({
        userId: recipient.userId,
        email: recipient.email,
        jobCount: matched.length,
        todayDate,
        status: 'sent',
      });
    } else {
      failed += 1;
      await saveEmailDigestLog({
        userId: recipient.userId,
        email: recipient.email,
        jobCount: matched.length,
        todayDate,
        status: 'failed',
        error: result.message,
      });
    }
  }

  return { sent, skipped, failed, todayDate };
}
