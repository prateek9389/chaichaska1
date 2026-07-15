// Seed script — run once with: node scripts/seed.js
// Seeds ALL Firestore collections with initial data

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, collection, addDoc } = require("firebase/firestore");
const path = require("path");
const fs = require("fs");

// ── Load .env.local manually ────────────────────────────────────────────────
const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex === -1) return;
  process.env[trimmed.slice(0, eqIndex).trim()] = trimmed.slice(eqIndex + 1).trim();
});

// ── Firebase init ───────────────────────────────────────────────────────────
const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
});
const db = getFirestore(app);

// ═══════════════════════════════════════════════════════════════════════════
// 1. PRODUCTS (10 items)
// ═══════════════════════════════════════════════════════════════════════════
const products = [
  {
    id: 1,
    name: "Classic Masala Chai",
    desc: "Robust Assam black tea hand-blended with ginger, cardamom, cinnamon, and cloves.",
    price: "₹149",
    priceNum: 149,
    category: "Masala",
    caffeine: "high",
    sweetness: "unsweetened",
    steepTime: "traditional",
    pairing: "biscuits",
    image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
    rating: "4.8",
    color: "#8a583c",
    bullets: ["Strong robust Assam tea base", "Hand-crushed winter spices", "No artificial sweeteners"],
    gallery: [
      { type: "image", url: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg" },
      { type: "video", url: "/tea-hover.mp4" },
      { type: "image", url: "https://i.pinimg.com/webp/1200x/3b/64/27/3b6427d4563c2b05d8b0dd54ec265c2c.webp" },
    ],
  },
  {
    id: 2,
    name: "Cardamom (Elaichi) Chai",
    desc: "Rich, fragrant infusion of crushed green cardamom pods and premium CTC granules.",
    price: "₹169",
    priceNum: 169,
    category: "Cardamom",
    caffeine: "high",
    sweetness: "unsweetened",
    steepTime: "traditional",
    pairing: "rusks",
    image: "https://i.pinimg.com/1200x/5c/b8/8a/5cb88a02e013987379378009ba8d7eb2.jpg",
    rating: "4.9",
    color: "#a67c52",
    bullets: ["Authentic green cardamom pods", "Freshly packed CTC granules", "Rich creamy texture"],
    gallery: [
      { type: "image", url: "https://i.pinimg.com/1200x/5c/b8/8a/5cb88a02e013987379378009ba8d7eb2.jpg" },
      { type: "video", url: "/tea-hover.mp4" },
      { type: "image", url: "https://i.pinimg.com/webp/1200x/a2/54/ab/a254ab3176f62d952a39db1c7a2a6a2b.webp" },
    ],
  },
  {
    id: 3,
    name: "Ginger (Adrak) Chai",
    desc: "Invigorating immunity booster brewed with fresh, spicy grated ginger root.",
    price: "₹169",
    priceNum: 169,
    category: "Ginger",
    caffeine: "high",
    sweetness: "unsweetened",
    steepTime: "traditional",
    pairing: "rusks",
    image: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg",
    rating: "4.7",
    color: "#c49a6c",
    bullets: ["Grated fresh farm ginger", "Perfect for winter season", "Fights cough and cold"],
    gallery: [
      { type: "image", url: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg" },
      { type: "video", url: "/tea-hover.mp4" },
      { type: "image", url: "https://i.pinimg.com/webp/1200x/3b/64/27/3b6427d4563c2b05d8b0dd54ec265c2c.webp" },
    ],
  },
  {
    id: 4,
    name: "Saffron (Kesar) Royal Chai",
    desc: "Luxurious royal golden blend loaded with Kashmiri Kesar strands and cardamom.",
    price: "₹249",
    priceNum: 249,
    category: "Saffron",
    caffeine: "medium",
    sweetness: "mild",
    steepTime: "slow",
    pairing: "cookies",
    image: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
    rating: "5.0",
    color: "#e6ad12",
    bullets: ["Luxury Kashmiri Kesar strands", "Slow cooked milk infusion", "Rich royal aromatic profile"],
    gallery: [
      { type: "image", url: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg" },
      { type: "video", url: "/tea-hover.mp4" },
      { type: "image", url: "https://i.pinimg.com/webp/1200x/a2/54/ab/a254ab3176f62d952a39db1c7a2a6a2b.webp" },
    ],
  },
  {
    id: 5,
    name: "Tandoori Smoky Chai",
    desc: "Unique clay-pot baked malty tea with natural mineral qualities and a robust smoky note.",
    price: "₹199",
    priceNum: 199,
    category: "Masala",
    caffeine: "high",
    sweetness: "unsweetened",
    steepTime: "slow",
    pairing: "samosas",
    image: "https://i.pinimg.com/736x/f4/bf/80/f4bf80502363c42324e7126f07b612ad.jpg",
    rating: "4.8",
    color: "#ab704d",
    bullets: ["Tandoor heated kulhad bake", "Earthy mineral clay properties", "Bold malty smoky taste"],
    gallery: [
      { type: "image", url: "https://i.pinimg.com/736x/f4/bf/80/f4bf80502363c42324e7126f07b612ad.jpg" },
      { type: "video", url: "/tea-hover.mp4" },
      { type: "image", url: "https://i.pinimg.com/webp/1200x/3b/64/27/3b6427d4563c2b05d8b0dd54ec265c2c.webp" },
    ],
  },
  {
    id: 6,
    name: "Kashmiri Kahwa",
    desc: "Exquisite green tea brewed with whole saffron strands, cinnamon, and raw almond slivers.",
    price: "₹219",
    priceNum: 219,
    category: "Organic Greens",
    caffeine: "medium",
    sweetness: "mild",
    steepTime: "quick",
    pairing: "cookies",
    image: "https://i.pinimg.com/736x/c4/a8/cc/c4a8ccde9a67e5f24e2be4d0621f4186.jpg",
    rating: "4.9",
    color: "#5c7a4d",
    bullets: ["Whole leaf green tea", "Garnished with fresh almonds", "Deep golden saffron look"],
    gallery: [
      { type: "image", url: "https://i.pinimg.com/736x/c4/a8/cc/c4a8ccde9a67e5f24e2be4d0621f4186.jpg" },
      { type: "video", url: "/tea-hover.mp4" },
      { type: "image", url: "https://i.pinimg.com/webp/1200x/a2/54/ab/a254ab3176f62d952a39db1c7a2a6a2b.webp" },
    ],
  },
  {
    id: 7,
    name: "Rose Petal Herbal Infusion",
    desc: "Calming caffeine-free blend of dried red rose petals, fennel, and licorice root.",
    price: "₹189",
    priceNum: 189,
    category: "Herbal Infusions",
    caffeine: "none",
    sweetness: "mild",
    steepTime: "quick",
    pairing: "biscuits",
    image: "https://i.pinimg.com/webp/1200x/3b/64/27/3b6427d4563c2b05d8b0dd54ec265c2c.webp",
    rating: "4.6",
    color: "#c45b7a",
    bullets: ["Pure dried rose petals", "Caffeine-free blend", "Calming and aromatic"],
    gallery: [
      { type: "image", url: "https://i.pinimg.com/webp/1200x/3b/64/27/3b6427d4563c2b05d8b0dd54ec265c2c.webp" },
      { type: "video", url: "/tea-hover.mp4" },
      { type: "image", url: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg" },
    ],
  },
  {
    id: 8,
    name: "Tulsi Holy Basil Chai",
    desc: "Stress-relieving wellness tea blending holy basil leaves with premium CTC tea.",
    price: "₹159",
    priceNum: 159,
    category: "Herbal Infusions",
    caffeine: "high",
    sweetness: "unsweetened",
    steepTime: "traditional",
    pairing: "biscuits",
    image: "https://i.pinimg.com/webp/1200x/a2/54/ab/a254ab3176f62d952a39db1c7a2a6a2b.webp",
    rating: "4.8",
    color: "#4a7c3f",
    bullets: ["Fresh holy basil leaves", "Wellness immunity booster", "Traditional Ayurvedic recipe"],
    gallery: [
      { type: "image", url: "https://i.pinimg.com/webp/1200x/a2/54/ab/a254ab3176f62d952a39db1c7a2a6a2b.webp" },
      { type: "video", url: "/tea-hover.mp4" },
      { type: "image", url: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg" },
    ],
  },
  {
    id: 9,
    name: "Darjeeling First Flush",
    desc: "Delicate and floral single-estate black tea harvested during early spring.",
    price: "₹299",
    priceNum: 299,
    category: "Organic Greens",
    caffeine: "medium",
    sweetness: "unsweetened",
    steepTime: "quick",
    pairing: "cookies",
    image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
    rating: "4.9",
    color: "#6b4e2e",
    bullets: ["Single-estate harvest", "First flush spring pick", "Delicate floral notes"],
    gallery: [
      { type: "image", url: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg" },
      { type: "video", url: "/tea-hover.mp4" },
      { type: "image", url: "https://i.pinimg.com/1200x/5c/b8/8a/5cb88a02e013987379378009ba8d7eb2.jpg" },
    ],
  },
  {
    id: 10,
    name: "Organic Matcha Latte Mix",
    desc: "Finely ground premium Japanese Uji stone-ground green tea leaves.",
    price: "₹349",
    priceNum: 349,
    category: "Organic Greens",
    caffeine: "high",
    sweetness: "sweetened",
    steepTime: "quick",
    pairing: "cookies",
    image: "https://i.pinimg.com/1200x/5c/b8/8a/5cb88a02e013987379378009ba8d7eb2.jpg",
    rating: "4.9",
    color: "#3d7a44",
    bullets: ["Japanese Uji matcha grade", "Stone-ground to fine powder", "Rich umami flavor"],
    gallery: [
      { type: "image", url: "https://i.pinimg.com/1200x/5c/b8/8a/5cb88a02e013987379378009ba8d7eb2.jpg" },
      { type: "video", url: "/tea-hover.mp4" },
      { type: "image", url: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg" },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 2. ADDONS (4 items)
// ═══════════════════════════════════════════════════════════════════════════
const addons = [
  { id: "a1", name: "Premium Clay Kulhad Set", price: "₹120", priceNum: 120, image: "https://i.pinimg.com/webp/1200x/a2/54/ab/a254ab3176f62d952a39db1c7a2a6a2b.webp", desc: "Authentic handmade clay kulhads for traditional taste.", active: true },
  { id: "a2", name: "Organic Jaggery Powder", price: "₹65", priceNum: 65, image: "https://i.pinimg.com/webp/1200x/3b/64/27/3b6427d4563c2b05d8b0dd54ec265c2c.webp", desc: "Pure organic jaggery sweetener.", active: true },
  { id: "a3", name: "Cardamom Crispy Rusk", price: "₹45", priceNum: 45, image: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg", desc: "Crisp cardamom-flavored rusks perfect with chai.", active: true },
  { id: "a4", name: "Almond Cookies", price: "₹89", priceNum: 89, image: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg", desc: "Crisp biscuits baked with almond flakes.", active: true },
];

// ═══════════════════════════════════════════════════════════════════════════
// 3. COUPONS (2 codes)
// ═══════════════════════════════════════════════════════════════════════════
const coupons = [
  { code: "CHAICLUB", type: "flat", value: 50, label: "CHAICLUB (₹50 Off)", active: true },
  { code: "FIRSTCHAI", type: "percent", value: 20, label: "FIRSTCHAI (20% Off)", active: true },
];

// ═══════════════════════════════════════════════════════════════════════════
// 4. STOCK (5 ingredients)
// ═══════════════════════════════════════════════════════════════════════════
const stock = [
  { name: "Assam Loose Tea Leaves", qty: "45 Kg Remaining", level: "In Stock", unitPrice: 350, unit: "Kg", supplier: "Jaipur Spices Ltd (+91 99999 11111)" },
  { name: "Fresh Ginger Roots", qty: "12 Kg Remaining", level: "Low Stock", unitPrice: 120, unit: "Kg", supplier: "Alwar Organic Farms (+91 88888 22222)" },
  { name: "Green Cardamom Elaichi Pods", qty: "2.5 Kg Remaining", level: "Low Stock", unitPrice: 1800, unit: "Kg", supplier: "Kerala Plantation Direct (+91 77777 33333)" },
  { name: "Organic Kashmiri Saffron", qty: "80 Grams Remaining", level: "Low Stock", unitPrice: 280, unit: "Grams", supplier: "Pampore Saffron Valley (+91 66666 44444)" },
  { name: "Whole Milk Cartons", qty: "5 Ltrs Remaining", level: "Out of Stock", unitPrice: 65, unit: "Ltrs", supplier: "Jaipur Dairy Co-op (+91 55555 55555)" },
];

// ═══════════════════════════════════════════════════════════════════════════
// 5. MENU ITEMS (3 items)
// ═══════════════════════════════════════════════════════════════════════════
const menuItems = [
  {
    name: "Classic Masala Chai", price: 149, active: true,
    image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
    desc: "Our signature blend brewed with freshly ground whole spices.",
    category: "Chai", unit: "Kulhad", veg: true, prepTime: "8 mins",
    minQty: 1, maxQty: 12, isSpecial: true, approvalStatus: "Approved",
    scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], timeSlot: "All Day",
    linkedIngredients: ["Assam Loose Tea Leaves"],
  },
  {
    name: "Ginger (Adrak) Chai", price: 169, active: true,
    image: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg",
    desc: "Warm and soothing brew infusing robust Assam CTC with grated farm ginger.",
    category: "Chai", unit: "Cup", veg: true, prepTime: "6 mins",
    minQty: 1, maxQty: 10, isSpecial: false, approvalStatus: "Approved",
    scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], timeSlot: "All Day",
    linkedIngredients: ["Fresh Ginger Roots"],
  },
  {
    name: "Saffron Royal Chai", price: 249, active: true,
    image: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
    desc: "Fragrant luxury Kashmiri saffron strands infused with sweet milk.",
    category: "Chai", unit: "Kulhad", veg: true, prepTime: "12 mins",
    minQty: 1, maxQty: 6, isSpecial: false, approvalStatus: "Approved",
    scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], timeSlot: "Evening Only",
    linkedIngredients: ["Organic Kashmiri Saffron"],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 6. COMBOS (2 items)
// ═══════════════════════════════════════════════════════════════════════════
const combos = [
  { name: "Evening Rush Combo", items: "Classic Masala Chai + Almond Cookies", price: 199, active: true, desc: "A perfect hot masala brew paired with 2 crisp almond cookies." },
  { name: "Kesar Winter Booster", items: "Saffron Royal Chai + Saffron Biscuits", price: 299, active: true, desc: "Luxury Saffron tea served with premium custom saffron-dipped biscuits." },
];

// ═══════════════════════════════════════════════════════════════════════════
// 7. FEEDBACK (3 reviews)
// ═══════════════════════════════════════════════════════════════════════════
const feedback = [
  { orderId: "ORD-8102", customer: "Rohan V.", rating: 5, date: "09/12/2026", text: "Absolutely loved the warm cardamom notes! Perfectly balanced sweetness.", createdAt: Date.now() - 86400000 },
  { orderId: "ORD-8101", customer: "Priya P.", rating: 4, date: "09/12/2026", text: "The saffron aroma is premium, but the milk was slightly thick today. Good effort!", createdAt: Date.now() - 172800000 },
  { orderId: "ORD-8098", customer: "Karan J.", rating: 5, date: "09/11/2026", text: "Kashmiri Kahwa is a lifesaver in these airconditioned office rooms.", createdAt: Date.now() - 259200000 },
];

// ═══════════════════════════════════════════════════════════════════════════
// 8. SETTINGS
// ═══════════════════════════════════════════════════════════════════════════
const settings = {
  shopName: "ChaiCo Jaipur HQ",
  workingHours: "8:00 AM - 6:00 PM",
  brewmasterName: "Chef Kanti Lal",
  brewmasterContact: "+91 98765 43210",
  brewmasterBio: "Specialist in traditional spice infusions, kulhad brewing, and custom spice blends with 6+ years of corporate hospitality experience.",
};

// ═══════════════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════
async function seedAll() {
  console.log("🍵 Seeding ALL Firestore collections...\n");

  // 1. Products
  console.log("📦 Seeding products...");
  for (const p of products) {
    await setDoc(doc(db, "products", String(p.id)), p);
    console.log(`  ✅ [${p.id}] ${p.name}`);
  }

  // 2. Addons
  console.log("\n🧁 Seeding addons...");
  for (const a of addons) {
    await setDoc(doc(db, "addons", a.id), a);
    console.log(`  ✅ ${a.name}`);
  }

  // 3. Coupons
  console.log("\n🎟️  Seeding coupons...");
  for (const c of coupons) {
    await setDoc(doc(db, "coupons", c.code), c);
    console.log(`  ✅ ${c.code} — ${c.label}`);
  }

  // 4. Stock
  console.log("\n📊 Seeding stock...");
  for (let i = 0; i < stock.length; i++) {
    await setDoc(doc(db, "stock", `stock-${i + 1}`), stock[i]);
    console.log(`  ✅ ${stock[i].name}`);
  }

  // 5. Menu Items
  console.log("\n📋 Seeding menuItems...");
  for (let i = 0; i < menuItems.length; i++) {
    await setDoc(doc(db, "menuItems", `menu-${i + 1}`), menuItems[i]);
    console.log(`  ✅ ${menuItems[i].name}`);
  }

  // 6. Combos
  console.log("\n🎯 Seeding combos...");
  for (let i = 0; i < combos.length; i++) {
    await setDoc(doc(db, "combos", `combo-${i + 1}`), combos[i]);
    console.log(`  ✅ ${combos[i].name}`);
  }

  // 7. Feedback
  console.log("\n💬 Seeding feedback...");
  for (let i = 0; i < feedback.length; i++) {
    await setDoc(doc(db, "feedback", `fb-${i + 1}`), feedback[i]);
    console.log(`  ✅ ${feedback[i].customer}: "${feedback[i].text.substring(0, 40)}..."`);
  }

  // 8. Settings
  console.log("\n⚙️  Seeding settings...");
  await setDoc(doc(db, "settings", "general"), settings);
  console.log(`  ✅ ${settings.shopName}`);

  console.log("\n🎉 All 8 collections seeded successfully!");
  process.exit(0);
}

seedAll().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
