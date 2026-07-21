const { initializeApp } = require("firebase/app");
const { getFirestore, getDocs, collection } = require("firebase/firestore");
const path = require("path");
const fs = require("fs");

const envPath = path.resolve(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) return;
  process.env[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
});

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function checkFeedback() {
  const snap = await getDocs(collection(db, "feedback"));
  snap.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
  process.exit(0);
}
checkFeedback();
