const fs = require('fs');
let content = fs.readFileSync('app/chaimaker/page.js', 'utf8');

// 1. Replace the hardcoded "John Hardward" operator name
content = content.replace(
  /<h1 className="operator-title">John Hardward<\/h1>/g,
  `<h1 className="operator-title">{brewmasterName || "Chai Operator"}</h1>`
);
console.log('Replaced John Hardward with dynamic brewmasterName');

// 2. Replace "450 orders" stat
content = content.replace(
  /<strong[^>]*>450 orders<\/strong>/g,
  `<strong style={{ fontSize: "22px", color: "#2c1b0d" }}>{orders.length} orders</strong>`
);
// Also handle the statsSummary.totalOrders reference
content = content.replace(/statsSummary\.totalOrders/g, `orders.length + " orders"`);
console.log('Replaced 450 orders with dynamic count');

// 3. Replace "560 Delivery" stat
content = content.replace(
  /<strong[^>]*>560 Delivery<\/strong>/g,
  `<strong style={{ fontSize: "22px", color: "#2c1b0d" }}>{orders.filter(o => o.status === "Delivered" || o.status === "delivered").length} Delivered</strong>`
);
content = content.replace(/statsSummary\.deliveryShipment/g, `orders.filter(o => o.status === "Delivered" || o.status === "delivered").length + " Delivered"`);
console.log('Replaced 560 Delivery with dynamic count');

// 4. Replace "25 orders" pending stat
content = content.replace(
  /<strong[^>]*>25 orders<\/strong>/g,
  `<strong style={{ fontSize: "22px", color: "#e74c3c" }}>{orders.filter(o => o.status === "Pending" || o.status === "Received").length} Pending</strong>`
);
content = content.replace(/statsSummary\.pendingShipment/g, `orders.filter(o => o.status === "Pending" || o.status === "Received").length + " orders"`);
console.log('Replaced 25 orders with dynamic count');

// 5. Replace "78 Cups Required"
content = content.replace(
  /<strong style={{ fontSize: "22px", color: "#2c1b0d" }}>78 Cups Required<\/strong>/g,
  `<strong style={{ fontSize: "22px", color: "#2c1b0d" }}>{orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled").length} Cups Required</strong>`
);
console.log('Replaced 78 Cups Required');

// 6. Replace "3 Office Floors" stat  
content = content.replace(
  /<strong style={{ fontSize: "22px", color: "#2c1b0d" }}>3 Office Floors<\/strong>/g,
  `<strong style={{ fontSize: "22px", color: "#2c1b0d" }}>{new Set(orders.filter(o => o.status !== "Delivered").map(o => o.office || "Unknown")).size} Office Floors</strong>`
);
console.log('Replaced 3 Office Floors');

// 7. Replace "Cranksets 1,200 units" / "Pedals 1,000 units" / "Brakes 800 units" tally pills
content = content.replace(
  /<span className="tally-pill red">Cranksets <strong style={{ marginLeft: "6px" }}>1,200 units<\/strong>/g,
  `<span className="tally-pill red">{Object.keys(totalBrewsSummary)[0] || "Top Item"} <strong style={{ marginLeft: "6px" }}>{Object.values(totalBrewsSummary)[0] || 0} units</strong>`
);
content = content.replace(
  /<span className="tally-pill yellow">Pedals <strong style={{ marginLeft: "6px" }}>1,000 units<\/strong>/g,
  `<span className="tally-pill yellow">{Object.keys(totalBrewsSummary)[1] || "2nd Item"} <strong style={{ marginLeft: "6px" }}>{Object.values(totalBrewsSummary)[1] || 0} units</strong>`
);
content = content.replace(
  /<span className="tally-pill green">Brakes <strong style={{ marginLeft: "6px" }}>800 units<\/strong>/g,
  `<span className="tally-pill green">{Object.keys(totalBrewsSummary)[2] || "3rd Item"} <strong style={{ marginLeft: "6px" }}>{Object.values(totalBrewsSummary)[2] || 0} units</strong>`
);
console.log('Replaced tally pills');

// 8. Fix historyOrders reference — replace with computed from orders
content = content.replace(
  /const historyOrders = \[\s*\/\/.*?\n\s*\];?/g,
  '// historyOrders computed below'
);

fs.writeFileSync('app/chaimaker/page.js', content);
console.log('All chaimaker dummy data replaced successfully!');
