import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

// Parse .env.local
const envConfig = fs.readFileSync('.env.local', 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
  }
});

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const newItems = [
  { category: "Tea", name: "Tea Leaves (Chai Patti)", unit: "kg" },
  { category: "Tea", name: "Sugar", unit: "kg" },
  { category: "Tea", name: "Ginger (Adrak)", unit: "Grams" },
  { category: "Tea", name: "Cardamom (Elaichi)", unit: "Grams" },
  { category: "Tea", name: "Green Tea Bags", unit: "pcs" },
  { category: "Milk", name: "Full Cream Milk", unit: "Litre" },
  { category: "Milk", name: "Tone Milk", unit: "Litre" },
  { category: "Coffee", name: "Bura", unit: "Kg" },
  { category: "Coffee", name: "Coffee Powder", unit: "kg" },
  { category: "Shake", name: "Chocolate Syrup", unit: "Litre" },
  { category: "Shake", name: "Vanilla Powder", unit: "Litre" },
  { category: "Shake", name: "Strewberry Syrup", unit: "Litre" },
  { category: "Shake", name: "Black Current Crush", unit: "Litre" },
  { category: "Coffee", name: "Ice Cream", unit: "Litre" },
  { category: "Coffee", name: "Ice Cubes", unit: "Packet" },
  { category: "Water", name: "Mineral Water Bottle 250ml", unit: "Pcs" },
  { category: "Water", name: "Mineral Water Bottle 500ml", unit: "Pcs" },
  { category: "Water", name: "Mineral Water Bottle 1L", unit: "Pcs" },
  { category: "Water", name: "Mineral water Bottle 20 ltr", unit: "Pcs" },
  { category: "Maggi", name: "Maggi Noodles Pack", unit: "Pcs" },
  { category: "Maggi", name: "Maggi Masala", unit: "Packet" },
  { category: "Snacks", name: "Sweet Corns", unit: "Grams" },
  { category: "Snacks", name: "Peas", unit: "Grams" },
  { category: "Snacks", name: "Tomato Ketchup", unit: "Pcs" },
  { category: "Snacks", name: "Vegetables", unit: "Grams" },
  { category: "Snacks", name: "Paneer", unit: "Grams" },
  { category: "Toast", name: "Bread Packet", unit: "Packet" },
  { category: "Toast", name: "Butter", unit: "Grams" },
  { category: "Biscuit", name: "Biscuit (5 Rs)", unit: "Packet" },
  { category: "Biscuit", name: "Cookies Packet", unit: "Packet" },
  { category: "Biscuit", name: "Orea", unit: "Pcs" },
  { category: "Namkeen", name: "Namkeen Packet", unit: "Packet" },
  { category: "Namkeen", name: "Haldiram Chips", unit: "Packet" },
  { category: "Disposable", name: "Disposable Cups (Small)", unit: "Pcs" },
  { category: "Disposable", name: "Disposable Tea Cup (150 ml)", unit: "Pcs" },
  { category: "Disposable", name: "Disposable Coffee Cup (350 ml)", unit: "Pcs" },
  { category: "Disposable", name: "Disposable Staro", unit: "Packet" },
  { category: "Disposable", name: "Disposable Box", unit: "Pcs" },
  { category: "Disposable", name: "Disposable Dip (white)", unit: "Pcs" },
  { category: "Disposable", name: "Disposable Stailer", unit: "Packet" },
  { category: "Disposable", name: "Disposable Spoon", unit: "Packet" },
  { category: "Disposable", name: "Disposable foric", unit: "Packet" },
  { category: "Disposable", name: "Tissue / Napkins", unit: "Packet" },
  { category: "Cold Drink", name: "Cold drink (250 ml)", unit: "Pcs" },
  { category: "Cold Drink", name: "Lahori Jeera", unit: "Pcs" },
  { category: "Cold Drink", name: "Lemonate", unit: "Pcs" }
];

async function seed() {
  const stockRef = collection(db, "stock");
  console.log("Fetching existing items to avoid duplicates...");
  const snap = await getDocs(stockRef);
  const existingNames = new Set();
  snap.forEach(d => {
    existingNames.add(d.data().name || d.data().item);
  });

  console.log(`Found ${existingNames.size} existing items.`);
  let added = 0;

  for (const item of newItems) {
    if (!existingNames.has(item.name)) {
      await addDoc(stockRef, {
        category: item.category,
        name: item.name,
        unit: item.unit,
        qty: 0,
        minLimit: 10,
        dailyUsage: []
      });
      console.log(`Added ${item.name}`);
      added++;
    } else {
      console.log(`Skipped ${item.name} (already exists)`);
    }
  }

  console.log(`Successfully added ${added} new items.`);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
