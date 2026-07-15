/**
 * fixAdminFirebase.js
 * Replaces all hardcoded dummy data in admin/page.js with empty state initializers
 * and adds Firebase fetches for data not yet connected.
 */
const fs = require("fs");
const path = require("path");

const FILE = path.resolve(__dirname, "../app/admin/page.js");
let content = fs.readFileSync(FILE, "utf8");
let changeCount = 0;

function safeReplace(label, search, replacement) {
  if (content.includes(search)) {
    content = content.replace(search, replacement);
    changeCount++;
    console.log(`✅ ${label}`);
  } else {
    console.log(`⚠️  SKIP (not found): ${label}`);
  }
}

// ═══════════════════════════════════════════════════════
// 1. IMPORTS — add missing Firestore functions
// ═══════════════════════════════════════════════════════

// Add missing imports
if (!content.includes("getRestockRequests")) {
  safeReplace(
    "Add missing Firestore imports",
    "import { onOrdersSnapshot, getMenuItems, getCombos, getAddons, getStock, getFeedback, updateOrder, addMenuItem, addStockItem, updateStockItem, getSubscriptions }",
    "import { onOrdersSnapshot, getMenuItems, getCombos, getAddons, getStock, getFeedback, updateOrder, addMenuItem, addStockItem, updateStockItem, getSubscriptions, getRestockRequests, getRestockHistory, getLeaveRequests, getSettings }"
  );
}

// ═══════════════════════════════════════════════════════
// 2. ORDERS — clear hardcoded dummy orders
// ═══════════════════════════════════════════════════════

// Replace the entire dummy orders array with empty
const ordersStartMarker = `  const [orders, setOrders] = useState([`;
const ordersEndMarker = `  ]);

  // Today's Prep Tally`;

if (content.includes(ordersStartMarker) && content.includes(ordersEndMarker)) {
  const startIdx = content.indexOf(ordersStartMarker);
  const endIdx = content.indexOf(ordersEndMarker) + `  ]);`.length;
  const before = content.substring(0, startIdx);
  const after = content.substring(endIdx);
  content = before + `  const [orders, setOrders] = useState([]);` + after;
  changeCount++;
  console.log("✅ Cleared hardcoded orders array");
}

// ═══════════════════════════════════════════════════════
// 3. STOCKS — clear hardcoded dummy stock
// ═══════════════════════════════════════════════════════

const stockStartMarker = `  const [stocks, setStocks] = useState([
    { name: "Assam Loose Tea Leaves"`;
const stockEndMarker = `  ]);

  // Auto alerts and restock logs`;

if (content.includes(stockStartMarker) && content.includes(stockEndMarker)) {
  const startIdx = content.indexOf(stockStartMarker);
  const endIdx = content.indexOf(stockEndMarker) + `  ]);`.length;
  const before = content.substring(0, startIdx);
  const after = content.substring(endIdx);
  content = before + `  const [stocks, setStocks] = useState([]);` + after;
  changeCount++;
  console.log("✅ Cleared hardcoded stocks array");
}

// ═══════════════════════════════════════════════════════
// 4. RESTOCK HISTORY — clear hardcoded
// ═══════════════════════════════════════════════════════

safeReplace(
  "Clear hardcoded restockHistory",
  `const [restockHistory, setRestockHistory] = useState([
    { date: "02/07/2026", item: "Assam Loose Tea Leaves", qty: "20 Kg", source: "Jaipur Spices Ltd" },
    { date: "30/06/2026", item: "Whole Milk Cartons", qty: "50 Ltrs", source: "Jaipur Dairy Co-op" },
  ]);`,
  `const [restockHistory, setRestockHistory] = useState([]);`
);

// ═══════════════════════════════════════════════════════
// 5. RESTOCK REQUESTS — clear hardcoded
// ═══════════════════════════════════════════════════════

safeReplace(
  "Clear hardcoded restockRequests",
  `const [restockRequests, setRestockRequests] = useState([
    { item: "Green Cardamom Elaichi Pods", qty: "10 Kg", urgency: "High", notes: "Almost out of Elaichi base", date: "Just now", status: "Sent to Admin" }
  ]);`,
  `const [restockRequests, setRestockRequests] = useState([]);`
);

// ═══════════════════════════════════════════════════════
// 6. MENU ITEMS — clear hardcoded
// ═══════════════════════════════════════════════════════

const menuStartMarker = `  const [menuItems, setMenuItems] = useState([
    {
      name: "Classic Masala Chai",`;
const menuEndMarker = `    },
  ]);

  const [menuSubTab, setMenuSubTab]`;

if (content.includes(menuStartMarker) && content.includes(menuEndMarker)) {
  const startIdx = content.indexOf(menuStartMarker);
  const endIdx = content.indexOf(menuEndMarker);
  // Find the ]); right before menuSubTab
  const endOfMenuItems = content.indexOf(`  ]);

  const [menuSubTab, setMenuSubTab]`);
  const actualEnd = endOfMenuItems + `  ]);`.length;
  const before = content.substring(0, startIdx);
  const after = content.substring(actualEnd);
  content = before + `  const [menuItems, setMenuItems] = useState([]);` + after;
  changeCount++;
  console.log("✅ Cleared hardcoded menuItems array");
}

// ═══════════════════════════════════════════════════════
// 7. COMBOS — clear hardcoded
// ═══════════════════════════════════════════════════════

safeReplace(
  "Clear hardcoded combos",
  `const [combos, setCombos] = useState([
    { name: "Evening Rush Combo", items: "Classic Masala Chai + Almond Cookies", price: 199, active: true, desc: "A perfect hot masala brew paired with 2 crisp almond cookies." },
    { name: "Kesar Winter Booster", items: "Saffron Royal Chai + Saffron Biscuits", price: 299, active: true, desc: "Luxury Saffron tea served with premium custom saffron-dipped biscuits." }
  ]);`,
  `const [combos, setCombos] = useState([]);`
);

// ═══════════════════════════════════════════════════════
// 8. ADDONS — clear hardcoded
// ═══════════════════════════════════════════════════════

safeReplace(
  "Clear hardcoded addonsList",
  `const [addonsList, setAddonsList] = useState([
    { name: "Almond Cookies", price: 50, image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg", desc: "Crisp biscuits baked with almond flakes.", active: true },
    { name: "Almond Slivers Add-on", price: 30, image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg", desc: "Toasted sliced almonds to sprinkle.", active: true },
    { name: "Fresh Mint Leaves", price: 10, image: "/chai-ingredients.png", desc: "Hand-picked cooling mint leaves.", active: true }
  ]);`,
  `const [addonsList, setAddonsList] = useState([]);`
);

// ═══════════════════════════════════════════════════════
// 9. FEEDBACK — clear hardcoded
// ═══════════════════════════════════════════════════════

safeReplace(
  "Clear hardcoded feedbackList",
  `const [feedbackList, setFeedbackList] = useState([
    { orderId: "ORD-8102", customer: "Rohan V.", rating: 5, date: "09/12/2026", text: "Absolutely loved the warm cardamom notes! Perfectly balanced sweetness." },
    { orderId: "ORD-8101", customer: "Priya P.", rating: 4, date: "09/12/2026", text: "The saffron aroma is premium, but the milk was slightly thick today. Good effort!" },
    { orderId: "ORD-8098", customer: "Karan J.", rating: 5, date: "09/11/2026", text: "Kashmiri Kahwa is a lifesaver in these airconditioned office rooms." }
  ]);`,
  `const [feedbackList, setFeedbackList] = useState([]);`
);

// ═══════════════════════════════════════════════════════
// 10. LEAVE REQUESTS — clear hardcoded
// ═══════════════════════════════════════════════════════

safeReplace(
  "Clear hardcoded leaveRequests",
  `const [leaveRequests, setLeaveRequests] = useState([
    { start: "2026-07-10", end: "2026-07-12", reason: "Family Event", status: "Approved" }
  ]);`,
  `const [leaveRequests, setLeaveRequests] = useState([]);`
);

// ═══════════════════════════════════════════════════════
// 11. SUBSCRIPTIONS — clear hardcoded upcomingSubscriptions
// ═══════════════════════════════════════════════════════

safeReplace(
  "Clear hardcoded upcomingSubscriptions",
  `  // Subscriptions Due
  const upcomingSubscriptions = [
    { customer: "Rohan V.", floor: "Floor 4", time: "09:00 AM", items: "1x Masala Chai (Daily)" },
    { customer: "Meera J.", floor: "Floor 5", time: "11:30 AM", items: "1x Ginger Chai (Weekly)" },
  ];`,
  `  // Subscriptions Due — derived from live subscriptions
  const upcomingSubscriptions = subscriptions.filter(s => s.status === "Active").map(s => ({
    customer: s.customer || "Unknown",
    floor: s.floor || "",
    time: s.time || "",
    items: s.item || ""
  }));`
);

// ═══════════════════════════════════════════════════════
// 12. CUSTOMER MANAGEMENT — derive from orders
// ═══════════════════════════════════════════════════════

safeReplace(
  "Replace hardcoded customerManagement with derived data",
  `  // Customer Management Table
  const customerManagement = [
    { name: "John Bike Parts", orders: 10, value: "₹12,000", lastOrder: "09/12/2026", loyalty: "Gold" },
    { name: "Elite Cycling Co.", orders: 15, value: "₹25,000", lastOrder: "09/11/2026", loyalty: "Platinum" },
  ];`,
  `  // Customer Management — derived from live orders
  const customerManagement = (() => {
    const map = {};
    orders.forEach(o => {
      const name = o.customer || "Unknown";
      if (!map[name]) map[name] = { name, orders: 0, totalVal: 0, lastOrder: 0 };
      map[name].orders++;
      map[name].totalVal += parseInt(String(o.total || "0").replace(/[^0-9]/g, "")) || 0;
      map[name].lastOrder = Math.max(map[name].lastOrder, o.createdAt || 0);
    });
    return Object.values(map).map(c => ({
      name: c.name,
      orders: c.orders,
      value: "₹" + c.totalVal.toLocaleString("en-IN"),
      lastOrder: c.lastOrder ? new Date(c.lastOrder).toLocaleDateString("en-IN") : "-",
      loyalty: c.orders >= 15 ? "Platinum" : c.orders >= 8 ? "Gold" : c.orders >= 3 ? "Silver" : "New"
    })).sort((a, b) => b.orders - a.orders);
  })();`
);

// ═══════════════════════════════════════════════════════
// 13. EARNINGS / STATS SUMMARY — derive from orders
// ═══════════════════════════════════════════════════════

safeReplace(
  "Replace hardcoded statsSummary with derived data",
  `  // Earnings Summary Stats
  const statsSummary = {
    totalSales: "₹125,000",
    totalOrders: "450 orders",
    deliveryShipment: "560 Delivery",
    pendingShipment: "25 orders",
    avgOrderValue: "₹278/Order",
  };`,
  `  // Earnings Summary — derived from live orders
  const statsSummary = (() => {
    let totalVal = 0;
    let delivered = 0;
    let pending = 0;
    orders.forEach(o => {
      totalVal += parseInt(String(o.total || "0").replace(/[^0-9]/g, "")) || 0;
      if (o.status === "Delivered") delivered++;
      if (o.status === "Received" || o.status === "Pending" || o.status === "Preparing") pending++;
    });
    const avg = orders.length ? Math.round(totalVal / orders.length) : 0;
    return {
      totalSales: "₹" + totalVal.toLocaleString("en-IN"),
      totalOrders: orders.length + " orders",
      deliveryShipment: delivered + " Delivered",
      pendingShipment: pending + " pending",
      avgOrderValue: "₹" + avg + "/Order",
    };
  })();`
);

// ═══════════════════════════════════════════════════════
// 14. TODAY SETTLEMENTS — derive from orders
// ═══════════════════════════════════════════════════════

safeReplace(
  "Replace hardcoded todaySettlements with derived data",
  `  const todaySettlements = [
    { item: "Classic Masala Chai (24 units)", value: "₹3,576" },
    { item: "Saffron Royal Chai (9 units)", value: "₹2,241" },
    { item: "Ginger (Adrak) Chai (15 units)", value: "₹2,535" },
    { item: "Almond Cookies (30 units)", value: "₹1,500" },
  ];`,
  `  // Today's settlements — derived from today's orders
  const todaySettlements = (() => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayOrders = orders.filter(o => (o.createdAt || 0) >= todayStart.getTime());
    const itemMap = {};
    todayOrders.forEach(o => {
      const key = o.item || "Unknown";
      if (!itemMap[key]) itemMap[key] = { count: 0, value: 0 };
      itemMap[key].count++;
      itemMap[key].value += parseInt(String(o.total || "0").replace(/[^0-9]/g, "")) || 0;
    });
    return Object.entries(itemMap).map(([k, v]) => ({
      item: k + " (" + v.count + " units)",
      value: "₹" + v.value.toLocaleString("en-IN")
    }));
  })();`
);

// ═══════════════════════════════════════════════════════
// 15. HISTORY ORDERS — derive from orders
// ═══════════════════════════════════════════════════════

safeReplace(
  "Replace hardcoded historyOrders with derived data",
  `  const historyOrders = [
    { id: "#10230", customer: "Aarav Mehta", status: "Delivered", date: "09/12/2026 11:20 AM", total: "₹298", items: "2x Classic Masala Chai", customization: "Oat Milk, Low Sugar", office: "Office 402, Floor 4" },
    { id: "#10231", customer: "Priya Patel", status: "Delivered", date: "09/12/2026 10:45 AM", total: "₹450", items: "1x Saffron Royal Chai, 2x Ginger Chai", customization: "Mild Sugar, Cardamom", office: "Office 512, Floor 5" },
    { id: "#10232", customer: "Rohan Sharma", status: "Cancelled", date: "09/11/2026 04:15 PM", total: "₹169", items: "1x Ginger (Adrak) Chai", customization: "No Sugar", office: "Office 301, Floor 3" },
    { id: "#10233", customer: "Karan Johar", status: "Delivered", date: "09/11/2026 02:30 PM", total: "₹596", items: "2x Kashmiri Kahwa, 1x Saffron Royal Chai", customization: "Whole Milk, High Sweetness", office: "Office 508, Floor 5" },
  ];`,
  `  // History orders — derived from all completed/cancelled orders
  const historyOrders = orders.filter(o => o.status === "Delivered" || o.status === "Cancelled").map(o => ({
    id: o.id || o.orderId || "-",
    customer: o.customer || "Unknown",
    status: o.status,
    date: o.createdAt ? new Date(o.createdAt).toLocaleString("en-IN") : "-",
    total: o.total || "₹0",
    items: o.item || "-",
    customization: [o.milk, o.sugar].filter(Boolean).join(", ") || "-",
    office: o.office || "-"
  }));`
);

// ═══════════════════════════════════════════════════════
// 16. TODAY TALLY — derive from today's orders
// ═══════════════════════════════════════════════════════

safeReplace(
  "Replace hardcoded todayTally with derived data",
  `  // Today's Prep Tally
  const todayTally = {
    "Masala Chai": 24,
    "Cardamom Chai": 18,
    "Ginger Chai": 15,
    "Saffron Royal Chai": 9,
    "Almond Cookies": 30,
  };`,
  `  // Today's Prep Tally — derived from today's orders
  const todayTally = (() => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayOrders = orders.filter(o => (o.createdAt || 0) >= todayStart.getTime());
    const tally = {};
    todayOrders.forEach(o => {
      const key = o.item || "Unknown";
      tally[key] = (tally[key] || 0) + 1;
    });
    return tally;
  })();`
);

// ═══════════════════════════════════════════════════════
// 17. FLOOR BATCHES — derive from orders
// ═══════════════════════════════════════════════════════

safeReplace(
  "Replace hardcoded floorBatches with derived data",
  `  const floorBatches = [
    { floor: "Floor 5", items: "5x Masala Chai, 2x Cookies", status: "High Demand" },
    { floor: "Floor 3", items: "3x Ginger Chai, 4x Cookies", status: "Medium Demand" },
  ];`,
  `  // Floor batches — derived from active orders
  const floorBatches = (() => {
    const floorMap = {};
    const activeOrds = orders.filter(o => o.status === "Received" || o.status === "Pending" || o.status === "Preparing");
    activeOrds.forEach(o => {
      const floor = o.office || "Unknown";
      if (!floorMap[floor]) floorMap[floor] = { items: [], count: 0 };
      floorMap[floor].items.push(o.item || "Unknown");
      floorMap[floor].count++;
    });
    return Object.entries(floorMap).map(([f, v]) => ({
      floor: f,
      items: v.items.join(", "),
      status: v.count >= 5 ? "High Demand" : v.count >= 2 ? "Medium Demand" : "Low Demand"
    }));
  })();`
);

// ═══════════════════════════════════════════════════════
// 18. ADD FIREBASE FETCHES for restock/leave/settings
// ═══════════════════════════════════════════════════════

// Add missing fetches to the useEffect
safeReplace(
  "Add restockRequests fetch to useEffect",
  `    getSubscriptions().then(setSubscriptions);
    return () => unsubOrders();`,
  `    getSubscriptions().then(setSubscriptions);
    getRestockRequests().then(setRestockRequests);
    getRestockHistory().then(setRestockHistory);
    getLeaveRequests().then(setLeaveRequests);
    getSettings().then(s => {
      if (s) {
        if (s.workingHours) setWorkingHours(s.workingHours);
        if (s.shopName) setShopName(s.shopName);
        if (s.brewmasterName) setBrewmasterName(s.brewmasterName);
        if (s.brewmasterContact) setBrewmasterContact(s.brewmasterContact);
        if (s.brewmasterBio) setBrewmasterBio(s.brewmasterBio);
      }
    });
    return () => unsubOrders();`
);

// ═══════════════════════════════════════════════════════
// WRITE RESULT
// ═══════════════════════════════════════════════════════

fs.writeFileSync(FILE, content, "utf8");
console.log(`\n🎯 Done. Applied ${changeCount} changes to admin/page.js`);
