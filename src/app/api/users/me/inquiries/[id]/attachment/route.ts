import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { downloadInquiryAttachment } from '@/lib/inquiry-attachment-server';
import { getStoredInquiry } from '@/lib/inquiries-server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_REQUIRED' } }, { status: 401 });
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return NextResponse.json({ ok: false, error: { code: 'AUTH_INVALID' } }, { status: 401 });
  }

  const { id } = await params;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({ ok: false, error: { code: 'STORAGE_UNAVAILABLE' } }, { status: 503 });
  }

  try {
    const item = await getStoredInquiry(id);
    if (!item || item.userId !== decoded.uid || !item.attachment) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '첨부 파일을 찾을 수 없습니다.' } },
        { status: 404 },
      );
    }

    const { buffer, contentType } = await downloadInquiryAttachment(item.attachment);
    const encodedName = encodeURIComponent(item.attachment.fileName);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'DOWNLOAD_FAILED', message: '첨부 파일을 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}
