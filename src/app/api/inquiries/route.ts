import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/auth-server';
import { isFirebaseAdminReady } from '@/lib/firebaseAdmin';
import { createStoredInquiry } from '@/lib/inquiries-server';
import {
  deleteInquiryAttachment,
  INQUIRY_ATTACHMENT_MAX_BYTES,
  isAllowedInquiryAttachmentType,
  uploadInquiryAttachment,
} from '@/lib/inquiry-attachment-server';
import { notifyAdminNewInquiry } from '@/lib/inquiry-email-server';
import type { Inquiry } from '@/lib/inquiry';
import { isValidEmail } from '@/lib/talent-contact';
import { getUserAccount } from '@/lib/users-server';

const TITLE_MAX = 100;
const MESSAGE_MAX = 2000;
const ID_MAX = 120;

function trimText(value: FormDataEntryValue | null | undefined, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json(
      { ok: false, error: { code: 'AUTH_REQUIRED', message: '로그인 후 문의해 주세요.' } },
      { status: 401 },
    );
  }

  const decoded = await verifyIdToken(token);
  if (!decoded) {
    return NextResponse.json(
      { ok: false, error: { code: 'AUTH_INVALID', message: '로그인 정보를 확인할 수 없습니다.' } },
      { status: 401 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_BODY', message: '문의 내용이 올바르지 않습니다.' } },
      { status: 400 },
    );
  }

  const id = trimText(formData.get('id'), ID_MAX);
  const title = trimText(formData.get('title'), TITLE_MAX);
  const message = trimText(formData.get('message'), MESSAGE_MAX);
  const attachmentEntry = formData.get('attachment');

  if (!title) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_TITLE', message: '제목을 입력해 주세요.' } },
      { status: 400 },
    );
  }
  if (!message) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_MESSAGE', message: '내용을 입력해 주세요.' } },
      { status: 400 },
    );
  }
  if (!id) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_ID', message: '문의를 저장하지 못했습니다.' } },
      { status: 400 },
    );
  }

  const account = await getUserAccount(decoded.uid);
  const name = account?.profile.nickname.trim() || '사용자';
  const email = account?.profile.email?.trim() || decoded.email?.trim() || '';
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_EMAIL', message: '회원 이메일을 확인할 수 없습니다.' } },
      { status: 400 },
    );
  }

  const hasAttachment = attachmentEntry instanceof File && attachmentEntry.size > 0;
  if (hasAttachment && !isFirebaseAdminReady()) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'ATTACHMENT_UNAVAILABLE', message: '첨부 파일은 현재 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.' },
      },
      { status: 503 },
    );
  }

  if (hasAttachment && attachmentEntry instanceof File) {
    if (attachmentEntry.size > INQUIRY_ATTACHMENT_MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: { code: 'ATTACHMENT_TOO_LARGE', message: '첨부 파일은 10MB 이하만 등록할 수 있습니다.' } },
        { status: 400 },
      );
    }
    if (!isAllowedInquiryAttachmentType(attachmentEntry.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: 'ATTACHMENT_TYPE', message: '지원하지 않는 파일 형식입니다. PDF, 이미지, 문서 파일을 등록해 주세요.' },
        },
        { status: 400 },
      );
    }
  }

  let attachment = null;
  const inquiry: Inquiry = {
    id,
    userId: decoded.uid,
    name,
    email,
    title,
    message,
    attachment: null,
    reply: null,
    createdAt: new Date().toISOString(),
  };

  if (!isFirebaseAdminReady()) {
    await notifyAdminNewInquiry(inquiry);
    return NextResponse.json({
      ok: true,
      data: { inquiry, firebaseReady: false },
    });
  }

  try {
    if (hasAttachment && attachmentEntry instanceof File) {
      const buffer = Buffer.from(await attachmentEntry.arrayBuffer());
      attachment = await uploadInquiryAttachment(id, {
        name: attachmentEntry.name,
        type: attachmentEntry.type,
        buffer,
      });
      inquiry.attachment = attachment;
    }

    const saved = await createStoredInquiry(inquiry);
    await notifyAdminNewInquiry(saved);
    return NextResponse.json({ ok: true, data: { inquiry: saved, firebaseReady: true } });
  } catch {
    await deleteInquiryAttachment(attachment);
    return NextResponse.json(
      { ok: false, error: { code: 'SAVE_FAILED', message: '문의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' } },
      { status: 500 },
    );
  }
}
