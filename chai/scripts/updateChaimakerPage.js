const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../app/chaimaker/page.js');
let content = fs.readFileSync(file, 'utf8');

// Replace imports
content = content.replace(
  'import { useState, useEffect, useRef } from "react";',
  'import { useState, useEffect, useRef } from "react";\nimport { onOrdersSnapshot, getMenuItems, getCombos, getAddons, getStock, getFeedback, updateOrder, addMenuItem, addStockItem, updateStockItem } from "@/lib/firestore";'
);

// Replace state initializations
// 1. Orders
const ordersStart = content.indexOf('  const [orders, setOrders] = useState([');
const ordersEnd = content.indexOf('  ]);\n\n  // Today\'s Prep Tally');
const toReplaceOrders = content.slice(ordersStart, ordersEnd + 5);
content = content.replace(toReplaceOrders, '  const [orders, setOrders] = useState([]);\n\n  // Today\'s Prep Tally');

// 2. Stock
const stockStart = content.indexOf('  const [stocks, setStocks] = useState([');
const stockEnd = content.indexOf('  ]);\n\n  // Auto alerts and restock logs');
const toReplaceStock = content.slice(stockStart, stockEnd + 5);
content = content.replace(toReplaceStock, '  const [stocks, setStocks] = useState([]);\n\n  // Auto alerts and restock logs');

// 3. Menu Items
const menuStart = content.indexOf('  const [menuItems, setMenuItems] = useState([');
const menuEnd = content.indexOf('  ]);\n\n  const [menuSubTab, setMenuSubTab] = useState("live");');
const toReplaceMenu = content.slice(menuStart, menuEnd + 5);
content = content.replace(toReplaceMenu, '  const [menuItems, setMenuItems] = useState([]);\n\n  const [menuSubTab, setMenuSubTab] = useState("live");');

// 4. Combos
const comboStart = content.indexOf('  const [combos, setCombos] = useState([');
const comboEnd = content.indexOf('  ]);\n\n  const [addonsList, setAddonsList] = useState([');
const toReplaceCombo = content.slice(comboStart, comboEnd + 5);
content = content.replace(toReplaceCombo, '  const [combos, setCombos] = useState([]);\n\n  const [addonsList, setAddonsList] = useState([');

// 5. Addons
const addonStart = content.indexOf('  const [addonsList, setAddonsList] = useState([');
const addonEnd = content.indexOf('  ]);\n\n  const [newAddonName, setNewAddonName] = useState("");');
const toReplaceAddon = content.slice(addonStart, addonEnd + 5);
content = content.replace(toReplaceAddon, '  const [addonsList, setAddonsList] = useState([]);\n\n  const [newAddonName, setNewAddonName] = useState("");');

// 6. Feedback
const fbStart = content.indexOf('  const [feedbackList, setFeedbackList] = useState([');
const fbEnd = content.indexOf('  ]);\n\n  // Settings & Working Hours');
const toReplaceFb = content.slice(fbStart, fbEnd + 5);
content = content.replace(toReplaceFb, '  const [feedbackList, setFeedbackList] = useState([]);\n\n  // Settings & Working Hours');

// Inject useEffect for data fetching after timeTick useEffect
const injectPoint = content.indexOf('  useEffect(() => {\n    const interval = setInterval(() => {\n      setTimeTick((prev) => prev + 1);\n    }, 1000);\n    return () => clearInterval(interval);\n  }, []);') + 180;
const useEffectCode = `

  useEffect(() => {
    const unsubOrders = onOrdersSnapshot((data) => setOrders(data));
    getMenuItems().then(setMenuItems);
    getCombos().then(setCombos);
    getAddons().then(setAddonsList);
    getStock().then(setStocks);
    getFeedback().then(setFeedbackList);
    return () => unsubOrders();
  }, []);
`;
content = content.slice(0, injectPoint) + useEffectCode + content.slice(injectPoint);

// Replace acceptSpecificOrder
const acceptStart = content.indexOf('  const acceptSpecificOrder = (id) => {');
const acceptEnd = content.indexOf('  };', acceptStart) + 4;
const toReplaceAccept = content.slice(acceptStart, acceptEnd);
content = content.replace(toReplaceAccept, `  const acceptSpecificOrder = async (id) => {
    try {
      await updateOrder(id, { status: "Pending" });
    } catch (e) {}
  };`);

// Replace rejectSpecificOrder
const rejectStart = content.indexOf('  const rejectSpecificOrder = (id) => {');
const rejectEnd = content.indexOf('  };', rejectStart) + 4;
const toReplaceReject = content.slice(rejectStart, rejectEnd);
content = content.replace(toReplaceReject, `  const rejectSpecificOrder = async (id) => {
    try {
      await updateOrder(id, { status: "Cancelled" });
    } catch (e) {}
  };`);

// Replace handleAddNewMenuItem
const addMenuStart = content.indexOf('  const handleAddNewMenuItem = (e) => {');
const addMenuEnd = content.indexOf('  };', addMenuStart) + 4;
const toReplaceAddMenu = content.slice(addMenuStart, addMenuEnd);
content = content.replace(toReplaceAddMenu, `  const handleAddNewMenuItem = async (e) => {
    e.preventDefault();
    if (!newMenuItemName || !newMenuItemPrice) return;
    const newItem = {
      name: newMenuItemName,
      price: parseFloat(newMenuItemPrice) || 0,
      active: true,
      image: newMenuItemImg || "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
      desc: newMenuItemDesc || "Freshly prepared beverages by Brewmaster.",
      category: newMenuCategory,
      unit: newMenuUnit,
      veg: newMenuVeg,
      prepTime: newMenuPrepTime,
      minQty: parseInt(newMenuMinQty) || 1,
      maxQty: parseInt(newMenuMaxQty) || 10,
      isSpecial: false,
      approvalStatus: "Approved",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      timeSlot: "All Day",
      linkedIngredients: []
    };
    try {
      await addMenuItem(newItem);
      setMenuItems((prev) => [...prev, newItem]);
      setToastMsg(\`🌱 Added "\${newMenuItemName}" to today's menu!\`);
      setNewMenuItemName("");
      setNewMenuItemPrice("");
      setNewMenuItemImg("");
      setNewMenuItemDesc("");
      setTimeout(() => setToastMsg(""), 4000);
    } catch(err) {}
  };`);

// Replace handleAddNewStock
const addStockStart = content.indexOf('  const handleAddNewStock = (e) => {');
const addStockEnd = content.indexOf('  };', addStockStart) + 4;
const toReplaceAddStock = content.slice(addStockStart, addStockEnd);
content = content.replace(toReplaceAddStock, `  const handleAddNewStock = async (e) => {
    e.preventDefault();
    if (!newStockName || !newStockQty) return;
    const newItem = {
      name: newStockName,
      qty: newStockQty,
      level: newStockLevel,
      unitPrice: 150,
      unit: newStockQty.split(" ")[1] || "Kg",
      supplier: "Default Vendor (+91 99999 00000)"
    };
    try {
      await addStockItem(newItem);
      setStocks((prev) => [...prev, newItem]);
      setToastMsg(\`🌱 Successfully added "\${newStockName}" to Kitchen Stock!\`);
      setNewStockName("");
      setNewStockQty("");
      setTimeout(() => setToastMsg(""), 4000);
    } catch(err) {}
  };`);

fs.writeFileSync(file, content);
console.log("Updated chaimaker page!");
