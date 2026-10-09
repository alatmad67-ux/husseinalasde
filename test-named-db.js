const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyBZZxPwwMuS4I73fzQqHGAJo182GjA72p0",
  authDomain: "mrkz-hussein-alasde.firebaseapp.com",
  projectId: "mrkz-hussein-alasde",
  storageBucket: "mrkz-hussein-alasde.firebasestorage.app",
  messagingSenderId: "550926354218",
  appId: "1:550926354218:web:82c0931fc700c499af8053"
};

const app = initializeApp(firebaseConfig);

// Notice passing "default" as second argument
const db = getFirestore(app, "default");

async function testNamedDatabase() {
  console.log("Testing Firestore with database ID 'default'...");
  try {
    const docRef = await addDoc(collection(db, "test_check"), {
      status: "connected",
      time: new Date().toISOString()
    });
    console.log("SUCCESS WITH 'default' DB! Document ID:", docRef.id);
  } catch (err) {
    console.error("FAIL WITH 'default' DB:", err.message);
  }
}

testNamedDatabase();
