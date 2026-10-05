import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import {
  getJobAlertPrefs,
  updateJobAlertPrefs,
  type UpdateJobAlertPrefsInput,
} from '@/lib/job-alert-prefs-server';
import {
  isCompanySize,
  isEmploymentType,
  isJobRegion,
  isJobRole,
} from '@/lib/job-board/constants';

async function requireUser(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { error: NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 }) };
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return { error: NextResponse.json({ ok: false, error: { code: 'AUTH_INVALID' } }, { status: 401 }) };
  }

  return { uid: decoded.uid };
}

function parsePatch(body: Record<string, unknown>): UpdateJobAlertPrefsInput | null {
  const patch: UpdateJobAlertPrefsInput = {};

  if (body.emailEnabled !== undefined) {
    if (typeof body.emailEnabled !== 'boolean') return null;
    patch.emailEnabled = body.emailEnabled;
  }

  if (body.employmentTypes !== undefined) {
    if (!Array.isArray(body.employmentTypes)) return null;
    patch.employmentTypes = body.employmentTypes.filter(isEmploymentType);
  }

  if (body.roles !== undefined) {
    if (!Array.isArray(body.roles)) return null;
    patch.roles = body.roles.filter(isJobRole);
  }

  if (body.regions !== undefined) {
    if (!Array.isArray(body.regions)) return null;
    patch.regions = body.regions.filter(isJobRegion);
  }

  if (body.companySizes !== undefined) {
    if (!Array.isArray(body.companySizes)) return null;
    patch.companySizes = body.companySizes.filter(isCompanySize);
  }

  return patch;
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const prefs = await getJobAlertPrefs(auth.uid);
    return NextResponse.json({ ok: true, data: { prefs } });
  } catch (error) {
    console.error('[job-alert-prefs] get failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'GET_FAILED', message: '수신 설정을 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch = parsePatch(body);
    if (!patch) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_BODY', message: '요청 형식이 올바르지 않습니다.' } },
        { status: 400 },
      );
    }

    const prefs = await updateJobAlertPrefs(auth.uid, patch);
    return NextResponse.json({ ok: true, data: { prefs } });
  } catch (error) {
    console.error('[job-alert-prefs] update failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'UPDATE_FAILED', message: '수신 설정을 저장하지 못했습니다.' } },
      { status: 500 },
    );
  }
}
