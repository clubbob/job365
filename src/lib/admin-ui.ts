export function humanizeAdminFetchError(message: string): string {
  const trimmed = message.trim();
  if (trimmed === 'Failed to fetch') {
    return '서버에 연결하지 못했습니다. 개발 서버가 실행 중인지 확인해 주세요.';
  }
  return trimmed;
}

export function firebaseAdminUnavailableText(message?: string | null) {
  return (
    message?.trim() ||
    '운영 서버에 Firebase Admin 설정이 없어 목록을 불러올 수 없습니다. Vercel Production 환경 변수를 확인해 주세요.'
  );
}

const ADMIN_FETCH_TIMEOUT_MS = 115_000;

export async function adminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const timeoutMs =
    typeof init?.signal === 'object' && init.signal !== null ? null : ADMIN_FETCH_TIMEOUT_MS;
  const controller = timeoutMs ? new AbortController() : null;
  const timeoutId =
    controller && timeoutMs
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  let res: Response;
  try {
    res = await fetch(path, {
      credentials: 'include',
      ...init,
      signal: init?.signal ?? controller?.signal,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        '요청 시간이 초과되었습니다. 통계 집계가 길어질 수 있습니다. 잠시 후 새로 고침해 주세요.',
      );
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
  const raw = await res.text();
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    const snippet = raw.trim().slice(0, 80);
    throw new Error(
      res.ok
        ? '서버 응답 형식이 올바르지 않습니다.'
        : humanizeAdminFetchError(snippet || `요청에 실패했습니다. (${res.status})`),
    );
  }
  if (!res.ok) {
    const payload = data as { error?: { message?: string; code?: string } };
    const message =
      payload.error?.message ??
      (payload.error?.code === 'ADMIN_NOT_CONFIGURED'
        ? 'Firebase Admin이 설정되지 않았습니다. .env.local을 확인해 주세요.'
        : `요청에 실패했습니다. (${res.status})`);
    throw new Error(message);
  }
  return data;
}

export const adminActionClassName =
  'inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold sm:text-sm';
export const adminPrimaryActionClassName = `${adminActionClassName} bg-primary text-white hover:bg-primary-hover`;
export const adminSecondaryActionClassName = `${adminActionClassName} border border-border-strong bg-surface text-foreground transition-colors hover:border-primary hover:bg-neutral-50`;
export const adminDangerActionClassName = `${adminActionClassName} border border-danger/30 text-danger transition-colors hover:border-danger hover:bg-red-50`;
