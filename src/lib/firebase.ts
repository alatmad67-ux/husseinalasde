// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration strictly defined
const firebaseConfig = {
  apiKey: "AIzaSyBZZxPwwMuS4I73fzQqHGAJo182GjA72p0",
  authDomain: "mrkz-hussein-alasde.firebaseapp.com",
  projectId: "mrkz-hussein-alasde",
  storageBucket: "mrkz-hussein-alasde.firebasestorage.app",
  messagingSenderId: "550926354218",
  appId: "1:550926354218:web:82c0931fc700c499af8053"
};

// Initialize Firebase with singleton pattern for Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
export default db;
