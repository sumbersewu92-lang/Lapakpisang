import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { AppUserRecord, UserRole, UserSession } from './types/banana';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
let authInstance: Auth | null = null;
try {
  authInstance = getAuth(app);
} catch {
  authInstance = null;
}
export const auth = authInstance;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function logFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = logFirestoreError(error, operationType, path);
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'lapak', 'main'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

export function clampStr(value: string | undefined | null, maxLen: number): string {
  return (value ?? '').trim().slice(0, maxLen);
}

export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result as T;
}

export function formatRoleLabel(role: UserRole): string {
  return role === 'owner' ? 'Owner (Superadmin)' : 'Kasir';
}

export function generateSalt(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(length);
    crypto.getRandomValues(arr);
    for (let i = 0; i < length; i++) {
      result += chars[arr[i] % chars.length];
    }
    return result;
  }
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Pure-JS SHA-256 fallback if Web Crypto subtle is unavailable
function sha256Fallback(ascii: string): string {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  let hash = (sha256Fallback as unknown as { h?: number[] }).h || [];
  let k = (sha256Fallback as unknown as { k?: number[] }).k || [];
  let primeCounter = k.length;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let msg = ascii + '\x80';
  while ((msg.length % 64) - 56) msg += '\x00';
  for (let i = 0; i < msg.length; i++) {
    const j = msg.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  const h = hash.slice(0, 8);
  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = h.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = h[0];
      const e = h[4];
      const temp1 =
        h[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & h[5]) ^ (~e & h[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]));
      h[7] = h[6];
      h[6] = h[5];
      h[5] = h[4];
      h[4] = (h[3] + temp1) | 0;
      h[3] = h[2];
      h[2] = h[1];
      h[1] = h[0];
      h[0] = (temp1 + temp2) | 0;
    }
    for (let i = 0; i < 8; i++) {
      h[i] = (h[i] + oldHash[i]) | 0;
    }
  }
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (h[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export async function hashPassword(salt: string, password: string): Promise<string> {
  const input = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return sha256Fallback(input);
}

let seedPromise: Promise<void> | null = null;

async function getDocPreferServer(ref: ReturnType<typeof doc>) {
  try {
    return await getDocFromServer(ref);
  } catch {
    return await getDoc(ref);
  }
}

/**
 * Ensures the shared lapak workspace (/lapak/main) and the two requested default accounts
 * (252500 owner/superadmin & 252501 kasir) exist in Firestore without overwriting existing records.
 */
export async function ensureSeededUsersAndWorkspace(): Promise<void> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    const lapakRef = doc(db, 'lapak', 'main');
    let lapakSnap;
    try {
      lapakSnap = await getDocPreferServer(lapakRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'lapak/main');
    }

    if (!lapakSnap.exists()) {
      try {
        await setDoc(lapakRef, {
          id: 'main',
          name: 'Lapak Pisang Sumber Sewu',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        // Handle concurrent create race: lapak/main forbids updates, so duplicate setDoc throws permission-denied
        const verifySnap = await getDocPreferServer(lapakRef).catch(() => null);
        if (!verifySnap || !verifySnap.exists()) {
          handleFirestoreError(err, OperationType.CREATE, 'lapak/main');
        }
      }
    }

    const defaultUsers: Array<{
      id: string;
      password: string;
      fullName: string;
      role: UserRole;
    }> = [
      {
        id: '252500',
        password: '8888',
        fullName: 'Owner Lapak (Superadmin)',
        role: 'owner'
      },
      {
        id: '252501',
        password: '9999',
        fullName: 'Kasir Lapak',
        role: 'kasir'
      }
    ];

    for (const def of defaultUsers) {
      const userPath = `app_users/${def.id}`;
      const userRef = doc(db, 'app_users', def.id);
      let snap;
      try {
        snap = await getDocPreferServer(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userPath);
      }

      if (!snap.exists()) {
        const salt = generateSalt();
        const passwordHash = await hashPassword(salt, def.password);
        try {
          await setDoc(userRef, {
            id: def.id,
            username: def.id,
            fullName: def.fullName,
            role: def.role,
            passwordHash,
            salt,
            isActive: true,
            createdAtDate: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          const verifySnap = await getDocPreferServer(userRef).catch(() => null);
          if (!verifySnap || !verifySnap.exists()) {
            handleFirestoreError(err, OperationType.CREATE, userPath);
          }
        }
      }
    }
  })().catch((err) => {
    seedPromise = null;
    throw err;
  });

  return seedPromise;
}

export async function authenticateAppUser(
  rawUsername: string,
  password: string
): Promise<UserSession> {
  const cleanId = rawUsername.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
    throw new Error('ID pengguna hanya boleh berisi huruf, angka, tanda hubung (-), atau garis bawah (_).');
  }

  await ensureSeededUsersAndWorkspace();

  const userPath = `app_users/${cleanId}`;
  let userSnap;
  try {
    userSnap = await getDoc(doc(db, 'app_users', cleanId));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  if (!userSnap.exists()) {
    throw new Error('ID pengguna tidak ditemukan. Periksa kembali username/ID Anda.');
  }

  const userData = userSnap.data() as AppUserRecord;
  if (!userData.isActive) {
    throw new Error('Akun pengguna ini sedang dinonaktifkan oleh Owner.');
  }

  const computedHash = await hashPassword(userData.salt, password);
  if (computedHash !== userData.passwordHash) {
    throw new Error('Password salah. Silakan periksa kembali kata sandi Anda.');
  }

  return {
    id: userData.id,
    username: userData.username,
    fullName: userData.fullName,
    role: userData.role,
    roleLabel: formatRoleLabel(userData.role),
    storeName: 'Lapak Pisang Sumber Sewu',
    isLoggedIn: true
  };
}
