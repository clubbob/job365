export function firstRequiredError(
  checks: ReadonlyArray<{ ok: boolean; message: string }>,
): string | null {
  for (const check of checks) {
    if (!check.ok) return check.message;
  }
  return null;
}
