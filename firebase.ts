
import { initializeApp, getApps } from 'firebase/app';
// Use separated type imports to resolve "no exported member" errors in strict environments
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/**
 * [重要] 硬編碼 Firebase 設定
 * 優先讀取此處設定，若環境變數 process.env.FIREBASE_CONFIG 存在則會覆蓋此設定。
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

// 優先檢查是否有從 Secrets 注入的 Config，若無則使用硬編碼內容
try {
  const envConfig = process.env.FIREBASE_CONFIG;
  if (envConfig && envConfig !== '{}') {
    configToUse = JSON.parse(envConfig);
  } else {
    // 檢查硬編碼設定是否有效（不等於初始模板值）
    if (hardcodedFirebaseConfig.apiKey && hardcodedFirebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
      configToUse = hardcodedFirebaseConfig;
    }
  }
} catch (e) {
  console.error("Firebase config parsing failed:", e);
}

const isConfigValid = configToUse && configToUse.apiKey && configToUse.apiKey !== "YOUR_FIREBASE_API_KEY";

const app: FirebaseApp | null = isConfigValid 
  ? (getApps().length === 0 ? initializeApp(configToUse) : getApps()[0]) 
  : null;

// Correctly initialize auth with the app instance if available
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const isOfflineMode = !isConfigValid;

if (isOfflineMode) {
  console.warn("FinTrack AI 目前處於「離線/展示模式」。請在 firebase.ts 中填寫您的 Firebase 設定。");
}
