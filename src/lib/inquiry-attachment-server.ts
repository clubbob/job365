import { getAdminStorageBucket } from '@/lib/firebaseAdmin';
import type { InquiryAttachment } from '@/lib/inquiry';

export const INQUIRY_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const INQUIRY_ATTACHMENT_ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
]);

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() || 'attachment';
  const sanitized = base.replace(/[^\w.\-()가-힣]/g, '_').slice(0, 120);
  return sanitized || 'attachment';
}

export function isAllowedInquiryAttachmentType(contentType: string): boolean {
  return INQUIRY_ATTACHMENT_ALLOWED_TYPES.has(contentType);
}

export async function uploadInquiryAttachment(
  inquiryId: string,
  file: { name: string; type: string; buffer: Buffer },
): Promise<InquiryAttachment> {
  const bucket = getAdminStorageBucket();
  if (!bucket) throw new Error('STORAGE_UNAVAILABLE');

  const fileName = sanitizeFileName(file.name);
  const storagePath = `inquiries/${inquiryId}/${fileName}`;
  await bucket.file(storagePath).save(file.buffer, {
    metadata: { contentType: file.type || 'application/octet-stream' },
  });

  return {
    fileName,
    storagePath,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.buffer.length,
  };
}

export async function deleteInquiryAttachment(attachment: InquiryAttachment | null): Promise<void> {
  if (!attachment) return;
  const bucket = getAdminStorageBucket();
  if (!bucket) return;

  try {
    await bucket.file(attachment.storagePath).delete({ ignoreNotFound: true });
  } catch (error) {
    console.warn('[inquiry-attachment] delete failed', attachment.storagePath, error);
  }
}

export async function downloadInquiryAttachment(
  attachment: InquiryAttachment,
): Promise<{ buffer: Buffer; contentType: string }> {
  const bucket = getAdminStorageBucket();
  if (!bucket) throw new Error('STORAGE_UNAVAILABLE');

  const [buffer] = await bucket.file(attachment.storagePath).download();
  return { buffer, contentType: attachment.contentType };
}
