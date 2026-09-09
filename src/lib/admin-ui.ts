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
export const adminSecondaryActionClassName = `${adminActionClassName} border border-border-strong bg-surface text-foreground hover:bg-neutral-50`;
export const adminDangerActionClassName = `${adminActionClassName} border border-danger/30 text-danger hover:bg-red-50`;
