import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';

const COLLECTION = 'crawlCompanyPolicies';
const POLICY_CACHE_TTL_MS = 60_000;

export type CrawlCompanyPolicy = {
  sourceId: string;
  companyName: string;
  crawlDisabled: boolean;
  displayDisabled: boolean;
  reason: string | null;
  updatedAt: string;
};

let policyCache: { expiresAt: number; policies: Map<string, CrawlCompanyPolicy> } | null = null;

export function companyPolicyDocId(sourceId: string, companyName: string): string {
  return `${sourceId}::${companyName.trim()}`;
}

function parsePolicy(id: string, data: Record<string, unknown>): CrawlCompanyPolicy | null {
  const sourceId = typeof data.sourceId === 'string' ? data.sourceId.trim() : '';
  const companyName = typeof data.companyName === 'string' ? data.companyName.trim() : '';
  if (!sourceId || !companyName) return null;

  return {
    sourceId,
    companyName,
    crawlDisabled: data.crawlDisabled === true,
    displayDisabled: data.displayDisabled === true,
    reason: typeof data.reason === 'string' && data.reason.trim() ? data.reason.trim() : null,
    updatedAt:
      typeof data.updatedAt === 'string'
        ? data.updatedAt
        : data.updatedAt && typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt
          ? (data.updatedAt as { toDate: () => Date }).toDate().toISOString()
          : new Date(0).toISOString(),
  };
}

function invalidatePolicyCache(): void {
  policyCache = null;
}

async function loadPolicies(): Promise<Map<string, CrawlCompanyPolicy>> {
  if (policyCache && policyCache.expiresAt > Date.now()) {
    return policyCache.policies;
  }

  const db = getAdminFirestore();
  if (!db) {
    const empty = new Map<string, CrawlCompanyPolicy>();
    policyCache = { expiresAt: Date.now() + POLICY_CACHE_TTL_MS, policies: empty };
    return empty;
  }

  const snap = await db.collection(COLLECTION).get();
  const policies = new Map<string, CrawlCompanyPolicy>();
  for (const doc of snap.docs) {
    const parsed = parsePolicy(doc.id, doc.data());
    if (parsed) policies.set(companyPolicyDocId(parsed.sourceId, parsed.companyName), parsed);
  }

  policyCache = { expiresAt: Date.now() + POLICY_CACHE_TTL_MS, policies };
  return policies;
}

export async function getDisplayDisabledCompanyKeys(): Promise<Set<string>> {
  const policies = await loadPolicies();
  const hidden = new Set<string>();
  for (const policy of policies.values()) {
    if (policy.displayDisabled) hidden.add(companyPolicyDocId(policy.sourceId, policy.companyName));
  }
  return hidden;
}

export async function isCompanyDisplayDisabled(sourceId: string, companyName: string): Promise<boolean> {
  const policies = await loadPolicies();
  const policy = policies.get(companyPolicyDocId(sourceId, companyName));
  return policy?.displayDisabled ?? false;
}

export async function isCompanyCrawlDisabled(sourceId: string, companyName: string): Promise<boolean> {
  const policies = await loadPolicies();
  const policy = policies.get(companyPolicyDocId(sourceId, companyName));
  return policy?.crawlDisabled ?? false;
}

export async function listCrawlCompanyPolicies(): Promise<CrawlCompanyPolicy[]> {
  const policies = await loadPolicies();
  return [...policies.values()].sort((a, b) => a.companyName.localeCompare(b.companyName, 'ko'));
}

export async function getCrawlCompanyPolicy(
  sourceId: string,
  companyName: string,
): Promise<CrawlCompanyPolicy | null> {
  const policies = await loadPolicies();
  return policies.get(companyPolicyDocId(sourceId, companyName)) ?? null;
}

export type UpdateCrawlCompanyPolicyInput = {
  crawlDisabled?: boolean;
  displayDisabled?: boolean;
  reason?: string | null;
};

export async function updateCrawlCompanyPolicy(
  sourceId: string,
  companyName: string,
  input: UpdateCrawlCompanyPolicyInput,
): Promise<{ policy: CrawlCompanyPolicy; displayJustDisabled: boolean }> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const trimmedName = companyName.trim();
  if (!trimmedName) throw new Error('INVALID_COMPANY');

  const current = await getCrawlCompanyPolicy(sourceId, trimmedName);
  const next: CrawlCompanyPolicy = {
    sourceId,
    companyName: trimmedName,
    crawlDisabled: input.crawlDisabled ?? current?.crawlDisabled ?? false,
    displayDisabled: input.displayDisabled ?? current?.displayDisabled ?? false,
    reason:
      input.reason === undefined
        ? current?.reason ?? null
        : input.reason && input.reason.trim()
          ? input.reason.trim()
          : null,
    updatedAt: new Date().toISOString(),
  };

  await db.collection(COLLECTION).doc(companyPolicyDocId(sourceId, trimmedName)).set({
    sourceId,
    companyName: trimmedName,
    crawlDisabled: next.crawlDisabled,
    displayDisabled: next.displayDisabled,
    reason: next.reason,
    updatedAt: FieldValue.serverTimestamp(),
  });

  invalidatePolicyCache();
  return { policy: next, displayJustDisabled: next.displayDisabled && !current?.displayDisabled };
}
