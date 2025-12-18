
import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
// Fix: Separate type and function imports to avoid "no exported member" errors in strict environments
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/**
 * [重要] 硬編碼 Firebase 設定 (作為備援)
 */
const hardcodedFirebaseConfig = {
  apiKey: "AIzaSyD6RP5acBTKR9o4lqt3SVmSudmJhRD5hzw",
  authDomain: "project-4005736161152554920.firebaseapp.com",
  projectId: "project-4005736161152554920",
  storageBucket: "project-4005736161152554920.firebasestorage.app",
  messagingSenderId: "286922871756",
  appId: "1:286922871756:web:b94622a9c4842442220369"
};

const getEffectiveConfig = () => {
  try {
    // 優先讀取 Vite 注入的環境變數
    const envConfig = process.env.FIREBASE_CONFIG;
    if (envConfig && envConfig !== '{}' && envConfig !== '""') {
      return JSON.parse(envConfig);
    }
  } catch (e) {
    console.error("Firebase config parsing failed:", e);
  }
  return hardcodedFirebaseConfig;
};

const configToUse = getEffectiveConfig();
const isConfigValid = !!(configToUse && configToUse.apiKey && configToUse.apiKey !== "YOUR_FIREBASE_API_KEY");

const app: FirebaseApp | null = isConfigValid 
  ? (getApps().length === 0 ? initializeApp(configToUse) : getApps()[0]) 
  : null;

export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const isOfflineMode = !isConfigValid;

if (isOfflineMode) {
  console.warn("FinTrack AI 目前處於「離線模式」。");
}
