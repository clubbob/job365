import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeBusinessNumber } from '@/lib/mid-sized-companies/registry-dedupe';

export type CareersDiscoveryStatus = 'pending' | 'found' | 'not_found';

export type CareersDiscoveryEntry = {
  status: CareersDiscoveryStatus;
  checkedAt: string;
  careersUrl?: string;
};

export type MidSizedDiscoveryStateFile = {
  version: 1;
  updatedAt: string;
  entries: Record<string, CareersDiscoveryEntry>;
};

const STATE_PATH = resolve(process.cwd(), 'data/mid-sized-discovery-state.json');

export function loadDiscoveryState(): MidSizedDiscoveryStateFile {
  try {
    const raw = JSON.parse(readFileSync(STATE_PATH, 'utf8')) as MidSizedDiscoveryStateFile;
    if (raw?.version === 1 && raw.entries && typeof raw.entries === 'object') {
      return raw;
    }
  } catch {
    // empty
  }
  return { version: 1, updatedAt: '', entries: {} };
}

export function saveDiscoveryState(file: MidSizedDiscoveryStateFile): void {
  const payload = { ...file, updatedAt: new Date().toISOString() };
  writeFileSync(STATE_PATH, `${JSON.stringify(payload)}\n`, 'utf8');
}

export function setDiscoveryEntry(
  file: MidSizedDiscoveryStateFile,
  businessNumber: string,
  entry: CareersDiscoveryEntry,
): void {
  const bn = normalizeBusinessNumber(businessNumber);
  if (!bn) return;
  file.entries[bn] = entry;
}

export function countDiscoveryState(file: MidSizedDiscoveryStateFile): {
  found: number;
  notFound: number;
  pending: number;
} {
  let found = 0;
  let notFound = 0;
  let pending = 0;
  for (const entry of Object.values(file.entries)) {
    if (entry.status === 'found') found += 1;
    else if (entry.status === 'not_found') notFound += 1;
    else pending += 1;
  }
  return { found, notFound, pending };
}
