const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, getDocs, doc, setDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyBZZxPwwMuS4I73fzQqHGAJo182GjA72p0",
  authDomain: "mrkz-hussein-alasde.firebaseapp.com",
  projectId: "mrkz-hussein-alasde",
  storageBucket: "mrkz-hussein-alasde.firebasestorage.app",
  messagingSenderId: "550926354218",
  appId: "1:550926354218:web:82c0931fc700c499af8053"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirebaseConnection() {
  console.log("Connecting directly to Firebase project: mrkz-hussein-alasde ...");
  try {
    const testDoc = await addDoc(collection(db, "test_connection"), {
      message: "تم الاتصال بنجاح من مركز حسين الاسدي",
      timestamp: new Date().toISOString()
    });
    console.log("SUCCESS! Created test document with ID:", testDoc.id);

    // Seed products
    console.log("Seeding products collection...");
    const products = [
      { name: "Mobil 1 ESP 5W-30 (تخليقي بالكامل)", category: "engine_oil", viscosity: "5W30", packageSizeLiters: 5, totalLitersStock: 50.0, unitCost: 9000, salePrice: 12000 },
      { name: "Castrol Magnatec 10W-40", category: "engine_oil", viscosity: "10W40", packageSizeLiters: 4, totalLitersStock: 40.0, unitCost: 7000, salePrice: 9500 },
      { name: "Liqui Moly Molygen 5W-40", category: "engine_oil", viscosity: "5W40", packageSizeLiters: 5, totalLitersStock: 30.0, unitCost: 10500, salePrice: 13500 },
      { name: "Toyota Genuine ATF WS (دهن گير)", category: "gear_oil", viscosity: "ATF WS", packageSizeLiters: 4, totalLitersStock: 25.0, unitCost: 11000, salePrice: 15000 },
      { name: "فلتر زيت أصلي تويوتا", category: "filter", viscosity: "90915-YZZE2", packageSizeLiters: 1, totalLitersStock: 30, unitCost: 4500, salePrice: 7000 },
      { name: "ماء راديتر بريستون أصلي 50/50 أمريكي", category: "coolant", viscosity: "Prestone Red", packageSizeLiters: 4, totalLitersStock: 20.0, unitCost: 10000, salePrice: 14000 }
    ];

    for (const p of products) {
      const pDoc = await addDoc(collection(db, "products"), {
        ...p,
        createdAt: new Date().toISOString()
      });
      console.log(`Created product: ${p.name} (ID: ${pDoc.id})`);
    }

    console.log("FINISHED SEEDING SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("FIREBASE ERROR:", err);
    process.exit(1);
  }
}

testFirebaseConnection();
