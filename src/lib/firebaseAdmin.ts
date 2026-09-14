import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

const APP_NAME = 'job365-admin';

export type FirebaseAdminIssue = 'missing_config' | 'init_failed';

export type FirebaseAdminCheck = {
  hasProjectId: boolean;
  hasClientEmail: boolean;
  hasPrivateKey: boolean;
  privateKeyHasBegin: boolean;
  privateKeyHasEnd: boolean;
  privateKeyChars: number;
  issue: FirebaseAdminIssue | null;
  initError: string | null;
};

export type FirebaseAdminStatus = {
  ready: boolean;
  issue: FirebaseAdminIssue | null;
  message: string | null;
};

const MISSING_CONFIG_MESSAGE =
  '운영 서버에 Firebase Admin 설정이 없습니다. Vercel Production에 FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY를 넣은 뒤 캐시 없이 다시 배포해 주세요.';

const INIT_FAILED_MESSAGE =
  'Firebase Admin 키를 읽지 못했습니다. FIREBASE_PRIVATE_KEY 값의 앞뒤 따옴표를 빼고, 줄바꿈은 \\n으로 한 줄에 넣은 다음, Use existing Build Cache를 끄고 Redeploy 해 주세요.';

let lastInitError: string | null = null;

function envValue(name: string): string {
  const env = process.env as Record<string, string | undefined>;
  return env[name] ?? '';
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim().replace(/^\uFEFF/, '');
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function unescapeNewlines(value: string): string {
  let current = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < 4; i += 1) {
    if (!current.includes('\\n') && !current.includes('\\r')) break;
    current = current.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
  }
  return current;
}

function formatPem(key: string): string {
  const begin = key.match(/-----BEGIN ([A-Z0-9 ]+PRIVATE KEY)-----/);
  const end = key.match(/-----END ([A-Z0-9 ]+PRIVATE KEY)-----/);
  if (!begin || !end) return key.endsWith('\n') ? key : `${key}\n`;

  const type = begin[1];
  const beginAt = key.indexOf(begin[0]) + begin[0].length;
  const endAt = key.lastIndexOf(end[0]);
  if (endAt <= beginAt) return key.endsWith('\n') ? key : `${key}\n`;

  const body = key.slice(beginAt, endAt).replace(/\s+/g, '');
  if (!body) return key.endsWith('\n') ? key : `${key}\n`;

  const lines = body.match(/.{1,64}/g) ?? [body];
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----\n`;
}

function normalizePrivateKey(raw?: string): string {
  if (!raw) return '';
  let key = unescapeNewlines(stripWrappingQuotes(raw)).trim().replace(/"/g, '');

  if (key.startsWith('{')) {
    try {
      const parsed = JSON.parse(unescapeNewlines(stripWrappingQuotes(raw))) as {
        private_key?: unknown;
        privateKey?: unknown;
      };
      const nested = parsed.private_key ?? parsed.privateKey;
      if (typeof nested === 'string') {
        key = unescapeNewlines(nested).trim().replace(/"/g, '');
      }
    } catch {
      // 서비스 계정 JSON이 아니면 PEM으로 둡니다.
    }
  }

  if (!key.includes('\n')) {
    key = formatPem(key);
  }

  return key.endsWith('\n') ? key : `${key}\n`;
}

function readPrivateKey(): string {
  const encoded = envValue('FIREBASE_PRIVATE_KEY_BASE64').trim();
  if (encoded) {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const key = normalizePrivateKey(decoded);
      if (key.includes('BEGIN')) return key;
    } catch {
      // FIREBASE_PRIVATE_KEY로 이어갑니다.
    }
  }

  return normalizePrivateKey(envValue('FIREBASE_PRIVATE_KEY'));
}

function trimEnv(name: string): string {
  return stripWrappingQuotes(envValue(name)).trim();
}

function getServiceAccount() {
  const projectId = trimEnv('FIREBASE_PROJECT_ID') || trimEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  const clientEmail = trimEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = readPrivateKey();

  if (!projectId || !clientEmail || !privateKey) return null;

  return { projectId, clientEmail, privateKey };
}

function getStorageBucketName(projectId: string): string {
  return (
    trimEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') ||
    trimEnv('FIREBASE_STORAGE_BUCKET') ||
    `${projectId}.appspot.com`
  );
}

function inspectPrivateKeySource() {
  const raw = envValue('FIREBASE_PRIVATE_KEY') || envValue('FIREBASE_PRIVATE_KEY_BASE64');
  const text = raw.trim();
  return {
    hasPrivateKey: Boolean(text),
    privateKeyHasBegin: /BEGIN [A-Z0-9 ]*PRIVATE KEY/.test(text),
    privateKeyHasEnd: /END [A-Z0-9 ]*PRIVATE KEY/.test(text),
    privateKeyChars: text.length,
  };
}

export function getFirebaseAdminCheck(issue: FirebaseAdminIssue | null = null): FirebaseAdminCheck {
  return {
    hasProjectId: Boolean(trimEnv('FIREBASE_PROJECT_ID') || trimEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID')),
    hasClientEmail: Boolean(trimEnv('FIREBASE_CLIENT_EMAIL')),
    ...inspectPrivateKeySource(),
    issue,
    initError: lastInitError,
  };
}

export function getAdminApp(): App | null {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    lastInitError = null;
    return null;
  }

  try {
    lastInitError = null;
    return initializeApp(
      {
        credential: cert({
          projectId: serviceAccount.projectId,
          clientEmail: serviceAccount.clientEmail,
          privateKey: serviceAccount.privateKey,
        }),
        projectId: serviceAccount.projectId,
        storageBucket: getStorageBucketName(serviceAccount.projectId),
      },
      APP_NAME,
    );
  } catch (error) {
    const raced = getApps().find((app) => app.name === APP_NAME);
    if (raced) return raced;

    lastInitError = error instanceof Error ? error.message : 'initialize failed';
    console.error('[firebase-admin] initialize failed', {
      message: lastInitError,
      hasProjectId: Boolean(serviceAccount.projectId),
      hasClientEmail: Boolean(serviceAccount.clientEmail),
      hasPrivateKey: Boolean(serviceAccount.privateKey),
      hasPemHeader: serviceAccount.privateKey.includes('BEGIN'),
      hasPemFooter: serviceAccount.privateKey.includes('END'),
      privateKeyChars: serviceAccount.privateKey.length,
    });
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

export function getFirebaseAdminStatus(): FirebaseAdminStatus {
  const app = getAdminApp();
  if (app) return { ready: true, issue: null, message: null };

  const check = getFirebaseAdminCheck();
  if (!check.hasProjectId || !check.hasClientEmail || !check.hasPrivateKey) {
    return { ready: false, issue: 'missing_config', message: MISSING_CONFIG_MESSAGE };
  }

  return { ready: false, issue: 'init_failed', message: INIT_FAILED_MESSAGE };
}

export function firebaseAdminListFields() {
  const status = getFirebaseAdminStatus();
  return {
    firebaseReady: status.ready,
    firebaseAdminMessage: status.message,
    firebaseAdminCheck: getFirebaseAdminCheck(status.issue),
  };
}

export function isFirebaseAdminReady(): boolean {
  return getFirebaseAdminStatus().ready;
}
