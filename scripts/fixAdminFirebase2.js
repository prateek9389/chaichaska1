/**
 * fixAdminFirebase2.js
 * Normalize line endings, then replace hardcoded dummy data in admin/page.js.
 */
const fs = require("fs");
const path = require("path");

const FILE = path.resolve(__dirname, "../app/admin/page.js");
// Normalize to \n for reliable matching, then write back with \r\n
let content = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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

// ── 1. todayTally ─────────────────────────────────
safeReplace("todayTally",
  `  // Today's Prep Tally\n  const todayTally = {\n    "Masala Chai": 24,\n    "Cardamom Chai": 18,\n    "Ginger Chai": 15,\n    "Saffron Royal Chai": 9,\n    "Almond Cookies": 30,\n  };`,
  `  // Today's Prep Tally — derived from today's orders\n  const todayTally = (() => {\n    const todayStart = new Date(); todayStart.setHours(0,0,0,0);\n    const todayOrders = orders.filter(o => (o.createdAt || 0) >= todayStart.getTime());\n    const tally = {};\n    todayOrders.forEach(o => { const key = o.item || "Unknown"; tally[key] = (tally[key] || 0) + 1; });\n    return tally;\n  })();`
);

// ── 2. floorBatches ───────────────────────────────
safeReplace("floorBatches",
  `  const floorBatches = [\n    { floor: "Floor 5", items: "5x Masala Chai, 2x Cookies", status: "High Demand" },\n    { floor: "Floor 3", items: "3x Ginger Chai, 4x Cookies", status: "Medium Demand" },\n  ];`,
  `  // Floor batches — derived from active orders\n  const floorBatches = (() => {\n    const floorMap = {};\n    orders.filter(o => o.status === "Received" || o.status === "Pending" || o.status === "Preparing").forEach(o => {\n      const floor = o.office || "Unknown";\n      if (!floorMap[floor]) floorMap[floor] = { items: [], count: 0 };\n      floorMap[floor].items.push(o.item || "Unknown");\n      floorMap[floor].count++;\n    });\n    return Object.entries(floorMap).map(([f, v]) => ({\n      floor: f,\n      items: v.items.join(", "),\n      status: v.count >= 5 ? "High Demand" : v.count >= 2 ? "Medium Demand" : "Low Demand"\n    }));\n  })();`
);

// ── 3. stocks ─────────────────────────────────────
safeReplace("stocks",
  `  // Stock\n  const [stocks, setStocks] = useState([\n    { name: "Assam Loose Tea Leaves", qty: "45 Kg Remaining", level: "In Stock", unitPrice: 350, unit: "Kg", supplier: "Jaipur Spices Ltd (+91 99999 11111)" },\n    { name: "Fresh Ginger Roots", qty: "12 Kg Remaining", level: "Low Stock", unitPrice: 120, unit: "Kg", supplier: "Alwar Organic Farms (+91 88888 22222)" },\n    { name: "Green Cardamom Elaichi Pods", qty: "2.5 Kg Remaining", level: "Low Stock", unitPrice: 1800, unit: "Kg", supplier: "Kerala Plantation Direct (+91 77777 33333)" },\n    { name: "Organic Kashmiri Saffron", qty: "80 Grams Remaining", level: "Low Stock", unitPrice: 280, unit: "Grams", supplier: "Pampore Saffron Valley (+91 66666 44444)" },\n    { name: "Whole Milk Cartons", qty: "5 Ltrs Remaining", level: "Out of Stock", unitPrice: 65, unit: "Ltrs", supplier: "Jaipur Dairy Co-op (+91 55555 55555)" },\n  ]);`,
  `  // Stock — fetched from Firebase\n  const [stocks, setStocks] = useState([]);`
);

// ── 4. restockHistory ─────────────────────────────
safeReplace("restockHistory",
  `  const [restockHistory, setRestockHistory] = useState([\n    { date: "02/07/2026", item: "Assam Loose Tea Leaves", qty: "20 Kg", source: "Jaipur Spices Ltd" },\n    { date: "30/06/2026", item: "Whole Milk Cartons", qty: "50 Ltrs", source: "Jaipur Dairy Co-op" },\n  ]);`,
  `  const [restockHistory, setRestockHistory] = useState([]);`
);

// ── 5. restockRequests ────────────────────────────
safeReplace("restockRequests",
  `  const [restockRequests, setRestockRequests] = useState([\n    { item: "Green Cardamom Elaichi Pods", qty: "10 Kg", urgency: "High", notes: "Almost out of Elaichi base", date: "Just now", status: "Sent to Admin" }\n  ]);`,
  `  const [restockRequests, setRestockRequests] = useState([]);`
);

// ── 6. customerManagement ─────────────────────────
safeReplace("customerManagement",
  `  // Customer Management Table\n  const customerManagement = [\n    { name: "John Bike Parts", orders: 10, value: "₹12,000", lastOrder: "09/12/2026", loyalty: "Gold" },\n    { name: "Elite Cycling Co.", orders: 15, value: "₹25,000", lastOrder: "09/11/2026", loyalty: "Platinum" },\n  ];`,
  `  // Customer Management — derived from live orders\n  const customerManagement = (() => {\n    const map = {};\n    orders.forEach(o => {\n      const name = o.customer || "Unknown";\n      if (!map[name]) map[name] = { name, orders: 0, totalVal: 0, lastOrder: 0 };\n      map[name].orders++;\n      map[name].totalVal += parseInt(String(o.total || "0").replace(/[^0-9]/g, "")) || 0;\n      map[name].lastOrder = Math.max(map[name].lastOrder, o.createdAt || 0);\n    });\n    return Object.values(map).map(c => ({\n      name: c.name,\n      orders: c.orders,\n      value: "₹" + c.totalVal.toLocaleString("en-IN"),\n      lastOrder: c.lastOrder ? new Date(c.lastOrder).toLocaleDateString("en-IN") : "-",\n      loyalty: c.orders >= 15 ? "Platinum" : c.orders >= 8 ? "Gold" : c.orders >= 3 ? "Silver" : "New"\n    })).sort((a, b) => b.orders - a.orders);\n  })();`
);

// ── 7. statsSummary ───────────────────────────────
safeReplace("statsSummary",
  `  // Earnings Summary Stats\n  const statsSummary = {\n    totalSales: "₹125,000",\n    totalOrders: "450 orders",\n    deliveryShipment: "560 Delivery",\n    pendingShipment: "25 orders",\n    avgOrderValue: "₹278/Order",\n  };`,
  `  // Earnings Summary — derived from live orders\n  const statsSummary = (() => {\n    let totalVal = 0, delivered = 0, pending = 0;\n    orders.forEach(o => {\n      totalVal += parseInt(String(o.total || "0").replace(/[^0-9]/g, "")) || 0;\n      if (o.status === "Delivered") delivered++;\n      if (o.status === "Received" || o.status === "Pending" || o.status === "Preparing") pending++;\n    });\n    const avg = orders.length ? Math.round(totalVal / orders.length) : 0;\n    return {\n      totalSales: "₹" + totalVal.toLocaleString("en-IN"),\n      totalOrders: orders.length + " orders",\n      deliveryShipment: delivered + " Delivered",\n      pendingShipment: pending + " pending",\n      avgOrderValue: "₹" + avg + "/Order",\n    };\n  })();`
);

// ── 8. todaySettlements ───────────────────────────
safeReplace("todaySettlements",
  `  const todaySettlements = [\n    { item: "Classic Masala Chai (24 units)", value: "₹3,576" },\n    { item: "Saffron Royal Chai (9 units)", value: "₹2,241" },\n    { item: "Ginger (Adrak) Chai (15 units)", value: "₹2,535" },\n    { item: "Almond Cookies (30 units)", value: "₹1,500" },\n  ];`,
  `  // Today's settlements — derived from today's orders\n  const todaySettlements = (() => {\n    const todayStart = new Date(); todayStart.setHours(0,0,0,0);\n    const todayOrders = orders.filter(o => (o.createdAt || 0) >= todayStart.getTime());\n    const itemMap = {};\n    todayOrders.forEach(o => {\n      const key = o.item || "Unknown";\n      if (!itemMap[key]) itemMap[key] = { count: 0, value: 0 };\n      itemMap[key].count++;\n      itemMap[key].value += parseInt(String(o.total || "0").replace(/[^0-9]/g, "")) || 0;\n    });\n    return Object.entries(itemMap).map(([k, v]) => ({\n      item: k + " (" + v.count + " units)",\n      value: "₹" + v.value.toLocaleString("en-IN")\n    }));\n  })();`
);

// ── 9. historyOrders ──────────────────────────────
safeReplace("historyOrders",
  `  const historyOrders = [\n    { id: "#10230", customer: "Aarav Mehta", status: "Delivered", date: "09/12/2026 11:20 AM", total: "₹298", items: "2x Classic Masala Chai", customization: "Oat Milk, Low Sugar", office: "Office 402, Floor 4" },\n    { id: "#10231", customer: "Priya Patel", status: "Delivered", date: "09/12/2026 10:45 AM", total: "₹450", items: "1x Saffron Royal Chai, 2x Ginger Chai", customization: "Mild Sugar, Cardamom", office: "Office 512, Floor 5" },\n    { id: "#10232", customer: "Rohan Sharma", status: "Cancelled", date: "09/11/2026 04:15 PM", total: "₹169", items: "1x Ginger (Adrak) Chai", customization: "No Sugar", office: "Office 301, Floor 3" },\n    { id: "#10233", customer: "Karan Johar", status: "Delivered", date: "09/11/2026 02:30 PM", total: "₹596", items: "2x Kashmiri Kahwa, 1x Saffron Royal Chai", customization: "Whole Milk, High Sweetness", office: "Office 508, Floor 5" },\n  ];`,
  `  // History orders — derived from completed/cancelled orders\n  const historyOrders = orders.filter(o => o.status === "Delivered" || o.status === "Cancelled").map(o => ({\n    id: o.id || o.orderId || "-",\n    customer: o.customer || "Unknown",\n    status: o.status,\n    date: o.createdAt ? new Date(o.createdAt).toLocaleString("en-IN") : "-",\n    total: o.total || "₹0",\n    items: o.item || "-",\n    customization: [o.milk, o.sugar].filter(Boolean).join(", ") || "-",\n    office: o.office || "-"\n  }));`
);

// ── 10. menuItems ─────────────────────────────────
// This one is tricky — find from start to end
const menuStart = '  const [menuItems, setMenuItems] = useState([\n    {\n      name: "Classic Masala Chai",';
if (content.includes(menuStart)) {
  const startIdx = content.indexOf(menuStart);
  // Find the closing ]);  before menuSubTab
  const afterStart = content.indexOf('  const [menuSubTab, setMenuSubTab]', startIdx);
  if (afterStart !== -1) {
    // Walk backward to find ]);
    const closingBracket = content.lastIndexOf('  ]);', afterStart);
    if (closingBracket > startIdx) {
      const endIdx = closingBracket + '  ]);'.length;
      content = content.substring(0, startIdx) + '  const [menuItems, setMenuItems] = useState([]);' + content.substring(endIdx);
      changeCount++;
      console.log("✅ menuItems");
    }
  }
}

// ── 11. combos ────────────────────────────────────
safeReplace("combos",
  `  const [combos, setCombos] = useState([\n    { name: "Evening Rush Combo", items: "Classic Masala Chai + Almond Cookies", price: 199, active: true, desc: "A perfect hot masala brew paired with 2 crisp almond cookies." },\n    { name: "Kesar Winter Booster", items: "Saffron Royal Chai + Saffron Biscuits", price: 299, active: true, desc: "Luxury Saffron tea served with premium custom saffron-dipped biscuits." }\n  ]);`,
  `  const [combos, setCombos] = useState([]);`
);

// ── 12. addonsList ────────────────────────────────
safeReplace("addonsList",
  `  const [addonsList, setAddonsList] = useState([\n    { name: "Almond Cookies", price: 50, image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg", desc: "Crisp biscuits baked with almond flakes.", active: true },\n    { name: "Almond Slivers Add-on", price: 30, image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg", desc: "Toasted sliced almonds to sprinkle.", active: true },\n    { name: "Fresh Mint Leaves", price: 10, image: "/chai-ingredients.png", desc: "Hand-picked cooling mint leaves.", active: true }\n  ]);`,
  `  const [addonsList, setAddonsList] = useState([]);`
);

// ── 13. upcomingSubscriptions ─────────────────────
safeReplace("upcomingSubscriptions",
  `  // Subscriptions Due\n  const upcomingSubscriptions = [\n    { customer: "Rohan V.", floor: "Floor 4", time: "09:00 AM", items: "1x Masala Chai (Daily)" },\n    { customer: "Meera J.", floor: "Floor 5", time: "11:30 AM", items: "1x Ginger Chai (Weekly)" },\n  ];`,
  `  // Subscriptions Due — derived from live subscriptions\n  const upcomingSubscriptions = subscriptions.filter(s => s.status === "Active").map(s => ({\n    customer: s.customer || "Unknown",\n    floor: s.floor || "",\n    time: s.time || "",\n    items: s.item || ""\n  }));`
);

// ── 14. feedbackList ──────────────────────────────
safeReplace("feedbackList",
  `  const [feedbackList, setFeedbackList] = useState([\n    { orderId: "ORD-8102", customer: "Rohan V.", rating: 5, date: "09/12/2026", text: "Absolutely loved the warm cardamom notes! Perfectly balanced sweetness." },\n    { orderId: "ORD-8101", customer: "Priya P.", rating: 4, date: "09/12/2026", text: "The saffron aroma is premium, but the milk was slightly thick today. Good effort!" },\n    { orderId: "ORD-8098", customer: "Karan J.", rating: 5, date: "09/11/2026", text: "Kashmiri Kahwa is a lifesaver in these airconditioned office rooms." }\n  ]);`,
  `  const [feedbackList, setFeedbackList] = useState([]);`
);

// ── 15. leaveRequests ─────────────────────────────
safeReplace("leaveRequests",
  `  const [leaveRequests, setLeaveRequests] = useState([\n    { start: "2026-07-10", end: "2026-07-12", reason: "Family Event", status: "Approved" }\n  ]);`,
  `  const [leaveRequests, setLeaveRequests] = useState([]);`
);

// ── 16. hardcoded orders (the big dummy array) ────
const ordersStart = '  const [orders, setOrders] = useState([\n    {\n      id: "#10234",';
if (content.includes(ordersStart)) {
  const startIdx = content.indexOf(ordersStart);
  // Find end marker: the line before todayTally or the next state declaration
  const marker = '  // Today\'s Prep Tally';
  const endSection = content.indexOf(marker, startIdx);
  if (endSection !== -1) {
    // Walk backward from marker to find ]);
    const closingBracket = content.lastIndexOf('  ]);', endSection);
    if (closingBracket > startIdx) {
      const endIdx = closingBracket + '  ]);'.length;
      content = content.substring(0, startIdx) + '  const [orders, setOrders] = useState([]);' + content.substring(endIdx);
      changeCount++;
      console.log("✅ orders (dummy array cleared)");
    }
  }
}

// Convert back to \r\n for Windows
content = content.replace(/\n/g, "\r\n");
fs.writeFileSync(FILE, content, "utf8");
console.log(`\n🎯 Done. Applied ${changeCount} changes to admin/page.js`);
