export function firebaseAdminUnavailableText(message?: string | null) {
  return (
    message?.trim() ||
    '운영 서버에 Firebase Admin 설정이 없어 목록을 불러올 수 없습니다. Vercel Production 환경 변수를 확인해 주세요.'
  );
}

export async function adminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  return res.json() as Promise<T>;
}

export const adminActionClassName =
  'inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold sm:text-sm';
export const adminPrimaryActionClassName = `${adminActionClassName} bg-primary text-white hover:bg-primary-hover`;
export const adminSecondaryActionClassName = `${adminActionClassName} border border-border-strong bg-surface text-foreground transition-colors hover:border-primary hover:bg-neutral-50`;
export const adminDangerActionClassName = `${adminActionClassName} border border-danger/30 text-danger transition-colors hover:border-danger hover:bg-red-50`;
