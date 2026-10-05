import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { addJobBookmark, listBookmarkedJobs, removeJobBookmark } from '@/lib/job-bookmarks-server';
import { JOB_LIST_PAGE_SIZE } from '@/lib/job-board/constants';

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

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') ?? JOB_LIST_PAGE_SIZE) || JOB_LIST_PAGE_SIZE));

  try {
    const all = await listBookmarkedJobs(auth.uid, 200);
    const items = all.slice(0, page * pageSize);
    return NextResponse.json({
      ok: true,
      data: {
        items,
        total: all.length,
        page,
        pageSize,
        hasMore: items.length < all.length,
      },
    });
  } catch (error) {
    console.error('[bookmarks] list failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'LIST_FAILED', message: '찜한 공고를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  try {
    const body = (await request.json()) as { jobId?: string };
    const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';
    if (!jobId) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_BODY', message: '공고 ID가 필요합니다.' } },
        { status: 400 },
      );
    }

    await addJobBookmark(auth.uid, jobId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '찜하기에 실패했습니다.';
    const status = message === 'NOT_FOUND' ? 404 : 500;
    return NextResponse.json({ ok: false, error: { code: 'BOOKMARK_FAILED', message } }, { status });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request);
  if ('error' in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId')?.trim() ?? '';

  if (!jobId) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_BODY', message: '공고 ID가 필요합니다.' } },
      { status: 400 },
    );
  }

  try {
    await removeJobBookmark(auth.uid, jobId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[bookmarks] delete failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'BOOKMARK_FAILED', message: '찜 해제에 실패했습니다.' } },
      { status: 500 },
    );
  }
}
