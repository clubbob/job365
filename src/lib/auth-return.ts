export function getSafeReturnPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}
