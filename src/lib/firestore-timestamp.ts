import { Timestamp } from 'firebase-admin/firestore';

export function parseFirestoreTimestamp(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (typeof value === 'object') {
    if ('toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
      try {
        return (value as { toDate: () => Date }).toDate().toISOString();
      } catch {
        return null;
      }
    }

    const record = value as {
      _seconds?: number;
      seconds?: number;
      _nanoseconds?: number;
      nanoseconds?: number;
    };
    const seconds = record._seconds ?? record.seconds;
    if (typeof seconds === 'number') {
      const nanos = record._nanoseconds ?? record.nanoseconds ?? 0;
      return new Date(seconds * 1000 + nanos / 1_000_000).toISOString();
    }
  }

  return null;
}
