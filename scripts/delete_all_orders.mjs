import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC1FkBslK7_cEUx-5hPOXSMMho0msxhIok",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "chai-chaska-dc795.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "chai-chaska-dc795",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "chai-chaska-dc795.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "57617026864",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:57617026864:web:e2eb00c049819e685742f5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllOrders() {
  console.log("Fetching all orders from Firestore 'orders' collection...");
  const snap = await getDocs(collection(db, "orders"));
  console.log(`Found ${snap.docs.length} orders in database.`);

  if (snap.docs.length === 0) {
    console.log("No orders to delete. Collection is already empty.");
    return;
  }

  // Delete in batches of 500
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 400);
    chunk.forEach((d) => {
      batch.delete(doc(db, "orders", d.id));
    });
    await batch.commit();
    console.log(`Deleted batch of ${chunk.length} orders (${i + chunk.length}/${docs.length})`);
  }

  console.log("Successfully deleted all orders from database!");
}

deleteAllOrders().catch(console.error);
