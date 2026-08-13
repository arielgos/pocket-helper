import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { t } from './i18n';

// process.env.EXPO_PUBLIC_* member accesses must stay static (literal key) so
// Babel can inline them at build time; process.env[key] can't be inlined and
// is always undefined at runtime, so build the config first and validate that.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const requiredEnvVars: Record<string, string | undefined> = {
  EXPO_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  EXPO_PUBLIC_FIREBASE_DATABASE_URL: firebaseConfig.databaseURL,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  EXPO_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  throw new Error(
    t('errors.missingFirebaseEnvVars', { vars: missingEnvVars.join(', ') })
  );
}


const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
