import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  try {
    const text = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();
const { getMidSizedRegistryStats, loadMidSizedRegistryFromDisk } = await import('../src/lib/mid-sized-companies-server.ts');
const disk = loadMidSizedRegistryFromDisk();
const stats = await getMidSizedRegistryStats();
console.log('Firestore collection: midSizedCompanies');
console.log('Firestore count:', stats.total, '(firestoreReady:', stats.firestoreReady + ')');
console.log('importedAt:', stats.importedAt);
console.log('Local JSON companies:', disk.companies.length);
