import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence, 
  getAuth,
  type Auth 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authInstance: Auth;

try {
  // Intentamos inicializar Auth con la persistencia de AsyncStorage
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error: any) {
  // Si ya fue inicializada previamente por Fast Refresh / Hot Reloading, recuperamos la instancia existente
  if (
    error?.code === 'auth/already-initialized' ||
    error?.message?.includes('already been initialized')
  ) {
    authInstance = getAuth(app);
  } else {
    throw error;
  }
}

export const auth = authInstance;
auth.languageCode = 'es';
