const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../app/admin/page.js');
let content = fs.readFileSync(file, 'utf8');

// Replace imports safely
content = content.replace(
  'import { useState, useEffect, useRef } from "react";',
  'import { useState, useEffect, useRef } from "react";\nimport { onOrdersSnapshot, getMenuItems, getCombos, getAddons, getStock, getFeedback, updateOrder, addMenuItem, addStockItem, updateStockItem } from "@/lib/firestore";'
);

// Helper function to safely replace arrays
function replaceArray(startMarker, endMarker, replacement) {
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) return;
  const endIdx = content.indexOf(endMarker, startIdx);
  if (endIdx === -1) return;
  const toReplace = content.substring(startIdx, endIdx);
  content = content.replace(toReplace, replacement);
}

// 1. Orders
replaceArray('  const [orders, setOrders] = useState([', "  // Today's Prep Tally", '  const [orders, setOrders] = useState([]);\n\n');

// 2. Stock
replaceArray('  const [stocks, setStocks] = useState([', '  // Auto alerts and restock logs', '  const [stocks, setStocks] = useState([]);\n\n');

// 3. Menu Items
replaceArray('  const [menuItems, setMenuItems] = useState([', '  const [menuSubTab, setMenuSubTab] = useState("live");', '  const [menuItems, setMenuItems] = useState([]);\n\n');

// 4. Combos
replaceArray('  const [combos, setCombos] = useState([', '  const [addonsList, setAddonsList] = useState([', '  const [combos, setCombos] = useState([]);\n\n');

// 5. Addons
replaceArray('  const [addonsList, setAddonsList] = useState([', '  const [newAddonName, setNewAddonName] = useState("");', '  const [addonsList, setAddonsList] = useState([]);\n\n');

// 6. Feedback
replaceArray('  const [feedbackList, setFeedbackList] = useState([', '  // Settings & Working Hours', '  const [feedbackList, setFeedbackList] = useState([]);\n\n');


// Inject useEffect for data fetching after timeTick useEffect safely
const injectAnchor = '    return () => clearInterval(interval);\n  }, []);';
const injectIdx = content.indexOf(injectAnchor);
if(injectIdx !== -1) {
  const injectCode = `\n\n  useEffect(() => {
    const unsubOrders = onOrdersSnapshot((data) => setOrders(data));
    getMenuItems().then(setMenuItems);
    getCombos().then(setCombos);
    getAddons().then(setAddonsList);
    getStock().then(setStocks);
    getFeedback().then(setFeedbackList);
    return () => unsubOrders();
  }, []);`;
  content = content.slice(0, injectIdx + injectAnchor.length) + injectCode + content.slice(injectIdx + injectAnchor.length);
}

function replaceFunction(startMarker, replacement) {
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) return;
  
  // Find the closing brace of the function by counting brackets
  let braceCount = 0;
  let endIdx = -1;
  let started = false;
  
  for(let i = startIdx; i < content.length; i++) {
      if(content[i] === '{') {
          braceCount++;
          started = true;
      }
      else if(content[i] === '}') {
          braceCount--;
      }
      
      if(started && braceCount === 0) {
          endIdx = i + 1;
          break;
      }
  }
  
  if (endIdx !== -1) {
    const toReplace = content.substring(startIdx, endIdx);
    content = content.replace(toReplace, replacement);
  }
}

replaceFunction('  const acceptSpecificOrder = (id) => {', `  const acceptSpecificOrder = async (id) => {
    try {
      await updateOrder(id, { status: "Pending" });
    } catch (e) {}
  }`);

replaceFunction('  const rejectSpecificOrder = (id) => {', `  const rejectSpecificOrder = async (id) => {
    try {
      await updateOrder(id, { status: "Cancelled" });
    } catch (e) {}
  }`);

replaceFunction('  const handleAddNewMenuItem = (e) => {', `  const handleAddNewMenuItem = async (e) => {
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
  }`);

replaceFunction('  const handleAddNewStock = (e) => {', `  const handleAddNewStock = async (e) => {
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
  }`);

fs.writeFileSync(file, content);
console.log("Updated admin page safely!");
