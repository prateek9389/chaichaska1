const fs = require('fs');

// 1. UPDATE FIRESTORE.JS
const fsPath = 'lib/firestore.js';
let fsContent = fs.readFileSync(fsPath, 'utf8');

const fsTarget = `export async function getSubscriptions() {`;
const fsReplacement = `export async function addSubscription(data) {
  const ref = await addDoc(collection(db, "subscriptions"), { ...data, createdAt: Date.now() });
  return ref.id;
}

export async function getSubscriptions() {`;

if (fsContent.includes(fsTarget) && !fsContent.includes('addSubscription')) {
  fsContent = fsContent.replace(fsTarget, fsReplacement);
  fs.writeFileSync(fsPath, fsContent);
  console.log("Added addSubscription to firestore.js");
} else {
  console.log("Could not update firestore.js or already exists.");
}

// 2. UPDATE SUBSCRIBE PAGE
const subPath = 'app/subscribe/page.js';
let subContent = fs.readFileSync(subPath, 'utf8');

const importTarget = `import Link from "next/link";`;
const importReplacement = `import Link from "next/link";
import { addSubscription } from "@/lib/firestore";`;

if (subContent.includes(importTarget) && !subContent.includes('addSubscription')) {
  subContent = subContent.replace(importTarget, importReplacement);
}

const paymentLogicTarget = `  const handleTriggerPayment = () => {
    setPaymentStep("paying");
    setTimeout(() => {
      setPaymentStep("success");
    }, 2500);
  };`;

const paymentLogicReplacement = `  const handleTriggerPayment = async () => {
    setPaymentStep("paying");
    
    // Build subscription object
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Starts tomorrow
    const endDate = new Date(startDate);
    const durationDays = frequency === "morning" ? 30 : frequency === "evening" ? 12 : 8;
    endDate.setDate(endDate.getDate() + durationDays);

    const subData = {
      customer: "Guest User", // In a real app, from auth
      office: address || "Tower A, Floor 1",
      item: product.name,
      items: \`\${product.name} (\${sugarParam} sugar) \${addonsParam ? " + " + addonsParam : ""}\`,
      total: finalTotal,
      cost: finalTotal,
      price: finalTotal,
      timeSlot: frequency === "custom" ? customTime : frequency === "morning" ? "09:00" : "16:00",
      frequency: frequency.toUpperCase(),
      startDate: startDate.toLocaleDateString('en-GB'), // DD/MM/YYYY
      endDateIso: endDate.toISOString(),
      endDate: endDate.toLocaleDateString('en-GB'),
      status: "Active"
    };

    try {
      await addSubscription(subData);
    } catch (err) {
      console.error("Error saving subscription:", err);
    }

    setPaymentStep("success");
  };`;

if (subContent.includes(paymentLogicTarget)) {
  subContent = subContent.replace(paymentLogicTarget, paymentLogicReplacement);
  fs.writeFileSync(subPath, subContent);
  console.log("Updated subscribe page logic.");
} else {
  console.log("Could not update subscribe page logic.");
}
