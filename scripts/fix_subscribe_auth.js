const fs = require('fs');
const subPath = 'app/subscribe/page.js';

let subContent = fs.readFileSync(subPath, 'utf8');

// We need to import useAuth
const importTarget = `import { addSubscription } from "@/lib/firestore";
import Navbar from "@/components/Navbar";`;

const importReplacement = `import { addSubscription } from "@/lib/firestore";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";`;

if (subContent.includes(importTarget)) {
  subContent = subContent.replace(importTarget, importReplacement);
}

// We need to use useAuth inside the component
const hookTarget = `function SubscriptionPortal() {
  const searchParams = useSearchParams();`;

const hookReplacement = `function SubscriptionPortal() {
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();`;

if (subContent.includes(hookTarget)) {
  subContent = subContent.replace(hookTarget, hookReplacement);
}

// And we need to use it in subData
const dataTarget = `    const subData = {
      customer: "Guest User", // In a real app, from auth`;

const dataReplacement = `    const subData = {
      customer: profile?.name || user?.displayName || "Guest User",`;

if (subContent.includes(dataTarget)) {
  subContent = subContent.replace(dataTarget, dataReplacement);
}

fs.writeFileSync(subPath, subContent);
console.log("Updated subscribe page with useAuth!");
