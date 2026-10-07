import {
  isEmploymentType,
  isJobRegion,
  isJobRole,
} from '@/lib/job-board/constants';
import { parseFirestoreTimestamp } from '@/lib/firestore-timestamp';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { DEFAULT_JOB_ALERT_PREFS, type JobAlertPrefs } from '@/types/job-alert-prefs';

const COLLECTION = 'jobAlertPrefs';

export function parseJobAlertPrefs(uid: string, data: Record<string, unknown> | undefined): JobAlertPrefs {
  const employmentTypes = Array.isArray(data?.employmentTypes)
    ? data.employmentTypes.filter((v): v is JobAlertPrefs['employmentTypes'][number] =>
        typeof v === 'string' && isEmploymentType(v),
      )
    : DEFAULT_JOB_ALERT_PREFS.employmentTypes;

  const roles = Array.isArray(data?.roles)
    ? data.roles.filter((v): v is JobAlertPrefs['roles'][number] =>
        typeof v === 'string' && isJobRole(v),
      )
    : DEFAULT_JOB_ALERT_PREFS.roles;

  const regions = Array.isArray(data?.regions)
    ? data.regions.filter((v): v is JobAlertPrefs['regions'][number] =>
        typeof v === 'string' && isJobRegion(v),
      )
    : DEFAULT_JOB_ALERT_PREFS.regions;

  const updatedAt = parseFirestoreTimestamp(data?.updatedAt);

  return {
    userId: uid,
    emailEnabled:
      typeof data?.emailEnabled === 'boolean' ? data.emailEnabled : DEFAULT_JOB_ALERT_PREFS.emailEnabled,
    employmentTypes,
    roles,
    regions,
    updatedAt,
  };
}

export async function getJobAlertPrefs(uid: string): Promise<JobAlertPrefs> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const snap = await db.collection(COLLECTION).doc(uid).get();
  if (!snap.exists) {
    return { userId: uid, ...DEFAULT_JOB_ALERT_PREFS, updatedAt: null };
  }

  return parseJobAlertPrefs(uid, snap.data() as Record<string, unknown>);
}

export type UpdateJobAlertPrefsInput = {
  emailEnabled?: boolean;
  employmentTypes?: JobAlertPrefs['employmentTypes'];
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
  if (input.roles !== undefined) updates.roles = input.roles;
  if (input.regions !== undefined) updates.regions = input.regions;

  await ref.set(updates, { merge: true });
  return getJobAlertPrefs(uid);
}
