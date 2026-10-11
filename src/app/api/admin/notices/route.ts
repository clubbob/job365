import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { createNotice, listAllNotices, newNoticeId } from '@/lib/notices-server';

type CreateBody = {
  title?: string;
  body?: string;
  published?: boolean;
};

function parseWriteBody(body: CreateBody): { ok: true; data: { title: string; body: string; published: boolean } } | { ok: false; message: string } {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.body === 'string' ? body.body : '';
  if (!title) return { ok: false, message: '제목을 입력해 주세요.' };
  if (!content.trim()) return { ok: false, message: '내용을 입력해 주세요.' };
  return {
    ok: true,
    data: { title, body: content, published: body.published === true },
  };
}

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: { notices: [], ...firebaseAdminListFields() },
    });
  }

  try {
    const notices = await listAllNotices();
    return NextResponse.json({
      ok: true,
      data: { notices, ...firebaseAdminListFields() },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '공지 사항을 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json(
      { ok: false, error: { code: 'ADMIN_NOT_CONFIGURED', message: 'Firestore 설정이 필요합니다.' } },
      { status: 503 },
    );
  }

  let body: CreateBody = {};
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_BODY', message: '요청 형식이 올바르지 않습니다.' } },
      { status: 400 },
    );
  }

  const parsed = parseWriteBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION', message: parsed.message } },
      { status: 400 },
    );
  }

  try {
    const notice = await createNotice(newNoticeId(), parsed.data);
    return NextResponse.json({ ok: true, data: { notice } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'SAVE_FAILED', message: '공지 사항을 저장하지 못했습니다.' } },
      { status: 500 },
    );
  }
}
