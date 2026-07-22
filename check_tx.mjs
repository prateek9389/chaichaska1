import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC1FkBslK7_cEUx-5hPOXSMMho0msxhIok",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "chai-chaska-dc795.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "chai-chaska-dc795",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const usersSnap = await getDocs(collection(db, "users"));
  for (const u of usersSnap.docs) {
    const txsSnap = await getDocs(collection(db, "users", u.id, "transactions"));
    console.log(`User ${u.id} has ${txsSnap.size} txs:`);
    txsSnap.forEach(t => {
      console.log(`  Tx ID: ${t.id}, Status: ${t.data().status}, Coins: ${t.data().coins}`);
    });
  }
}

run().catch(console.error);
