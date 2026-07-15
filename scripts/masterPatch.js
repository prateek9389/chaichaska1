const fs = require('fs');

const statesToClear = ['orders', 'stocks', 'restockHistory', 'restockRequests', 'menuItems', 'combos', 'addonsList', 'selectedComboAddons', 'subscriptions', 'feedbackList', 'leaveRequests', 'customerManagement', 'todaySettlements'];

function clearDummyData(content) {
  let lines = content.split('\n');
  let newLines = [];
  let skip = false;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    
    // Check if line starts a state with dummy data
    let foundState = statesToClear.find(s => l.includes(`const [${s}, set`) || l.includes(`const ${s} = [`));
    
    // Special case for inline activeSubs inside JSX
    if (l.includes('const activeSubs = [')) {
      newLines.push('              const activeSubs = [];');
      skip = true;
      continue;
    }

    if (foundState && l.includes('=[')) {
      // It's a one liner array or multiline array
      if (l.includes('];')) {
        // One liner
        newLines.push(l.replace(/=\s*\[.*\];/, '= [];'));
      } else {
        // Multi-line
        if (l.includes(`const [${foundState},`)) {
          newLines.push(l.split('=')[0] + '= useState([]);');
        } else {
          newLines.push(l.split('=')[0] + '= [];');
        }
        skip = true;
      }
      continue;
    }

    if (skip) {
      if (l.trim().endsWith('];') || l.trim().endsWith(']);')) {
        skip = false;
      }
      continue;
    }

    newLines.push(l);
  }
  return newLines.join('\n');
}

function applyPatches() {
  let adminContent = fs.readFileSync('app/admin/page.js', 'utf8');
  let chaiContent = fs.readFileSync('app/chaimaker/page.js', 'utf8');

  // 1. Clear Dummy Data
  adminContent = clearDummyData(adminContent);
  chaiContent = clearDummyData(chaiContent);

  // 2. Add Firebase Imports
  const fbImports = 'import { onOrdersSnapshot, getMenuItems, getCombos, getAddons, getStock, getFeedback, updateOrder, addMenuItem, addStockItem, updateStockItem, getSubscriptions } from "@/lib/firestore";';
  if (!adminContent.includes('import { onOrdersSnapshot')) {
    adminContent = adminContent.replace('import Link from "next/link";', `${fbImports}\nimport Link from "next/link";`);
  }
  if (!chaiContent.includes('import { onOrdersSnapshot')) {
    chaiContent = chaiContent.replace('import Link from "next/link";', `${fbImports}\nimport Link from "next/link";`);
  }

  // 3. Setup Firebase useEffect for Admin
  const adminEffect = `
  useEffect(() => {
    const savedLogin = localStorage.getItem("admin_logged");
    if (savedLogin === "true") {
      setIsLoggedIn(true);
    }
    const unsubOrders = onOrdersSnapshot((data) => setOrders(data));
    getMenuItems().then(setMenuItems);
    getCombos().then(setCombos);
    getAddons().then(setAddonsList);
    getStock().then(setStocks);
    getFeedback().then(setFeedbackList);
    getSubscriptions().then(setSubscriptions);
    return () => unsubOrders();
  }, []);`;
  adminContent = adminContent.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/, adminEffect);

  // 4. Setup Firebase useEffect + Alarm for Chaimaker
  const chaiEffect = `
  useEffect(() => {
    const savedLogin = localStorage.getItem("brewmaster_logged");
    if (savedLogin === "true") {
      setIsLoggedIn(true);
    }
    const unsubOrders = onOrdersSnapshot((data) => {
      setOrders(data);
      const pending = data.find((o) => o.status === "Received");
      if (pending) {
        setIncomingOrder((prev) => {
          if (!prev || prev.id !== pending.id) {
            setCountdown(60);
            startAlertRinging();
            return pending;
          }
          return prev;
        });
      } else {
        stopAlertRinging();
        setIncomingOrder(null);
      }
    });
    getMenuItems().then(setMenuItems);
    getCombos().then(setCombos);
    getAddons().then(setAddonsList);
    getStock().then(setStocks);
    getFeedback().then(setFeedbackList);
    getSubscriptions().then(setSubscriptions);
    return () => unsubOrders();
  }, []);`;
  chaiContent = chaiContent.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/, chaiEffect);

  // 5. Admin Analytics Patch (Auth, Buttons, Stats)
  adminContent = adminContent.replace(/brewmaster_logged/g, 'admin_logged');
  adminContent = adminContent.replace(/username === "brewmaster" && password === "chai"/g, 'username === "admin" && password === "adminpass"');
  adminContent = adminContent.replace(/BREWMASTER ACCESS ONLY/g, 'ADMIN ACCESS ONLY');
  adminContent = adminContent.replace(/Hint: brewmaster \/ chai/g, 'Hint: admin / adminpass');

  adminContent = adminContent.replace(/<div style=\{\{ display: "flex", gap: "8px" \}\}\>[\s\S]*?(?=<\/div>\s*<\/div>\s*<\/div>\s*\);)/, `<div style={{ display: "flex", gap: "8px" }}>
            {o.status === "Received" && <span style={{ fontSize: "12px", color: "#f39c12", fontWeight: "bold" }}>Waiting Approval</span>}
            {o.status === "Pending" && <span style={{ fontSize: "12px", color: "#3498db", fontWeight: "bold" }}>Preparing</span>}
            {o.status === "Shipped" && <span style={{ fontSize: "12px", color: "#e67e22", fontWeight: "bold" }}>In Transit</span>}
            {o.status === "Delivered" && <span className="served-status-success-badge">✓ Served</span>}
            {o.status === "Cancelled" && <span style={{ fontSize: "12px", color: "#e74c3c", fontWeight: "bold" }}>✕ Cancelled</span>}
          </div>`);

  adminContent = adminContent.replace(/const statsSummary = \{[\s\S]*?avgOrderValue: "₹0\/Order",\r?\n  \};/, `const deliveredOrders = orders.filter(o => o.status === "Delivered");
  const totalSalesVal = deliveredOrders.reduce((sum, o) => {
    let t = String(o.total || "0").replace(/[^0-9]/g, "");
    return sum + (parseInt(t) || 0);
  }, 0);
  
  const statsSummary = {
    totalSales: \`₹\${totalSalesVal.toLocaleString()}\`,
    totalOrders: \`\${orders.length} orders\`,
    deliveryShipment: \`\${deliveredOrders.length} Delivery\`,
    pendingShipment: \`\${orders.filter(o => o.status === "Received" || o.status === "Pending").length} orders\`,
    avgOrderValue: deliveredOrders.length ? \`₹\${Math.round(totalSalesVal / deliveredOrders.length)}/Order\` : "₹0/Order",
  };`);

  // 6. Chaimaker Action Buttons
  chaiContent = chaiContent.replace(
    /const acceptSpecificOrder = \(id\) => \{[\s\S]*?\};\s*\};/,
    `const acceptSpecificOrder = (id) => { updateOrder(id, { status: "Pending" }); };`
  );
  chaiContent = chaiContent.replace(
    /const rejectSpecificOrder = \(id\) => \{[\s\S]*?\};\s*\};/,
    `const rejectSpecificOrder = (id) => { updateOrder(id, { status: "Cancelled" }); };`
  );
  chaiContent = chaiContent.replace(
    /onClick=\{\(\) => \{\s*setOrders\(\(prev\) =>\s*prev\.map\(\(item\) => \(item\.id === o\.id \? \{ \.\.\.item, status: "Shipped" \} : item\)\)\s*\);\s*\}\}/g,
    'onClick={() => updateOrder(o.id, { status: "Shipped" })}'
  );
  chaiContent = chaiContent.replace(
    /onClick=\{\(\) => \{\s*setOrders\(\(prev\) =>\s*prev\.map\(\(item\) => \(item\.id === o\.id \? \{ \.\.\.item, status: "Delivered" \} : item\)\)\s*\);\s*\}\}/g,
    'onClick={() => updateOrder(o.id, { status: "Delivered" })}'
  );

  // 7. Menu & Stock Integration (Both)
  [adminContent, chaiContent].forEach((c, idx) => {
    c = c.replace(
      /const handleToggleMenuAvailability = \(idx\) => \{[\s\S]*?active: !item\.active \} : item\)\)\s*\);/g,
      `const handleToggleMenuAvailability = async (idx) => {
    const item = menuItems[idx];
    if(item && item.id) {
      await updateMenuItem(item.id, { active: !item.active });
      setMenuItems((prev) => prev.map((m, i) => (i === idx ? { ...m, active: !m.active } : m)));
    }`
    );
    c = c.replace(
      /const handleAddNewMenuItem = \(e\) => \{([\s\S]*?)setMenuItems\(\(prev\) => \[\.\.\.prev, newItem\]\);/g,
      `const handleAddNewMenuItem = async (e) => {$1const id = await addMenuItem(newItem);
    setMenuItems((prev) => [...prev, { ...newItem, id }]);`
    );
    c = c.replace(
      /const handleAddNewStock = \(e\) => \{([\s\S]*?)setStocks\(\(prev\) => \[\.\.\.prev, newItem\]\);/g,
      `const handleAddNewStock = async (e) => {$1const id = await addStockItem(newItem);
    setStocks((prev) => [...prev, { ...newItem, id }]);`
    );
    c = c.replace(
      /const handleSaveStockEdit = \(idx\) => \{[\s\S]*?level: editStockLevel \} : s\)\)\s*\);/g,
      `const handleSaveStockEdit = async (idx) => {
    const item = stocks[idx];
    if(item && item.id) {
      await updateStockItem(item.id, { qty: editStockQty, level: editStockLevel });
      setStocks((prev) => prev.map((s, i) => (i === idx ? { ...s, qty: editStockQty, level: editStockLevel } : s)));
    }`
    );
    c = c.replace(
      /const toggleStockStatus = \(idx, level\) => \{[\s\S]*?level: nextLvl \} : s\)\)\s*\);/g,
      `const toggleStockStatus = async (idx, level) => {
    const nextLevels = { "In Stock": "Low Stock", "Low Stock": "Out of Stock", "Out of Stock": "In Stock" };
    const nextLvl = nextLevels[level] || "In Stock";
    const item = stocks[idx];
    if(item && item.id) {
      await updateStockItem(item.id, { level: nextLvl });
      setStocks((prev) => prev.map((s, i) => (i === idx ? { ...s, level: nextLvl } : s)));
    }`
    );
    
    if (idx === 0) adminContent = c;
    else chaiContent = c;
  });

  // 8. Alarm Integration (Chaimaker)
  chaiContent = chaiContent.replace(/const triggerMockOrderAlert = \(\) => \{[\s\S]*?\}, 1000\);\n  \};/, '');
  chaiContent = chaiContent.replace(/<button onClick=\{triggerMockOrderAlert\} className="alert-bell-btn" title="Simulate Alarm">[\s\S]*?<\/button>/, '');
  chaiContent = chaiContent.replace(/const acceptOrderAlert = \(\) => \{[\s\S]*?setIncomingOrder\(null\);\n  \};/, `const acceptOrderAlert = () => { stopAlertRinging(); if (incomingOrder) { updateOrder(incomingOrder.id, { status: "Pending" }); } setIncomingOrder(null); };`);
  chaiContent = chaiContent.replace(/const rejectOrderAlert = \(\) => \{\s*stopAlertRinging\(\);\s*setIncomingOrder\(null\);\s*\};/, `const rejectOrderAlert = () => { stopAlertRinging(); if (incomingOrder) { updateOrder(incomingOrder.id, { status: "Cancelled" }); } setIncomingOrder(null); };`);

  fs.writeFileSync('app/admin/page.js', adminContent);
  fs.writeFileSync('app/chaimaker/page.js', chaiContent);
}

applyPatches();
console.log('Restoration and Master Patch Complete.');
