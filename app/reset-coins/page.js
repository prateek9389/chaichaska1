"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ResetCoins() {
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    async function run() {
      setStatus("Fetching users...");
      try {
        const snap = await getDocs(collection(db, "users"));
        setStatus(`Found ${snap.size} users. Updating...`);
        let count = 0;
        for (const userDoc of snap.docs) {
          await updateDoc(doc(db, "users", userDoc.id), { coins: 0 });
          count++;
          setStatus(`Updated ${count}/${snap.size}...`);
        }
        setStatus("All existing users have been reset to 0 coins! You can safely delete this page now.");
      } catch (err) {
        setStatus("Error: " + err.message);
      }
    }
    run();
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", fontSize: 20 }}>
      <h1>Database Migration</h1>
      <p>{status}</p>
    </div>
  );
}
