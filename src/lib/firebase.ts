import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFirebaseClientConfig, hasFirebaseClientConfig } from '@/lib/firebase-config';

const APP_NAME = 'job365';

function createFirebaseApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;

  return initializeApp(getFirebaseClientConfig(), APP_NAME);
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasFirebaseClientConfig()) return null;
  return createFirebaseApp();
}

export function getClientAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getClientDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}
