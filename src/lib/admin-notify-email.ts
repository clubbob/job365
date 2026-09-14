import { COMPANY } from '@/lib/company';

const ADMIN_NOTIFY_EMAIL =
  process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
  process.env.INQUIRY_NOTIFY_EMAIL?.trim() ||
  COMPANY.email;

export function getAdminNotifyEmail(): string | null {
  return ADMIN_NOTIFY_EMAIL || null;
}
