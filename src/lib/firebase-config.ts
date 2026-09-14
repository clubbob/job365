export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
  measurementId?: string;
};

export function getFirebaseClientConfig(): FirebaseClientConfig {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  const missing = Object.entries(config)
    .filter(([key, value]) => key !== 'measurementId' && !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Firebase client env missing: ${missing.join(', ')}`);
  }

  return config as FirebaseClientConfig;
}

export function hasFirebaseClientConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  );
}

function envText(name: string): string {
  const raw = process.env[name]?.trim() ?? '';
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1).trim();
  }
  return raw;
}

export function hasFirebaseAdminConfig(): boolean {
  const projectId = envText('FIREBASE_PROJECT_ID') || envText('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  const clientEmail = envText('FIREBASE_CLIENT_EMAIL');
  const hasPrivateKey = Boolean(envText('FIREBASE_PRIVATE_KEY') || envText('FIREBASE_PRIVATE_KEY_BASE64'));
  return Boolean(projectId && clientEmail && hasPrivateKey);
}
