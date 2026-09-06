const ADMIN_NOTIFY_EMAIL =
  process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
  process.env.INQUIRY_NOTIFY_EMAIL?.trim() ||
  '';

export function getAdminNotifyEmail(): string | null {
  return ADMIN_NOTIFY_EMAIL || null;
}
