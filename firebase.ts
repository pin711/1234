
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
// Consolidate getAuth and Auth type into a single import statement to ensure proper module resolution
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * [重要] 硬編碼 Firebase 設定
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
    const envConfig = process.env.FIREBASE_CONFIG;
    if (envConfig && envConfig !== '{}' && envConfig !== '""') {
      return JSON.parse(envConfig);
    }
  } catch (e) {
    console.error("Firebase config parsing from environment failed:", e);
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
  console.warn("FinTrack AI 目前處於「離線/展示模式」。請檢查 firebase.ts 的設定。");
}
