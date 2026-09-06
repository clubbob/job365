import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import { hasFirebaseAdminConfig } from '@/lib/firebase-config';

const APP_NAME = 'job365-admin';

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();

  if (!projectId || !clientEmail || !privateKey) return null;

  return { projectId, clientEmail, privateKey };
}

function getStorageBucketName(projectId: string): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    `${projectId}.appspot.com`
  );
}

export function getAdminApp(): App | null {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;

  try {
    return initializeApp(
      {
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId,
        storageBucket: getStorageBucketName(serviceAccount.projectId),
      },
      APP_NAME,
    );
  } catch (error) {
    console.error('[firebase-admin] initialize failed', error);
    return null;
  }
}

export function getAdminFirestore(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function getAdminStorage(): Storage | null {
  const app = getAdminApp();
  return app ? getStorage(app) : null;
}

export function getAdminStorageBucket() {
  const app = getAdminApp();
  const storage = getAdminStorage();
  if (!app || !storage) return null;

  const projectId = app.options.projectId;
  if (!projectId) return null;

  return storage.bucket(getStorageBucketName(projectId));
}

export function isFirebaseAdminReady(): boolean {
  if (!hasFirebaseAdminConfig()) return false;
  try {
    getApp(APP_NAME);
    return true;
  } catch {
    return getAdminApp() !== null;
  }
}
