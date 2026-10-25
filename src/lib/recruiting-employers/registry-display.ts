import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import { resolveRegistryBusinessNumber } from '@/lib/recruiting-employers/careers-url-business-number';

/** 명단 DB에 저장된 사업자번호를 우선 표시합니다. */
export function displayRegistryBusinessNumber(
  stored: string | null | undefined,
  resolveInput: Parameters<typeof resolveRegistryBusinessNumber>[0],
): string {
  const digits = digitsOnly(stored ?? '');
  if (digits.length === 10) return formatBusinessNumber(digits);
  return resolveRegistryBusinessNumber(resolveInput);
}
