import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { closeCrawledJobById, getCrawledJobForAdmin } from '@/lib/crawled-jobs-server';
import { isDisplayDisabled } from '@/lib/crawl-source-policy-server';
import { isCompanyDisplayDisabled } from '@/lib/crawl-company-policy-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json(
      { ok: false, error: { code: 'FIRESTORE_UNAVAILABLE', message: 'Firestore를 사용할 수 없습니다.' } },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const jobId = id.trim();
  if (!jobId) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_INPUT', message: '공고 ID가 필요합니다.' } },
      { status: 400 },
    );
  }

  try {
    const job = await getCrawledJobForAdmin(jobId);
    if (!job) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '공고를 찾지 못했습니다.' } },
        { status: 404 },
      );
    }

    const sourceDisplayDisabled = await isDisplayDisabled(job.sourceId);
    const companyDisplayDisabled = await isCompanyDisplayDisabled(job.sourceId, job.companyName);

    return NextResponse.json({
      ok: true,
      data: {
        job,
        displayHidden: sourceDisplayDisabled || companyDisplayDisabled,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'GET_FAILED', message: '공고를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json(
      { ok: false, error: { code: 'FIRESTORE_UNAVAILABLE', message: 'Firestore를 사용할 수 없습니다.' } },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const jobId = id.trim();
  if (!jobId) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_INPUT', message: '공고 ID가 필요합니다.' } },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as { status?: string };
    if (body.status !== 'closed') {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: '지원하지 않는 상태 변경입니다.' } },
        { status: 400 },
      );
    }

    const closed = await closeCrawledJobById(jobId);
    if (!closed) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '공고를 찾지 못했습니다.' } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: { id: jobId, status: 'closed' } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'UPDATE_FAILED', message: '마감 처리하지 못했습니다.' } },
      { status: 500 },
    );
  }
}
