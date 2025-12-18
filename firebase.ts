
import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
// Fix: Consolidate modular Firebase Auth imports to ensure all members are recognized
import { getAuth, Auth } from 'firebase/auth';
// Fix: Consolidate modular Firebase Firestore imports
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * [重要] 硬編碼 Firebase 設定
 * 請確保此變數在任何邏輯調用前已正確定義
 */
const hardcodedFirebaseConfig = {
  apiKey: "AIzaSyD6RP5acBTKR9o4lqt3SVmSudmJhRD5hzw",
  authDomain: "project-4005736161152554920.firebaseapp.com",
  projectId: "project-4005736161152554920",
  storageBucket: "project-4005736161152554920.firebasestorage.app",
  messagingSenderId: "286922871756",
  appId: "1:286922871756:web:b94622a9c4842442220369"
};

let configToUse: any = null;

try {
  // 優先檢查是否有從 Secrets 注入的環境變數
  const envConfig = process.env.FIREBASE_CONFIG;
  
  if (envConfig && envConfig !== '{}' && envConfig !== '""') {
    configToUse = JSON.parse(envConfig);
  } else {
    // 若無環境變數，檢查硬編碼設定是否有效
    if (hardcodedFirebaseConfig.apiKey && hardcodedFirebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
      configToUse = hardcodedFirebaseConfig;
    }
  }
} catch (e) {
  console.error("Firebase config parsing failed, falling back to default:", e);
  configToUse = hardcodedFirebaseConfig;
}

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
