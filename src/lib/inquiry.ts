export type InquiryAttachment = {
  fileName: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
};

export type InquiryReply = {
  message: string;
  repliedAt: string;
};

export type Inquiry = {
  id: string;
  userId: string;
  name: string;
  email: string;
  title: string;
  message: string;
  attachment: InquiryAttachment | null;
  reply: InquiryReply | null;
  createdAt: string;
};

export function parseInquiryReply(value: unknown): InquiryReply | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as InquiryReply;
  if (typeof item.message !== 'string' || typeof item.repliedAt !== 'string') return null;
  return { message: item.message, repliedAt: item.repliedAt };
}

export function parseInquiryAttachment(value: unknown): InquiryAttachment | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as InquiryAttachment;
  if (
    typeof item.fileName !== 'string' ||
    typeof item.storagePath !== 'string' ||
    typeof item.contentType !== 'string' ||
    typeof item.sizeBytes !== 'number'
  ) {
    return null;
  }
  return item;
}

export function normalizeInquiry(value: unknown): Inquiry | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<Inquiry> & { id?: string };
  if (
    typeof item.id !== 'string' ||
    typeof item.userId !== 'string' ||
    typeof item.name !== 'string' ||
    typeof item.email !== 'string' ||
    typeof item.message !== 'string' ||
    typeof item.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    id: item.id,
    userId: item.userId,
    name: item.name,
    email: item.email,
    title: typeof item.title === 'string' ? item.title : '',
    message: item.message,
    attachment: parseInquiryAttachment(item.attachment),
    reply: parseInquiryReply(item.reply),
    createdAt: item.createdAt,
  };
}

export function isInquiry(value: unknown): value is Inquiry {
  return normalizeInquiry(value) !== null;
}
