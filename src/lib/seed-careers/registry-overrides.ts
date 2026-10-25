import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { digitsOnly, formatBusinessNumber } from '@/lib/business-number';
import type { SeedCareersSegment } from '@/lib/seed-careers/segment';

export type SeedCareersRegistryOverride = {
  seedCompanyName: string;
  registryCompanyName?: string;
  businessNumber?: string;
  careersUrl?: string;
};

type OverridesFile = {
  version: 1;
  companies: SeedCareersRegistryOverride[];
};

function overridesPath(segment: SeedCareersSegment): string {
  const slug = segment === 'it' ? 'it-seed' : 'semi-seed';
  return resolve(process.cwd(), `data/${slug}-registry-overrides.json`);
}

function formattedBn(value: string | undefined): string | null {
  const digits = digitsOnly(value ?? '');
  if (digits.length !== 10) return null;
  return formatBusinessNumber(digits);
}

export function loadSeedCareersRegistryOverrides(segment: SeedCareersSegment): Map<string, SeedCareersRegistryOverride> {
  const map = new Map<string, SeedCareersRegistryOverride>();
  try {
    const raw = JSON.parse(readFileSync(overridesPath(segment), 'utf8')) as OverridesFile;
    if (!raw?.companies || !Array.isArray(raw.companies)) return map;
    for (const row of raw.companies) {
      const key = row.seedCompanyName?.trim();
      if (!key) continue;
      map.set(key, {
        seedCompanyName: key,
        registryCompanyName: row.registryCompanyName?.trim() || key,
        businessNumber: formattedBn(row.businessNumber) ?? undefined,
        careersUrl: row.careersUrl?.trim() || undefined,
      });
    }
  } catch {
    // optional file
  }
  return map;
}
