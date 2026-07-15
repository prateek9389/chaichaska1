const fs = require('fs');

const file = 'app/admin/page.js';
let content = fs.readFileSync(file, 'utf8');

// 1. customerManagement
const customerAggregator = `  const customerMap = {};
  orders.forEach(o => {
    if (!customerMap[o.customer]) {
      customerMap[o.customer] = { name: o.customer, orders: 0, value: 0, lastOrder: o.date, loyalty: "Bronze" };
    }
    customerMap[o.customer].orders += 1;
    let t = String(o.total || "0").replace(/[^0-9]/g, "");
    customerMap[o.customer].value += (parseInt(t) || 0);
    // keep the latest date by simple string comp (or just latest seen)
    customerMap[o.customer].lastOrder = o.date;
  });
  const customerManagement = Object.values(customerMap).map(c => {
    c.loyalty = c.orders >= 20 ? "Platinum" : c.orders >= 10 ? "Gold" : c.orders >= 5 ? "Silver" : "Bronze";
    c.value = \`₹\${c.value.toLocaleString()}\`;
    return c;
  });`;
content = content.replace('const customerManagement = [];', customerAggregator);

// 2. todaySettlements
const settlementAggregator = `  const itemMap = {};
  orders.filter(o => o.status === "Delivered").forEach(o => {
    if (!itemMap[o.item]) itemMap[o.item] = { item: o.item, value: 0 };
    let t = String(o.total || "0").replace(/[^0-9]/g, "");
    itemMap[o.item].value += (parseInt(t) || 0);
  });
  const todaySettlements = Object.values(itemMap)
    .sort((a, b) => b.value - a.value)
    .map(i => ({ item: i.item, value: \`₹\${i.value.toLocaleString()}\` }));`;
content = content.replace('const todaySettlements = [];', settlementAggregator);

// 3. historyOrders
const historyAggregator = `  const historyOrders = orders.filter(o => o.status === "Delivered" || o.status === "Cancelled");`;
content = content.replace('const historyOrders = [];', historyAggregator);

// 4. floorBatches & activeSubs
const floorBatchesAggregator = `  const activeSubs = subscriptions.filter(s => s.status === "Active");
  const floorBatches = activeSubs; // or group by floor if desired`;
content = content.replace('const floorBatches = [];', floorBatchesAggregator);
// also remove the inline activeSubs inside JSX
content = content.replace('const activeSubs = [];', '');

// 5. upcomingSubscriptions
const upcomingSubsAggregator = `  const upcomingSubscriptions = subscriptions.filter(s => s.status === "Active").slice(0, 5);`;
content = content.replace('const upcomingSubscriptions = [];', upcomingSubsAggregator);

// 6. transactions
const transactionsAggregator = `  const transactions = orders
    .filter(o => o.status === "Delivered")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10)
    .map(o => ({
      id: o.id,
      amount: o.total,
      method: "UPI",
      time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "Success"
    }));`;
content = content.replace('const transactions = [];', transactionsAggregator);

// 7. chartData (Hourly Sales)
const chartDataAggregator = `  const hourlyMap = {};
  orders.filter(o => o.status === "Delivered").forEach(o => {
    const hour = new Date(o.createdAt).getHours();
    const label = hour > 12 ? \`\${hour - 12} PM\` : hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : \`\${hour} AM\`;
    if (!hourlyMap[label]) hourlyMap[label] = 0;
    hourlyMap[label] += 1;
  });
  // Sort by basic time representation
  const chartData = Object.keys(hourlyMap).map(k => ({ time: k, value: hourlyMap[k] }));
  if (chartData.length === 0) chartData.push({ time: "8 AM", value: 0 });`;
content = content.replace('const chartData = [];', chartDataAggregator);

fs.writeFileSync(file, content);
console.log('Admin page patched with dynamic aggregators.');
