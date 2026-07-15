const fs = require('fs');
const filepath = 'app/admin/page.js';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Update imports
const currentImports = /import \{ onOrdersSnapshot.*\} from "@\/lib\/firestore";/;
const newImports = 'import { onOrdersSnapshot, getMenuItems, getCombos, getAddons, getStock, getFeedback, updateOrder, addMenuItem, addStockItem, updateStockItem, getSubscriptions, getLeaveRequests, getRestockRequests, getRestockHistory } from "@/lib/firestore";';
content = content.replace(currentImports, newImports);

// 2. Inject useEffect after the last useState (timeTick)
const useEffectBlock = `

  useEffect(() => {
    // Initial fetch
    getStock().then(setStocks);
    getFeedback().then(setFeedbackList);
    getSubscriptions().then(setSubscriptions);
    getMenuItems().then(setMenuItems);
    getCombos().then(setCombos);
    getAddons().then(setAddonsList);
    getLeaveRequests().then(setLeaveRequests);
    getRestockRequests().then(setRestockRequests);
    getRestockHistory().then(setRestockHistory);

    // Real-time listener for orders
    const unsubOrders = onOrdersSnapshot((fetchedOrders) => {
      setOrders(fetchedOrders);
    });

    return () => {
      unsubOrders();
    };
  }, []);

`;

// Insert the useEffect if it doesn't already exist
if (!content.includes('getLeaveRequests().then(')) {
  const timeTickIdx = content.indexOf('const [timeTick, setTimeTick] = useState(0);');
  if (timeTickIdx !== -1) {
    const endOfLine = content.indexOf('\n', timeTickIdx);
    content = content.slice(0, endOfLine + 1) + useEffectBlock + content.slice(endOfLine + 1);
  }
}

// 3. Replace Customer Management dummy logic
const cmRegex = /const customerMap = \{\};[\s\S]*?const customerManagement = Object\.values\(customerMap\)\.map\(c => \{(.*?)\}\);/s;
const cmReplacement = `
  const customerMap = {};
  orders.forEach(o => {
    if (o.customer && o.status === "Delivered") {
      if (!customerMap[o.customer]) {
        customerMap[o.customer] = { name: o.customer, company: o.office || "Unknown", phone: o.phone || "N/A", spent: 0, orderCount: 0, lastOrder: o.createdAt, favItem: o.item, status: "Active" };
      }
      customerMap[o.customer].orderCount += 1;
      // Strip currency symbol if any and parse
      let val = o.total ? parseInt(String(o.total).replace(/[^0-9]/g, '')) : 0;
      customerMap[o.customer].spent += val;
      if (o.createdAt > customerMap[o.customer].lastOrder) {
        customerMap[o.customer].lastOrder = o.createdAt;
      }
    }
  });
  const customerManagement = Object.values(customerMap).map(c => ({
    ...c,
    spent: "₹" + c.spent,
    lastOrder: new Date(c.lastOrder).toLocaleDateString()
  }));
`;
content = content.replace(cmRegex, cmReplacement);


// 4. Replace Today Settlements dummy logic
const tsRegex = /const itemMap = \{\};[\s\S]*?const todaySettlements = Object\.values\(itemMap\)\.map\(i => \(\{(.*?)\}\)\);/s;
const tsReplacement = `
  const itemMap = {};
  const todayStart = new Date().setHours(0,0,0,0);
  orders.forEach(o => {
    if (o.status === "Delivered" && o.createdAt >= todayStart) {
      if (!itemMap[o.item]) {
        itemMap[o.item] = { product: o.item, qty: 0, rev: 0 };
      }
      // Assuming qty format like 'x2' or just 1
      let qtyMatch = String(o.item).match(/x(\\d+)/);
      let qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      itemMap[o.item].qty += qty;
      let val = o.total ? parseInt(String(o.total).replace(/[^0-9]/g, '')) : 0;
      itemMap[o.item].rev += val;
    }
  });
  const todaySettlements = Object.values(itemMap).map(i => ({
    product: i.product,
    qtySold: i.qty,
    revenue: "₹" + i.rev,
    status: "Reconciled"
  }));
`;
content = content.replace(tsRegex, tsReplacement);

// 5. Replace Transactions & ChartData dummy logic
const txRegex = /const transactions = \[[\s\S]*?\];\s*const chartData = \[[\s\S]*?\];/s;
const txReplacement = `
              const transactions = orders.filter(o => o.status === "Delivered").slice(0, 15).map(o => ({
                id: o.id,
                name: o.customer || "Walk-in",
                method: o.coupon && o.coupon !== "None" ? "Discount Applied" : "UPI/Card",
                amount: o.total,
                time: new Date(o.createdAt).toLocaleDateString(),
                status: "Successful"
              }));

              const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              const earningsByDay = { "Sun": 0, "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0 };
              orders.forEach(o => {
                if(o.status === "Delivered") {
                   const d = new Date(o.createdAt);
                   const dayName = days[d.getDay()];
                   let val = o.total ? parseInt(String(o.total).replace(/[^0-9]/g, '')) : 0;
                   earningsByDay[dayName] += val;
                }
              });
              
              const chartData = days.map(d => ({
                day: d,
                val: Math.min(100, Math.max(10, (earningsByDay[d] / 1000) * 10)),
                amount: "₹" + earningsByDay[d]
              }));
`;
content = content.replace(txRegex, txReplacement);

// 6. Fix filteredHistory dummy
const fhRegex = /const filteredHistory = \[[\s\S]*?\];/s;
const fhReplacement = `
              let filteredHistory = orders.filter(o => o.status === "Delivered" || o.status === "Cancelled").map(o => ({
                id: o.id,
                date: new Date(o.createdAt).toLocaleString(),
                customer: o.customer || "Walk-in",
                item: o.item,
                qty: 1, // simplified
                amount: o.total,
                status: o.status,
                payment: "UPI"
              }));
`;
content = content.replace(fhRegex, fhReplacement);

// 7. Fix totalBrewsSummary dummy
const tbsRegex = /const totalBrewsSummary = \{\};[\s\S]*?\};/s;
const tbsReplacement = `
  const totalBrewsSummary = {};
  orders.forEach(o => {
    if (o.status !== "Cancelled") {
       totalBrewsSummary[o.item] = (totalBrewsSummary[o.item] || 0) + 1;
    }
  });
`;
// Only replace if we match the old logic (which was short)
if (content.match(tbsRegex)) {
  content = content.replace(tbsRegex, tbsReplacement);
}

fs.writeFileSync(filepath, content);
console.log('Successfully replaced Admin dummy data with live dynamic mappings.');
