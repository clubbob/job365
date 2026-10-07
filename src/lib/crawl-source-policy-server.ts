import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
const COLLECTION = 'crawlSourcePolicies';
const POLICY_CACHE_TTL_MS = 60_000;

export type CrawlSourcePolicy = {
  sourceId: string;
  crawlDisabled: boolean;
  displayDisabled: boolean;
  reason: string | null;
  updatedAt: string;
};

let policyCache: { expiresAt: number; policies: Map<string, CrawlSourcePolicy> } | null = null;

function parsePolicy(id: string, data: Record<string, unknown>): CrawlSourcePolicy {
  return {
    sourceId: id,
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

function emptyPolicy(sourceId: string): CrawlSourcePolicy {
  return {
    sourceId,
    crawlDisabled: false,
    displayDisabled: false,
    reason: null,
    updatedAt: new Date(0).toISOString(),
  };
}

function invalidatePolicyCache(): void {
  policyCache = null;
}

async function loadPolicies(): Promise<Map<string, CrawlSourcePolicy>> {
  if (policyCache && policyCache.expiresAt > Date.now()) {
    return policyCache.policies;
  }

  const db = getAdminFirestore();
  if (!db) {
    const empty = new Map<string, CrawlSourcePolicy>();
    policyCache = { expiresAt: Date.now() + POLICY_CACHE_TTL_MS, policies: empty };
    return empty;
  }

  const snap = await db.collection(COLLECTION).get();
  const policies = new Map<string, CrawlSourcePolicy>();
  for (const doc of snap.docs) {
    policies.set(doc.id, parsePolicy(doc.id, doc.data()));
  }

  policyCache = { expiresAt: Date.now() + POLICY_CACHE_TTL_MS, policies };
  return policies;
}

export async function listCrawlSourcePolicies(): Promise<CrawlSourcePolicy[]> {
  const policies = await loadPolicies();
  return [...policies.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId, 'ko'));
}

export async function getCrawlSourcePolicy(sourceId: string): Promise<CrawlSourcePolicy> {
  const policies = await loadPolicies();
  return policies.get(sourceId) ?? emptyPolicy(sourceId);
}

export async function isCrawlDisabled(sourceId: string): Promise<boolean> {
  return (await getCrawlSourcePolicy(sourceId)).crawlDisabled;
}

export async function isDisplayDisabled(sourceId: string): Promise<boolean> {
  return (await getCrawlSourcePolicy(sourceId)).displayDisabled;
}

export async function getDisplayDisabledSourceIds(): Promise<Set<string>> {
  const policies = await loadPolicies();
  const hidden = new Set<string>();
  for (const policy of policies.values()) {
    if (policy.displayDisabled) hidden.add(policy.sourceId);
  }
  return hidden;
}

export type UpdateCrawlSourcePolicyInput = {
  crawlDisabled?: boolean;
  displayDisabled?: boolean;
  reason?: string | null;
};

export async function updateCrawlSourcePolicy(
  sourceId: string,
  input: UpdateCrawlSourcePolicyInput,
): Promise<{ policy: CrawlSourcePolicy; displayJustDisabled: boolean }> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');

  const current = await getCrawlSourcePolicy(sourceId);
  const next: CrawlSourcePolicy = {
    sourceId,
    crawlDisabled: input.crawlDisabled ?? current.crawlDisabled,
    displayDisabled: input.displayDisabled ?? current.displayDisabled,
    reason:
      input.reason === undefined
        ? current.reason
        : input.reason && input.reason.trim()
          ? input.reason.trim()
          : null,
    updatedAt: new Date().toISOString(),
  };

  await db.collection(COLLECTION).doc(sourceId).set({
    crawlDisabled: next.crawlDisabled,
    displayDisabled: next.displayDisabled,
    reason: next.reason,
    updatedAt: FieldValue.serverTimestamp(),
  });

  invalidatePolicyCache();
  return { policy: next, displayJustDisabled: next.displayDisabled && !current.displayDisabled };
}
