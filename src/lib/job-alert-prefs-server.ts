import { parseJobBoardCompanySegments } from '@/lib/job-board/company-segment';
import {
  isEmploymentType,
  isJobRegion,
  parseJobRoles,
} from '@/lib/job-board/constants';
import { parseFirestoreTimestamp } from '@/lib/firestore-timestamp';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import {
  DEFAULT_JOB_ALERT_PREFS,
  normalizeJobAlertPrefs,
  type JobAlertPrefs,
} from '@/types/job-alert-prefs';

const COLLECTION = 'jobAlertPrefs';

export function parseJobAlertPrefs(uid: string, data: Record<string, unknown> | undefined): JobAlertPrefs {
  const employmentTypes = Array.isArray(data?.employmentTypes)
    ? data.employmentTypes.filter((v): v is JobAlertPrefs['employmentTypes'][number] =>
        typeof v === 'string' && isEmploymentType(v),
      )
    : DEFAULT_JOB_ALERT_PREFS.employmentTypes;

  const companySegments = Array.isArray(data?.companySegments)
    ? parseJobBoardCompanySegments(data.companySegments)
    : DEFAULT_JOB_ALERT_PREFS.companySegments;

  const roles = Array.isArray(data?.roles) ? parseJobRoles(data.roles) : DEFAULT_JOB_ALERT_PREFS.roles;

  const regions = Array.isArray(data?.regions)
    ? data.regions.filter((v): v is JobAlertPrefs['regions'][number] =>
        typeof v === 'string' && isJobRegion(v),
      )
    : DEFAULT_JOB_ALERT_PREFS.regions;

  const updatedAt = parseFirestoreTimestamp(data?.updatedAt);

  return normalizeJobAlertPrefs({
    userId: uid,
    emailEnabled:
      typeof data?.emailEnabled === 'boolean' ? data.emailEnabled : DEFAULT_JOB_ALERT_PREFS.emailEnabled,
    employmentTypes,
    companySegments,
    roles,
    regions,
    updatedAt,
  });
}

export async function getJobAlertPrefs(uid: string): Promise<JobAlertPrefs> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).doc(uid).get();
  if (!snap.exists) {
    return normalizeJobAlertPrefs({ userId: uid, ...DEFAULT_JOB_ALERT_PREFS, updatedAt: null });
  }

  return parseJobAlertPrefs(uid, snap.data() as Record<string, unknown>);
}

export type UpdateJobAlertPrefsInput = {
  emailEnabled?: boolean;
  employmentTypes?: JobAlertPrefs['employmentTypes'];
  companySegments?: JobAlertPrefs['companySegments'];
  roles?: JobAlertPrefs['roles'];
  regions?: JobAlertPrefs['regions'];
};

export async function updateJobAlertPrefs(
  uid: string,
  input: UpdateJobAlertPrefsInput,
): Promise<JobAlertPrefs> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const ref = db.collection(COLLECTION).doc(uid);
  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> = {
    userId: uid,
    updatedAt: nowIso,
  };

  if (input.emailEnabled !== undefined) updates.emailEnabled = input.emailEnabled;
  if (input.employmentTypes !== undefined) updates.employmentTypes = input.employmentTypes;
  if (input.companySegments !== undefined) updates.companySegments = input.companySegments;
  if (input.roles !== undefined) updates.roles = input.roles;
  if (input.regions !== undefined) updates.regions = input.regions;

  await ref.set(updates, { merge: true });
  return getJobAlertPrefs(uid);
}
