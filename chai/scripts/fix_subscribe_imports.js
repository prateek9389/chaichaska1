const fs = require('fs');

const subPath = 'app/subscribe/page.js';

const correctTop = `"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { addSubscription } from "@/lib/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function SubscriptionPortal() {
  const searchParams = useSearchParams();`;

let content = fs.readFileSync(subPath, 'utf8');

// The faulty tool replaced lines 1 to 13 with basically nothing, 
// leaving `const productId = parseInt(searchParams.get("productId")) || 1;` at the top!
if (content.startsWith('  const productId =')) {
  content = correctTop + '\n' + content;
  fs.writeFileSync(subPath, content);
  console.log("Restored top of subscribe page!");
} else {
  console.log("Not starting with productId, attempting regex");
}
