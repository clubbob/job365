export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function formatBusinessNumber(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
