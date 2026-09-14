export type Inquiry = {
  id: string;
  userId: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

export function isInquiry(value: unknown): value is Inquiry {
  if (!value || typeof value !== 'object') return false;
  const item = value as Inquiry;
  return (
    typeof item.id === 'string' &&
    typeof item.userId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.email === 'string' &&
    typeof item.message === 'string' &&
    typeof item.createdAt === 'string'
  );
}
