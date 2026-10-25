export type SeedCareersSegment = 'it' | 'semi-equipment';

export const SEED_CAREERS_SEGMENTS: SeedCareersSegment[] = ['it', 'semi-equipment'];

export function parseSeedCareersSegment(value: string | undefined): SeedCareersSegment | 'all' | null {
  const trimmed = (value ?? '').trim();
  if (trimmed === 'all') return 'all';
  if (trimmed === 'it' || trimmed === 'semi-equipment') return trimmed;
  return null;
}
