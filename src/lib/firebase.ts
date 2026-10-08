import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBZZxPwwMuS4I73fzQqHGAJo182GjA72p0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mrkz-hussein-alasde.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mrkz-hussein-alasde",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mrkz-hussein-alasde.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "550926354218",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:550926354218:web:82c0931fc700c499af8053"
};

// Initialize Firebase using singleton pattern to prevent multiple initializations in Next.js SSR / Fast Refresh
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
export default db;
