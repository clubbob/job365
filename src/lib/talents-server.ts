import type { DocumentData, DocumentReference } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { omitUndefined } from '@/lib/omit-undefined';
import type { TalentProfile } from '@/types/talent';

const COLLECTION = 'talentProfiles';

export type StoredTalentProfile = {
  ownerId: string;
  profile: TalentProfile;
};

function asTalentProfile(value: unknown): TalentProfile | null {
  if (!value || typeof value !== 'object') return null;
  const profile = value as TalentProfile;
  if (typeof profile.id !== 'string' || typeof profile.name !== 'string' || typeof profile.headline !== 'string') {
    return null;
  }
  return profile;
}

function fromDoc(id: string, data: DocumentData): StoredTalentProfile | null {
  const ownerId = typeof data.ownerId === 'string' ? data.ownerId : id;
  const profile = asTalentProfile(data.profile ?? data);
  if (!ownerId || !profile) return null;
  return { ownerId, profile };
}

export async function listStoredTalentProfiles(): Promise<StoredTalentProfile[]> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map((doc) => fromDoc(doc.id, doc.data()))
    .filter((item): item is StoredTalentProfile => Boolean(item))
    .sort((a, b) => (b.profile.updatedAt || b.profile.createdAt).localeCompare(a.profile.updatedAt || a.profile.createdAt));
}

export async function getStoredTalentProfile(id: string): Promise<StoredTalentProfile | null> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const direct = await db.collection(COLLECTION).doc(id).get();
  if (direct.exists) return fromDoc(direct.id, direct.data() ?? {});
  const all = await listStoredTalentProfiles();
  return all.find((item) => item.profile.id === id || item.ownerId === id) ?? null;
}

export async function upsertStoredTalentProfile(ownerId: string, profile: TalentProfile): Promise<StoredTalentProfile> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const record = {
    ownerId,
    profile: omitUndefined({ ...profile } as Record<string, unknown>),
    updatedAt: new Date().toISOString(),
  };
  await db.collection(COLLECTION).doc(ownerId).set(record);
  return { ownerId, profile };
}

export async function deleteStoredTalentProfile(id: string): Promise<boolean> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const existing = await getStoredTalentProfile(id);
  if (!existing) return false;
  await db.collection(COLLECTION).doc(existing.ownerId).delete();
  return true;
}

export async function deleteStoredTalentProfilesByOwner(ownerId: string): Promise<number> {
  const db = getAdminFirestore();
  if (!db) throw new Error('FIRESTORE_UNAVAILABLE');
  const refs = new Map<string, DocumentReference>();
  const direct = db.collection(COLLECTION).doc(ownerId);
  const directSnap = await direct.get();
  if (directSnap.exists) refs.set(direct.id, direct);
  const querySnap = await db.collection(COLLECTION).where('ownerId', '==', ownerId).get();
  for (const doc of querySnap.docs) refs.set(doc.id, doc.ref);
  if (refs.size === 0) return 0;
  const batch = db.batch();
  refs.forEach((ref) => batch.delete(ref));
  await batch.commit();
  return refs.size;
}
