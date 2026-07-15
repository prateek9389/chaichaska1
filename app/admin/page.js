"use client";

import { useState, useEffect, useRef } from "react";
import { onOrdersSnapshot, getMenuItems, getCombos, getAddons, addAddon, deleteAddon, updateAddon, getStock, updateOrder, addMenuItem, addStockItem, updateStockItem, getSubscriptions, onProductsSnapshot, addProduct, deleteProduct, updateProduct, updateSubscription, onRestockRequestsSnapshot, updateRestockRequest, onLeaveRequestsSnapshot, updateLeaveRequest, getProfileSettings, updateProfileSettings, getContactInfo, updateContactInfo, getPendingFeedback, approveFeedback, deleteFeedback, getFeedback } from "@/lib/firestore";
import { loginWithEmail, signUpWithEmail } from "@/lib/auth";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Error: New passwords do not match.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage("Error: Password must be at least 6 characters.");
      return;
    }
    try {
      if (auth.currentUser) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        
        await updatePassword(auth.currentUser, newPassword);
        setPasswordMessage("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordMessage(""), 3000);
      } else {
        setPasswordMessage("Error: User not logged in.");
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setPasswordMessage("Error: Incorrect current password.");
      } else {
        setPasswordMessage("Error updating password: " + err.message);
      }
    }
  };

  // Tabs State (1st tab is Dashboard)
  const [activeTab, setActiveTab] = useState("dashboard");
  const [timeFilter, setTimeFilter] = useState("Weekly");
  const [queueFilter, setQueueFilter] = useState("All");
  const [isOnline, setIsOnline] = useState(true);

  // Active Orders Queue with detailed fields (including office number, product image, details, priority, createdAt, allocatedTime)
  const [orders, setOrders] = useState([
    {
      id: "#10234",
      customer: "John Bike Parts",
      date: "09/12/2026",
      status: "Shipped",
      total: "₹1,200",
      item: "Classic Masala Chai x8",
      office: "Suite 302, Building A",
      sugar: "Normal Sugar",
      milk: "Whole Milk",
      img: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
      priority: "Normal",
      createdAt: Date.now() - 3600000, // 1 hour ago
      allocatedTime: "30 mins",
    },
    {
      id: "#10235",
      customer: "Elite Cycling Co.",
      date: "09/11/2026",
      status: "Pending",
      total: "₹3,600",
      item: "Saffron Royal Chai x12",
      office: "Floor 4, Conference Room B",
      sugar: "Mild Sugar",
      milk: "Oat Milk",
      img: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
      priority: "High",
      createdAt: Date.now() - 1800000, // 30 mins ago
      allocatedTime: "40 mins",
    },
    {
      id: "#10236",
      customer: "SpeedWheels",
      date: "09/10/2026",
      status: "Delivered",
      total: "₹2,800",
      item: "Ginger Chai x10",
      office: "Cabin 12, Floor 5",
      sugar: "No Sugar",
      milk: "Almond Milk",
      img: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg",
      priority: "Normal",
      createdAt: Date.now() - 7200000, // 2 hours ago
      allocatedTime: "35 mins",
    },
    {
      id: "#10239",
      customer: "Vikram R.",
      date: "09/12/2026",
      status: "Received",
      total: "₹380",
      item: "Kashmiri Kahwa x2",
      office: "Office 402, Block B",
      sugar: "Normal Sweet",
      milk: "Black Chai",
      img: "https://i.pinimg.com/736x/c4/a8/cc/c4a8ccde9a67e5f24e2be4d0621f4186.jpg",
      priority: "High",
      createdAt: Date.now() - 480000, // 8 mins ago
      allocatedTime: "",
    },
    {
      id: "#10240",
      customer: "Sneha K.",
      date: "09/12/2026",
      status: "Received",
      total: "₹169",
      item: "Ginger (Adrak) Chai x1",
      office: "Office 105, Ground Floor",
      sugar: "No Sugar",
      milk: "Almond Milk",
      img: "/chai-ingredients.png",
      priority: "Normal",
      createdAt: Date.now() - 120000, // 2 mins ago
      allocatedTime: "",
    },
  ]);

  // Today's Prep Tally
  const todayTally = {
    "Masala Chai": 24,
    "Cardamom Chai": 18,
    "Ginger Chai": 15,
    "Saffron Royal Chai": 9,
    "Almond Cookies": 30,
  };

  const floorBatches = [
    { floor: "Floor 5", items: "5x Masala Chai, 2x Cookies", status: "High Demand" },
    { floor: "Floor 3", items: "3x Ginger Chai, 4x Cookies", status: "Medium Demand" },
  ];

  // Stock
  const [stocks, setStocks] = useState([
    { name: "Assam Loose Tea Leaves", qty: "45 Kg Remaining", level: "In Stock", unitPrice: 350, unit: "Kg", supplier: "Jaipur Spices Ltd (+91 99999 11111)" },
    { name: "Fresh Ginger Roots", qty: "12 Kg Remaining", level: "Low Stock", unitPrice: 120, unit: "Kg", supplier: "Alwar Organic Farms (+91 88888 22222)" },
    { name: "Green Cardamom Elaichi Pods", qty: "2.5 Kg Remaining", level: "Low Stock", unitPrice: 1800, unit: "Kg", supplier: "Kerala Plantation Direct (+91 77777 33333)" },
    { name: "Organic Kashmiri Saffron", qty: "80 Grams Remaining", level: "Low Stock", unitPrice: 280, unit: "Grams", supplier: "Pampore Saffron Valley (+91 66666 44444)" },
    { name: "Whole Milk Cartons", qty: "5 Ltrs Remaining", level: "Out of Stock", unitPrice: 65, unit: "Ltrs", supplier: "Jaipur Dairy Co-op (+91 55555 55555)" },
  ]);

  // Auto alerts and restock logs
  const [autoAlertEnabled, setAutoAlertEnabled] = useState(true);
  const [restockHistory, setRestockHistory] = useState([
    { date: "02/07/2026", item: "Assam Loose Tea Leaves", qty: "20 Kg", source: "Jaipur Spices Ltd" },
    { date: "30/06/2026", item: "Whole Milk Cartons", qty: "50 Ltrs", source: "Jaipur Dairy Co-op" },
  ]);

  // Restock alerts/requests states
  const [restockRequests, setRestockRequests] = useState([
    { item: "Green Cardamom Elaichi Pods", qty: "10 Kg", urgency: "High", notes: "Almost out of Elaichi base", date: "Just now", status: "Sent to Admin" }
  ]);
  const [selectedItem, setSelectedItem] = useState("Assam Loose Tea Leaves");
  const [requestQty, setRequestQty] = useState("");
  const [urgency, setUrgency] = useState("Medium");
  const [requestNotes, setRequestNotes] = useState("");
  const [toastMsg, setToastMsg] = useState("");


  // Add new stock item form state
  const [newStockName, setNewStockName] = useState("");
  const [newStockQty, setNewStockQty] = useState("");
  const [newStockLevel, setNewStockLevel] = useState("In Stock");

  // Local state for the contact form
  const [localContact, setLocalContact] = useState({
    brandName: "ChaiCo.",
    brandDesc: "Freshly brewed spice teas and organic loose blends sourced straight from certified tea farms. Delivered hot and fresh.",
    address1: "102 Tea Estate lane, Assam Garden,",
    address2: "India 781001",
    phone: "+91 98765 43210",
    email: "hello@chaico.com"
  });
  const [contactLoaded, setContactLoaded] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    if (!contactLoaded) {
      getContactInfo().then(data => {
        setLocalContact(data);
        setContactLoaded(true);
      });
    }
  }, [contactLoaded]);

  // Feedback System State
  const [pendingFeedback, setPendingFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (activeTab === "feedback") {
      setLoadingFeedback(true);
      getPendingFeedback().then(data => {
        setPendingFeedback(data);
        setLoadingFeedback(false);
      }).catch(console.error);
    }
  }, [activeTab]);

  const handleApproveFeedback = async (id) => {
    if (confirm("Approve this review and make it public?")) {
      await approveFeedback(id);
      setPendingFeedback(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (confirm("Delete this review permanently?")) {
      await deleteFeedback(id);
      setPendingFeedback(prev => prev.filter(f => f.id !== id));
    }
  };

  // Inline stock edit state
  const [editingStockIdx, setEditingStockIdx] = useState(null);
  const [editStockQty, setEditStockQty] = useState("");
  const [editStockLevel, setEditStockLevel] = useState("In Stock");

  // Customer Management Table
  const customerManagement = [
    { name: "John Bike Parts", orders: 10, value: "₹12,000", lastOrder: "09/12/2026", loyalty: "Gold" },
    { name: "Elite Cycling Co.", orders: 15, value: "₹25,000", lastOrder: "09/11/2026", loyalty: "Platinum" },
  ];

  // Earnings Summary Stats (Dynamic calculations from Firebase orders)
  const filteredOrders = orders.filter(o => {
    if (!o.createdAt) return true; // keep mock/older orders if no timestamp
    const now = Date.now();
    const diff = now - o.createdAt;
    if (timeFilter === "Daily") return diff <= 24 * 60 * 60 * 1000;
    if (timeFilter === "Weekly") return diff <= 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === "Monthly") return diff <= 30 * 24 * 60 * 60 * 1000;
    return true;
  });

  const totalSalesVal = filteredOrders.reduce((acc, o) => {
    const val = typeof o.total === "string" ? parseFloat(o.total.replace(/[^\d\.]/g, "")) : parseFloat(o.total);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const totalOrdersCount = filteredOrders.length;
  const completedOrdersCount = filteredOrders.filter(o => o.status === "Delivered" || o.status === "Completed").length;
  const pendingOrdersCount = filteredOrders.filter(o => o.status === "Received" || o.status === "Pending" || o.status === "Preparing").length;
  const avgOrderValueVal = totalOrdersCount > 0 ? (totalSalesVal / totalOrdersCount) : 0;

  const statsSummary = {
    totalSales: `₹${totalSalesVal.toLocaleString()}`,
    totalOrders: `${totalOrdersCount} orders`,
    deliveryShipment: `${completedOrdersCount} Delivery`,
    pendingShipment: `${pendingOrdersCount} orders`,
    avgOrderValue: `₹${Math.round(avgOrderValueVal)}/Order`,
  };

  // Top Items sold calculation
  const itemCounts = {};
  orders.forEach(o => {
    const name = o.item || "Chai";
    itemCounts[name] = (itemCounts[name] || 0) + 1;
  });
  const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
  const topItem1 = sortedItems[0] ? `${sortedItems[0][0]} (${sortedItems[0][1]} units)` : "Masala Chai (0 units)";
  const topItem2 = sortedItems[1] ? `${sortedItems[1][0]} (${sortedItems[1][1]} units)` : "Saffron Chai (0 units)";
  const topItem3 = sortedItems[2] ? `${sortedItems[2][0]} (${sortedItems[2][1]} units)` : "Ginger Chai (0 units)";

  // Month-by-month sales distribution
  const monthSales = Array(12).fill(0);
  orders.forEach(o => {
    if (!o.date) return;
    const parts = o.date.split("/");
    let monthIndex = -1;
    if (parts.length === 3) {
      const first = parseInt(parts[0]);
      if (first >= 1 && first <= 12) {
        monthIndex = first - 1;
      }
    } else {
      const d = new Date(o.date);
      if (!isNaN(d.getTime())) {
        monthIndex = d.getMonth();
      }
    }
    const val = typeof o.total === "string" ? parseFloat(o.total.replace(/[^\d\.]/g, "")) : parseFloat(o.total);
    if (monthIndex >= 0 && monthIndex < 12 && !isNaN(val)) {
      monthSales[monthIndex] += val;
    }
  });

  const maxMonthSales = Math.max(...monthSales, 1);
  const monthsData = [
    { m: "Jan", h: (monthSales[0] / maxMonthSales) * 100 || 10, val: monthSales[0] },
    { m: "Feb", h: (monthSales[1] / maxMonthSales) * 100 || 15, val: monthSales[1] },
    { m: "Mar", h: (monthSales[2] / maxMonthSales) * 100 || 12, val: monthSales[2] },
    { m: "Apr", h: (monthSales[3] / maxMonthSales) * 100 || 20, val: monthSales[3] },
    { m: "May", h: (monthSales[4] / maxMonthSales) * 100 || 18, val: monthSales[4] },
    { m: "Jun", h: (monthSales[5] / maxMonthSales) * 100 || 25, val: monthSales[5] },
    { m: "Jul", h: (monthSales[6] / maxMonthSales) * 100 || 22, val: monthSales[6] },
    { m: "Aug", h: (monthSales[7] / maxMonthSales) * 100 || 30, val: monthSales[7] },
    { m: "Sep", h: (monthSales[8] / maxMonthSales) * 100 || 28, val: monthSales[8] },
    { m: "Oct", h: (monthSales[9] / maxMonthSales) * 100 || 24, val: monthSales[9] },
    { m: "Nov", h: (monthSales[10] / maxMonthSales) * 100 || 20, val: monthSales[10] },
    { m: "Dec", h: (monthSales[11] / maxMonthSales) * 100 || 15, val: monthSales[11] },
  ];
  const currentMonthIdx = new Date().getMonth();
  if (monthsData[currentMonthIdx]) {
    monthsData[currentMonthIdx].highlighted = true;
  }

  const todaySettlements = [
    { item: "Classic Masala Chai (24 units)", value: "₹3,576" },
    { item: "Saffron Royal Chai (9 units)", value: "₹2,241" },
    { item: "Ginger (Adrak) Chai (15 units)", value: "₹2,535" },
    { item: "Almond Cookies (30 units)", value: "₹1,500" },
  ];

  const historyOrders = orders.map((o, idx) => {
    const totalStr = typeof o.total === "string" && o.total.includes("₹") ? o.total : `₹${o.total}`;
    const customizations = [];
    if (o.sugar) customizations.push(`Sugar: ${o.sugar}`);
    if (o.milk) customizations.push(`Milk: ${o.milk}`);
    
    return {
      id: o.id.startsWith("#") ? o.id : `#${o.id.replace("CHAI-ORD-", "")}`,
      customer: o.customer || "Loyal Customer",
      status: o.status || "Received",
      date: o.date || "Just now",
      total: totalStr,
      items: o.item || "Chai Selection",
      customization: customizations.join(", ") || "Standard Recipe",
      office: o.office || "General Area"
    };
  });

  // Menu items
  const [menuItems, setMenuItems] = useState([
    {
      name: "Classic Masala Chai",
      price: 149,
      active: true,
      image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
      desc: "Our signature blend brewed with freshly ground whole spices.",
      category: "Chai",
      unit: "Kulhad",
      veg: true,
      prepTime: "8 mins",
      minQty: 1,
      maxQty: 12,
      isSpecial: true,
      approvalStatus: "Approved",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      timeSlot: "All Day",
      linkedIngredients: ["Assam Loose Tea Leaves"]
    },
    {
      name: "Ginger (Adrak) Chai",
      price: 169,
      active: true,
      image: "/chai-ingredients.png",
      desc: "Warm and soothing brew infusing robust Assam CTC with grated farm ginger.",
      category: "Chai",
      unit: "Cup",
      veg: true,
      prepTime: "6 mins",
      minQty: 1,
      maxQty: 10,
      isSpecial: false,
      approvalStatus: "Approved",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      timeSlot: "All Day",
      linkedIngredients: ["Fresh Ginger Roots"]
    },
    {
      name: "Saffron Royal Chai",
      price: 249,
      active: true,
      image: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
      desc: "Fragrant luxury Kashmiri saffron strands infused with sweet milk.",
      category: "Chai",
      unit: "Kulhad",
      veg: true,
      prepTime: "12 mins",
      minQty: 1,
      maxQty: 6,
      isSpecial: false,
      linkedIngredients: ["Organic Kashmiri Saffron"],
      approvalStatus: "Approved",
      scheduleDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      timeSlot: "Evening Only"
    },
  ]);

  const [menuSubTab, setMenuSubTab] = useState("live");
  const [combos, setCombos] = useState([
    { name: "Evening Rush Combo", items: "Classic Masala Chai + Almond Cookies", price: 199, active: true, desc: "A perfect hot masala brew paired with 2 crisp almond cookies." },
    { name: "Kesar Winter Booster", items: "Saffron Royal Chai + Saffron Biscuits", price: 299, active: true, desc: "Luxury Saffron tea served with premium custom saffron-dipped biscuits." }
  ]);

  const [addonsList, setAddonsList] = useState([
    { name: "Almond Cookies", price: 50, image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg", desc: "Crisp biscuits baked with almond flakes.", active: true },
    { name: "Almond Slivers Add-on", price: 30, image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg", desc: "Toasted sliced almonds to sprinkle.", active: true },
    { name: "Fresh Mint Leaves", price: 10, image: "/chai-ingredients.png", desc: "Hand-picked cooling mint leaves.", active: true }
  ]);

  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [newAddonImg, setNewAddonImg] = useState("");
  const [newAddonDesc, setNewAddonDesc] = useState("");
  const [selectedComboAddons, setSelectedComboAddons] = useState([]);

  const [newMenuItemName, setNewMenuItemName] = useState("");
  const [newMenuItemPrice, setNewMenuItemPrice] = useState("");
  const [newMenuItemImg, setNewMenuItemImg] = useState("");
  const [newMenuItemDesc, setNewMenuItemDesc] = useState("");

  const [newMenuCategory, setNewMenuCategory] = useState("Chai");
  const [newMenuUnit, setNewMenuUnit] = useState("Cup");
  const [newMenuPrepTime, setNewMenuPrepTime] = useState("8 mins");
  const [newMenuMinQty, setNewMenuMinQty] = useState(1);
  const [newMenuMaxQty, setNewMenuMaxQty] = useState(10);
  const [newMenuVeg, setNewMenuVeg] = useState(true);
  const [historyViewMode, setHistoryViewMode] = useState("grid");
  const [historyDateFilter, setHistoryDateFilter] = useState("all");
  const [activeInvoice, setActiveInvoice] = useState(null);

  useEffect(() => {
    if (activeInvoice) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeInvoice]);

  const [subscriptions, setSubscriptions] = useState([]);

  // Subscriptions Due
  const upcomingSubscriptions = [
    { customer: "Rohan V.", floor: "Floor 4", time: "09:00 AM", items: "1x Masala Chai (Daily)" },
    { customer: "Meera J.", floor: "Floor 5", time: "11:30 AM", items: "1x Ginger Chai (Weekly)" },
  ];

  // Feedback list
  const [feedbackList, setFeedbackList] = useState([
    { orderId: "ORD-8102", customer: "Rohan V.", rating: 5, date: "09/12/2026", text: "Absolutely loved the warm cardamom notes! Perfectly balanced sweetness." },
    { orderId: "ORD-8101", customer: "Priya P.", rating: 4, date: "09/12/2026", text: "The saffron aroma is premium, but the milk was slightly thick today. Good effort!" },
    { orderId: "ORD-8098", customer: "Karan J.", rating: 5, date: "09/11/2026", text: "Kashmiri Kahwa is a lifesaver in these airconditioned office rooms." }
  ]);

  // Product Creation States
  const [productsList, setProductsList] = useState([]);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Masala");
  const [newProdCaffeine, setNewProdCaffeine] = useState("Medium");
  const [newProdSweetness, setNewProdSweetness] = useState("Medium");
  const [newProdSteepTime, setNewProdSteepTime] = useState("5 mins");
  const [newProdPairing, setNewProdPairing] = useState("Biscuits");
  const [newProdRating, setNewProdRating] = useState(4.8);
  const [newProdImage, setNewProdImage] = useState("");

  // Product Edit States
  const [editingProduct, setEditingProduct] = useState(null);
  const [editProdName, setEditProdName] = useState("");
  const [editProdPrice, setEditProdPrice] = useState("");
  const [editProdCategory, setEditProdCategory] = useState("Masala");
  const [editProdDesc, setEditProdDesc] = useState("");
  const [editProdImage, setEditProdImage] = useState("");

  // Sidebar visibility state
  const [showPendingSidebar, setShowPendingSidebar] = useState(false);

  // Image Library states
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [libraryImages, setLibraryImages] = useState([]);

  // Settings & Working Hours
  const [leaveStart, setLeaveStart] = useState("2026-07-10");
  const [leaveEnd, setLeaveEnd] = useState("2026-07-12");
  const [newLeaveReason, setNewLeaveReason] = useState("");
  const [leaveRequests, setLeaveRequests] = useState([
    { start: "2026-07-10", end: "2026-07-12", reason: "Family Event", status: "Approved" }
  ]);
  const [adminLeaveReasons, setAdminLeaveReasons] = useState({});
  const [workingHours, setWorkingHours] = useState("8:00 AM - 6:00 PM");
  const [shopName, setShopName] = useState("ChaiCo Jaipur HQ");
  const [brewmasterName, setBrewmasterName] = useState("Chef Kanti Lal");
  const [brewmasterContact, setBrewmasterContact] = useState("+91 98765 43210");
  const [brewmasterBio, setBrewmasterBio] = useState("Specialist in traditional spice infusions, kulhad brewing, and custom spice blends with 6+ years of corporate hospitality experience.");

  const [showNotifications, setShowNotifications] = useState(false);
  const notifications = orders
    .filter(o => o.status === "Received" || o.status === "Pending" || o.status === "Preparing")
    .map(o => ({
      id: o.id,
      text: `Order ${o.id} - ${o.item}`,
      time: o.date
    }));

  useEffect(() => {
    async function loadProfile() {
      const data = await getProfileSettings();
      if (data) {
        if (data.brewmasterName) setBrewmasterName(data.brewmasterName);
        if (data.brewmasterContact) setBrewmasterContact(data.brewmasterContact);
        if (data.brewmasterBio) setBrewmasterBio(data.brewmasterBio);
        if (data.shopName) setShopName(data.shopName);
        if (data.workingHours) setWorkingHours(data.workingHours);
      }
    }
    loadProfile();
  }, []);

  // Realtime Incoming Alert states
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const audioIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const [timeTick, setTimeTick] = useState(0);


  useEffect(() => {
    const savedLogin = localStorage.getItem("admin_logged");
    if (savedLogin === "true") setIsLoggedIn(true);
    const unsubOrders = onOrdersSnapshot((data) => setOrders(data));
    getMenuItems().then(setMenuItems);
    getCombos().then(setCombos);
    getAddons().then(setAddonsList);
    getStock().then(setStocks);
    getFeedback().then(setFeedbackList);
    getSubscriptions().then(setSubscriptions);
    const unsubProducts = onProductsSnapshot((data) => setProductsList(data));
    const unsubRestock = onRestockRequestsSnapshot((data) => setRestockRequests(data));
    const unsubLeave = onLeaveRequestsSnapshot((data) => setLeaveRequests(data));
    return () => {
      unsubOrders();
      unsubProducts();
      unsubRestock();
      unsubLeave();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showImageLibrary) {
      const q = query(collection(db, "uploaded_images"), orderBy("uploadedAt", "desc"));
      const unsub = onSnapshot(q, (snap) => {
        const imgs = [];
        snap.forEach((doc) => imgs.push({ id: doc.id, ...doc.data() }));
        setLibraryImages(imgs);
      });
      return () => unsub();
    }
  }, [showImageLibrary]);

  const allocateTime = (id, timeVal) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, allocatedTime: timeVal } : o))
    );
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (username.trim().toLowerCase() !== "admin123@gmail.com") {
      setLoginError("Access denied. Admin portal is restricted.");
      return;
    }
    try {
      await loginWithEmail(username.trim(), password.trim());
      setIsLoggedIn(true);
      localStorage.setItem("admin_logged", "true");
      setLoginError("");
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.message.includes("invalid")) {
        try {
          await signUpWithEmail({ name: "Admin", email: username.trim(), password: password.trim() });
          setIsLoggedIn(true);
          localStorage.setItem("admin_logged", "true");
          setLoginError("");
        } catch (e2) {
          setLoginError(e2.message);
        }
      } else {
        setLoginError(err.message);
      }
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("admin_logged");
  };

  const playAlarmTone = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1020, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (err) { }
  };

  const startAlertRinging = () => {
    if (audioIntervalRef.current) return;
    playAlarmTone();
    audioIntervalRef.current = setInterval(playAlarmTone, 750);
  };

  const stopAlertRinging = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const triggerMockOrderAlert = () => {
    const mockOrderObj = {
      id: `#1024${Math.floor(1 + Math.random() * 9)}`,
      item: "Kesar Saffron Royal Chai x2",
      customer: "Amit Sharma",
      office: "Office 305, Block C",
      sugar: "Mild Sugar",
      milk: "Organic Oat Milk",
      price: "₹498",
      img: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
    };
    setIncomingOrder(mockOrderObj);
    setCountdown(60);
    startAlertRinging();

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopAlertRinging();
          setIncomingOrder(null);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const acceptOrderAlert = () => {
    stopAlertRinging();
    if (incomingOrder) {
      setOrders((prev) => [
        ...prev,
        {
          id: incomingOrder.id,
          customer: incomingOrder.customer,
          date: "Just now",
          status: "Received",
          total: incomingOrder.price,
          item: incomingOrder.item,
          office: incomingOrder.office,
          sugar: incomingOrder.sugar,
          milk: incomingOrder.milk,
          img: incomingOrder.img,
        },
      ]);
    }
    setIncomingOrder(null);
  };

  const rejectOrderAlert = () => {
    stopAlertRinging();
    setIncomingOrder(null);
  };

  const acceptSpecificOrder = async (id) => {
    try {
      await updateOrder(id, { status: "Pending" });
    } catch (err) {
      console.error("Error accepting order:", err);
    }
  };

  const rejectSpecificOrder = async (id) => {
    try {
      await updateOrder(id, { status: "Cancelled" });
    } catch (err) {
      console.error("Error rejecting order:", err);
    }
  };

  const handleRaiseAlert = (e) => {
    e.preventDefault();
    if (!requestQty) return;
    const newReq = {
      item: selectedItem,
      qty: requestQty,
      urgency: urgency,
      notes: requestNotes || "No notes",
      date: "Just now",
      status: "Sent to Admin"
    };
    setRestockRequests((prev) => [newReq, ...prev]);
    setToastMsg(`🚨 Restock alert for "${selectedItem}" has been sent to the Admin!`);
    setRequestQty("");
    setRequestNotes("");
    setTimeout(() => setToastMsg(""), 4500);
  };

  const handleToggleMenuAvailability = async (idx) => {
    const item = menuItems[idx]; if (item && item.id) { await updateMenuItem(item.id, { active: !item.active }); setMenuItems((prev) => prev.map((m, i) => (i === idx ? { ...m, active: !m.active } : m))); }
    setToastMsg(`Updated menu item availability!`);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleAddNewMenuItem = async (e) => {
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
    const id = await addMenuItem(newItem); setMenuItems((prev) => [...prev, { ...newItem, id }]);
    setToastMsg(`🌱 Added "${newMenuItemName}" to today's menu!`);
    setNewMenuItemName("");
    setNewMenuItemPrice("");
    setNewMenuItemImg("");
    setNewMenuItemDesc("");
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleAddNewProduct = async (e) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) return;
    const priceVal = parseFloat(newProdPrice) || 0;
    const newProductData = {
      name: newProdName,
      priceNum: priceVal,
      price: `₹${priceVal}`,
      desc: newProdDesc || "Premium beverage selection.",
      category: newProdCategory,
      caffeine: newProdCaffeine,
      sweetness: newProdSweetness,
      steepTime: newProdSteepTime,
      pairing: newProdPairing,
      rating: parseFloat(newProdRating) || 4.8,
      image: newProdImage || "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80"
    };
    
    try {
      await addProduct(newProductData);
      setToastMsg(`🌱 Added product "${newProdName}" successfully!`);
      setNewProdName("");
      setNewProdPrice("");
      setNewProdDesc("");
      setNewProdImage("");
      setNewProdCaffeine("Medium");
      setNewProdSweetness("Medium");
      setNewProdSteepTime("5 mins");
      setNewProdPairing("Biscuits");
      setNewProdRating(4.8);
      setTimeout(() => setToastMsg(""), 4000);
    } catch (err) {
      setToastMsg(`❌ Error: ${err.message}`);
      setTimeout(() => setToastMsg(""), 4000);
    }
  };

  const handleUploadImage = async (e, target = "new") => {
    const file = e.target.files[0];
    if (!file) return;
    
    setToastMsg("Uploading image to Cloudinary...");
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        if (target === "edit") {
          setEditProdImage(data.url);
        } else {
          setNewProdImage(data.url);
        }
        setToastMsg("Image uploaded successfully!");
        
        await addDoc(collection(db, "uploaded_images"), {
          url: data.url,
          uploadedAt: new Date().toISOString(),
          name: file.name
        });
      } else {
        setToastMsg(`Upload failed: ${data.error}`);
      }
      setTimeout(() => setToastMsg(""), 3000);
    } catch (err) {
      setToastMsg(`Upload error: ${err.message}`);
      setTimeout(() => setToastMsg(""), 3000);
    }
  };

  const handleSelectLibraryImage = (url) => {
    if (window.libraryTarget === "edit") {
      setEditProdImage(url);
    } else {
      setNewProdImage(url);
    }
    setShowImageLibrary(false);
  };

  const handleDeleteProduct = async (id) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id);
        setToastMsg("Product deleted successfully!");
        setTimeout(() => setToastMsg(""), 3000);
      } catch (err) {
        setToastMsg(`Error deleting product: ${err.message}`);
        setTimeout(() => setToastMsg(""), 3000);
      }
    }
  };

  const handleUpdateProductSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    const priceVal = parseFloat(editProdPrice) || 0;
    try {
      await updateProduct(editingProduct.id, {
        name: editProdName,
        priceNum: priceVal,
        price: `₹${priceVal}`,
        category: editProdCategory,
        desc: editProdDesc,
        image: editProdImage
      });
      setToastMsg("Product updated successfully!");
      setEditingProduct(null);
      setTimeout(() => setToastMsg(""), 3000);
    } catch (err) {
      setToastMsg(`Error updating product: ${err.message}`);
      setTimeout(() => setToastMsg(""), 3000);
    }
  };

  const handleAddNewStock = async (e) => {
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
    const id = await addStockItem(newItem); setStocks((prev) => [...prev, { ...newItem, id }]);
    setToastMsg(`🌱 Successfully added "${newStockName}" to Kitchen Stock!`);
    setNewStockName("");
    setNewStockQty("");
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleSaveStockEdit = async (idx) => {
    const item = stocks[idx]; if (item && item.id) { await updateStockItem(item.id, { qty: editStockQty, level: editStockLevel }); setStocks((prev) => prev.map((s, i) => (i === idx ? { ...s, qty: editStockQty, level: editStockLevel } : s))); }
    setEditingStockIdx(null);
    setToastMsg(`✓ Updated stock details successfully!`);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const toggleStockStatus = async (idx, level) => {
    const nextLevels = { "In Stock": "Low Stock", "Low Stock": "Out of Stock", "Out of Stock": "In Stock" }; const nextLvl = nextLevels[level] || "In Stock"; const item = stocks[idx]; if (item && item.id) { await updateStockItem(item.id, { level: nextLvl }); setStocks((prev) => prev.map((s, i) => (i === idx ? { ...s, level: nextLvl } : s))); }
  };

  const renderQueueCard = (o) => {
    const isHigh = o.priority === "High";
    const isLow = o.priority === "Low";
    const isNormal = o.priority === "Normal" || !o.priority;

    // Calculate live ticking elapsed time
    const elapsedMs = Date.now() - o.createdAt;
    const mins = Math.floor(elapsedMs / 60000);
    const secs = Math.floor((elapsedMs % 60000) / 1000);
    const elapsedStr = `${mins}m ${secs}s`;

    return (
      <div key={o.id} className={`queue-card-detailed-item ${isHigh ? "high-priority-pulse" : isLow ? "low-priority-style" : ""}`} style={{ marginBottom: "16px" }}>
        {/* Card top details */}
        <div className="queue-card-top-row">
          <span className="queue-card-id">{o.id}</span>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Toggle Priority Button: High -> Normal -> Low -> High */}
            <button
              onClick={() => {
                const nextLvl = o.priority === "High" ? "Normal" : o.priority === "Normal" ? "Low" : "High";
                updateOrder(o.id, { priority: nextLvl });
              }}
              style={{
                background: "rgba(44,27,13,0.05)",
                color: "#2c1b0d",
                border: "none",
                padding: "3px 8px",
                fontSize: "10.5px",
                fontWeight: "bold",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              ⭐ Cycle Priority
            </button>

            <span className={`priority-badge-pill ${o.priority?.toLowerCase() || "normal"}`}>
              {isHigh ? "🚨 HIGH" : isLow ? "🌱 LOW" : "🕒 STANDARD"}
            </span>
          </div>
        </div>

        {/* Card core body */}
        <div className="queue-card-body-wrap">
          <img src={o.img} alt={o.item} className="queue-card-thumbnail" />

          <div className="queue-card-text-details">
            <h4>{o.item}</h4>
            <span className="queue-customer-lbl">👤 Client: {o.customer}</span>
            <span className="queue-office-lbl">🏢 Office: {o.office}</span>

            {/* Date and Time Placed */}
            <span style={{ fontSize: "11px", color: "#888", display: "block", marginTop: "2px" }}>
              📅 Placed: {o.date} at {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {/* Live Counting Timer */}
            <span style={{ fontSize: "11px", color: "#e74c3c", display: "block", marginTop: "4px", fontWeight: "bold" }}>
              ⏳ Elapsed: {elapsedStr}
            </span>

            <div className="queue-customization-specs">
              <span>Sugar: {o.sugar}</span>
              <span>Milk: {o.milk}</span>
            </div>
          </div>
        </div>

        {/* Allocated Time / Users Wait Time Estimate Selector */}
        <div className="delivery-allocation-row" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", background: "#fbf9f6", padding: "10px", borderRadius: "10px", border: "1px solid rgba(44,27,13,0.05)" }}>
          <div style={{ flexGrow: 1 }}>
            <span style={{ fontSize: "10.5px", color: "#666", display: "block" }}>⏱️ Allocated Delivery Time</span>
            <strong style={{ fontSize: "12px", color: "#2c1b0d" }}>
              {o.allocatedTime ? `Est. Wait: ${o.allocatedTime}` : "Not Allocated yet"}
            </strong>
          </div>

          <select
            value={o.allocatedTime || ""}
            onChange={(e) => updateOrder(o.id, { allocatedTime: e.target.value })}
            style={{
              background: "#ffffff",
              border: "1px solid rgba(44,27,13,0.15)",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "11px",
              color: "#2c1b0d",
              outline: "none",
            }}
          >
            <option value="">Set Time</option>
            <option value="10 mins">10 mins</option>
            <option value="15 mins">15 mins</option>
            <option value="20 mins">20 mins</option>
            <option value="30 mins">30 mins</option>
            <option value="40 mins">40 mins</option>
          </select>
        </div>
        {/* Card action controls */}
        <div className="queue-card-action-bar">
          <div>
            <span style={{ fontSize: "11px", color: "#888", display: "block" }}>Amount Total</span>
            <strong style={{ fontSize: "14px", color: "#2c1b0d" }}>{o.total}</strong>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontWeight: "bold", color: "#888", marginRight: "auto" }}>
              Status: {o.status || "Received"}
            </span>
            {(o.status === "Received" || !o.status) && (
              <>
                <button onClick={() => rejectSpecificOrder(o.id)} style={{ background: "transparent", color: "#e74c3c", border: "1px solid #e74c3c", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                  Reject
                </button>
                <button onClick={() => acceptSpecificOrder(o.id)} style={{ background: "#27ae60", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                  Accept & Prepare
                </button>
              </>
            )}
            {(o.status === "Pending" || o.status === "Preparing") && (
              <button
                onClick={async () => { try { await updateOrder(o.id, { status: "Shipped" }); } catch (err) {} }}
                style={{ background: "#f39c12", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
              >
                Ready to Dispatch
              </button>
            )}
            {(o.status === "Shipped" || o.status === "In Transit") && (
              <button
                onClick={async () => { try { await updateOrder(o.id, { status: "Delivered" }); } catch (err) {} }}
                style={{ background: "#8a583c", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
              >
                Mark Delivered
              </button>
            )}
            {o.status === "Delivered" && <span style={{ background: "rgba(39,174,96,0.1)", color: "#27ae60", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>✓ Delivered</span>}
            {o.status === "Cancelled" && <span style={{ fontSize: "12px", color: "#e74c3c", fontWeight: "bold" }}>✕ Cancelled</span>}
          </div>
        </div>
      </div>
    );
  };

  const activeUnservedOrders = orders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled");
  const totalBrewsSummary = {};
  const addOnsSummary = { "Oat Milk": 0, "Almond Milk": 0, "No Sugar": 0, "Mild Sugar": 0 };

  activeUnservedOrders.forEach((o) => {
    const qtyMatch = o.item.match(/(.*?)\s*x\s*(\d+)/i);
    let baseName = o.item;
    let qty = 1;
    if (qtyMatch) {
      baseName = qtyMatch[1].trim();
      qty = parseInt(qtyMatch[2]);
    }
    totalBrewsSummary[baseName] = (totalBrewsSummary[baseName] || 0) + qty;

    if (o.milk && (o.milk === "Oat Milk" || o.milk === "Almond Milk" || o.milk === "Organic Oat Milk")) {
      const key = o.milk.includes("Oat") ? "Oat Milk" : "Almond Milk";
      addOnsSummary[key] = (addOnsSummary[key] || 0) + qty;
    }
    if (o.sugar && (o.sugar === "No Sugar" || o.sugar === "Mild Sugar")) {
      addOnsSummary[o.sugar] = (addOnsSummary[o.sugar] || 0) + qty;
    }
  });

  const itemImages = {
    "Classic Masala Chai": "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
    "Saffron Royal Chai": "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
    "Ginger Chai": "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg",
    "Ginger (Adrak) Chai": "/chai-ingredients.png",
    "Kashmiri Kahwa": "https://i.pinimg.com/736x/c4/a8/cc/c4a8ccde9a67e5f24e2be4d0621f4186.jpg",
    "Kesar Saffron Royal Chai": "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg"
  };

  const pendingSidebarOrders = orders
    .filter((o) => o.status === "Received")
    .sort((a, b) => a.id.localeCompare(b.id));

  const toggleSubscriptionStatus = async (sub) => {
    const newStatus = sub.status === "Active" ? "Paused" : "Active";
    try {
      await updateSubscription(sub.id, { status: newStatus });
      setToastMsg(`Subscription status updated to ${newStatus}!`);
      setTimeout(() => setToastMsg(""), 3000);
    } catch (err) {
      setToastMsg(`Error updating subscription: ${err.message}`);
      setTimeout(() => setToastMsg(""), 3000);
    }
  };

  const forceDispatchSubscription = async (sub) => {
    const newOrder = {
      customer: sub.customer || "Subscription Client",
      item: sub.items || "Classic Masala Chai",
      price: sub.price || "₹1,200",
      priceNum: parseFloat((sub.price || "1200").replace(/[^\d\.]/g, "")) || 0,
      status: "Received",
      date: new Date().toLocaleDateString("en-IN") + " " + new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }),
      sugar: sub.sugar || "Medium Sugar",
      milk: sub.milk || "Whole Milk",
      office: sub.office || "Desk Area",
      isSubscription: true,
      subscriptionId: sub.id
    };
    try {
      await addDoc(collection(db, "orders"), newOrder);
      setToastMsg(`🚀 Dispatched subscription order for ${sub.customer}!`);
      setTimeout(() => setToastMsg(""), 3000);
    } catch (err) {
      setToastMsg(`Error dispatching: ${err.message}`);
      setTimeout(() => setToastMsg(""), 3000);
    }
  };

  return (
    <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", fontFamily: "var(--font-body)", overflowX: "hidden" }}>

      {!isLoggedIn ? (
        <div className="login-gate-container">
          <form onSubmit={handleLoginSubmit} className="login-card">
            <div className="brewmaster-badge">ADMIN ACCESS ONLY</div>
            <h2>Authenticate Terminal</h2>
            <p>Enter operator credentials to link with active brewing controllers.</p>

            {loginError && <div className="login-error-alert">{loginError}</div>}

            <div className="form-group">
              <label>Operator Email</label>
              <input
                type="text"
                placeholder="Email (e.g. admin123@gmail.com)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <div className="form-group">
              <label>Operator Password</label>
              <input
                type="password"
                placeholder="Password (e.g. chai)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <button type="submit" className="btn-authenticate">
              AUTHENTICATE TERMINAL
            </button>
          </form>
        </div>
      ) : (
        /* BREWMASTER PANEL */
        <div className="dashboard-wrapper">

          {/* FIXED LEFT SIDEBAR */}
          <aside className="dashboard-sidebar">
            <div className="sidebar-logo">
              <svg width="32" height="32" viewBox="0 0 100 100" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
                <rect width="100" height="100" rx="20" fill="#fdf5e9" />
                <path d="M30 30h40v12H30V30zm0 24h40v12H30V54z" fill="#2c1b0d" />
              </svg>
              <span className="logo-text">ChaiCo.</span>
            </div>

            <div className="sidebar-menu">
              <button onClick={() => setActiveTab("dashboard")} className={`menu-icon-btn ${activeTab === "dashboard" ? "active" : ""}`}>
                <span className="btn-emoji">📊</span> Dashboard
              </button>
              <button onClick={() => setActiveTab("queue")} className={`menu-icon-btn ${activeTab === "queue" ? "active" : ""}`}>
                <span className="btn-emoji">📥</span> Order Queue
              </button>

              <button onClick={() => setActiveTab("stock")} className={`menu-icon-btn ${activeTab === "stock" ? "active" : ""}`}>
                <span className="btn-emoji">📦</span> Stock & Alerts
              </button>
              <button onClick={() => setActiveTab("earnings")} className={`menu-icon-btn ${activeTab === "earnings" ? "active" : ""}`}>
                <span className="btn-emoji">💰</span> Earnings & Payout
              </button>
              <button onClick={() => setActiveTab("history")} className={`menu-icon-btn ${activeTab === "history" ? "active" : ""}`}>
                <span className="btn-emoji">📜</span> Order History
              </button>
              <button onClick={() => setActiveTab("shop")} className={`menu-icon-btn ${activeTab === "shop" ? "active" : ""}`}>
                <span className="btn-emoji">🛍️</span> Products
              </button>
              <button onClick={() => setActiveTab("create_product")} className={`menu-icon-btn ${activeTab === "create_product" ? "active" : ""}`}>
                <span className="btn-emoji">➕</span> Create Product
              </button>

              <button onClick={() => setActiveTab("addons")} className={`menu-icon-btn ${activeTab === "addons" ? "active" : ""}`}>
                <span style={{ fontSize: "18px" }}>🍪</span>
                <span className="menu-text">Addons</span>
              </button>

              <button onClick={() => setActiveTab("feedback")} className={`menu-icon-btn ${activeTab === "feedback" ? "active" : ""}`}>
                <span className="btn-emoji">⭐</span> Feedback
              </button>
              <button onClick={() => setActiveTab("contact")} className={`menu-icon-btn ${activeTab === "contact" ? "active" : ""}`}>
                <span className="btn-emoji">📞</span> Contact Info
              </button>
              <button onClick={() => setActiveTab("subs")} className={`menu-icon-btn ${activeTab === "subs" ? "active" : ""}`}>
                <span className="btn-emoji">📅</span> Subscriptions Due
              </button>

              <button onClick={() => setActiveTab("leave")} className={`menu-icon-btn ${activeTab === "leave" ? "active" : ""}`}>
                <span className="btn-emoji">🚪</span> Leave & Shift
              </button>
              <button onClick={() => setActiveTab("profile")} className={`menu-icon-btn ${activeTab === "profile" ? "active" : ""}`}>
                <span className="btn-emoji">⚙️</span> Profile & Settings
              </button>
            </div>

            <div className="sidebar-bottom">
              <button onClick={handleLogout} className="menu-icon-btn logout">
                <span className="btn-emoji">🔌</span> Disconnect Operator
              </button>
            </div>
          </aside>

          {/* MAIN CONTAINER */}
          <div 
            className="dashboard-container"
            style={{
              marginRight: showPendingSidebar ? "420px" : "0",
              width: showPendingSidebar ? "calc(100% - 620px)" : "calc(100% - 200px)",
              transition: "margin-right 0.3s ease-in-out, width 0.3s ease-in-out"
            }}
          >

            {/* TOP HEADER */}
            <header className="dashboard-header-new">
              <div>
                <span className="welcome-label">Welcome!</span>
                <h1 className="operator-title">{brewmasterName}</h1>
              </div>

              <div className="header-search-box-wrap">
                <span className="search-icon-new">🔍</span>
                <input type="text" placeholder="Search Here" className="search-input-new" />
              </div>

              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <button 
                  onClick={() => setShowPendingSidebar(!showPendingSidebar)} 
                  style={{ 
                    background: "#2c1b0d", 
                    color: "#ffffff", 
                    border: "none", 
                    padding: "10px 18px", 
                    borderRadius: "20px", 
                    fontWeight: "bold", 
                    fontSize: "12.5px", 
                    cursor: "pointer", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "8px",
                    boxShadow: "0 4px 10px rgba(44, 27, 13, 0.15)"
                  }}
                >
                  📥 Pending Requests ({pendingSidebarOrders.length})
                </button>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowNotifications(!showNotifications)} className="alert-bell-btn" title="Simulate Alarm" style={{ border: "none", background: "transparent", fontSize: "18px", cursor: "pointer" }}>
                    🔔
                  </button>
                  {showNotifications && (
                    <div style={{ position: "absolute", top: "100%", right: "0", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "12px", width: "250px", padding: "12px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", zIndex: 100 }}>
                      <h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "#2c1b0d" }}>Notifications</h4>
                      {notifications.length === 0 ? (
                        <p style={{ fontSize: "12px", color: "#666" }}>No new notifications.</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
                            <div style={{ fontSize: "12px", color: "#333", fontWeight: "bold" }}>{n.text}</div>
                            <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{n.time}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                  alt="Profile"
                  className="profile-avatar-new"
                  onClick={() => setActiveTab("profile")}
                  style={{ cursor: "pointer" }}
                />
              </div>
            </header>

            {/* TAB CONTENT */}
            {activeTab === "dashboard" && (
              <div>

                {/* SUBHEADER */}
                <div className="sales-order-subheader">
                  <div>
                    <h2>Sales and Order</h2>
                    <p>Your Sales and Orders Summary Activates</p>
                  </div>

                  <div className="subheader-controls">
                    <button 
                      className="btn-export-data"
                      onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8," + 
                          "Order ID,Customer,Status,Total,Item,Date\n" +
                          filteredOrders.map(o => `${o.id},${o.customer || "N/A"},${o.status || "N/A"},${o.total || "0"},"${o.item || "N/A"}","${o.date || "N/A"}"`).join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", `chai_orders_${timeFilter.toLowerCase()}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      📤 Export Data
                    </button>

                    <div className="filter-pill-group">
                      {["Daily", "Weekly", "Monthly"].map((pill) => (
                        <button
                          key={pill}
                          onClick={() => setTimeFilter(pill)}
                          className={`filter-pill-btn ${timeFilter === pill ? "active" : ""}`}
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* STATS ROW */}
                <div className="stats-cards-row-new">
                  <div className="stats-card-item">
                    <div className="stats-card-title-row">
                      <span className="stats-icon-circle red-bg">📈</span>
                      <span>Total Sales</span>
                    </div>
                    <h3>{statsSummary.totalSales}</h3>
                    <span className="stats-percent-tag green">+8% <span style={{ color: "#777" }}>vs month</span></span>
                  </div>

                  <div className="stats-card-item">
                    <div className="stats-card-title-row">
                      <span className="stats-icon-circle yellow-bg">🛍️</span>
                      <span>Total Orders</span>
                    </div>
                    <h3>{statsSummary.totalOrders}</h3>
                    <span className="stats-percent-tag red">-3% <span style={{ color: "#777" }}>vs month</span></span>
                  </div>

                  <div className="stats-card-item">
                    <div className="stats-card-title-row">
                      <span className="stats-icon-circle green-bg">🚚</span>
                      <span>Delivery Shipment</span>
                    </div>
                    <h3>{statsSummary.deliveryShipment}</h3>
                    <span className="stats-percent-tag green">+12% <span style={{ color: "#777" }}>vs month</span></span>
                  </div>

                  <div className="stats-card-item">
                    <div className="stats-card-title-row">
                      <span className="stats-icon-circle red-bg">📦</span>
                      <span>Pending Shipment</span>
                    </div>
                    <h3>{statsSummary.pendingShipment}</h3>
                    <span className="stats-percent-tag red">-5% <span style={{ color: "#777" }}>vs month</span></span>
                  </div>

                  <div className="stats-card-item">
                    <div className="stats-card-title-row">
                      <span className="stats-icon-circle yellow-bg">💵</span>
                      <span>AVG Order Value</span>
                    </div>
                    <h3>{statsSummary.avgOrderValue}</h3>
                    <span className="stats-percent-tag green">+5% <span style={{ color: "#777" }}>vs month</span></span>
                  </div>
                </div>

                {/* MIDDLE ROW */}
                <div className="dashboard-double-row-grid">
                  <div className="dashboard-large-card">
                    <div className="card-header-new">
                      <h3>Sales Performance</h3>
                      <span className="payout-status-badge">Monthly ∨</span>
                    </div>
                    <div className="performance-tally-pills">
                      <span className="tally-pill red">{topItem1}</span>
                      <span className="tally-pill yellow">{topItem2}</span>
                      <span className="tally-pill green">{topItem3}</span>
                    </div>

                    <div className="bar-chart-performance-visual">
                      <div className="y-axis-labels">
                        <span>250</span><span>200</span><span>150</span><span>100</span><span>50</span><span>0</span>
                      </div>
                      <div className="bars-track-new">
                        {monthsData.map((bar, i) => (
                          <div key={i} className="bar-column-new">
                            <div className="bar-rect-track">
                              <div
                                className={`bar-rect-fill ${bar.highlighted ? "highlighted" : ""}`}
                                style={{ height: `${bar.h}%` }}
                              >
                                {bar.highlighted && (
                                  <div className="chart-tooltip-bubble">
                                    Total Revenue<br /><strong>₹{bar.val.toLocaleString()}</strong>
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="bar-month-lbl">{bar.m}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-large-card">
                    <div className="card-header-new">
                      <h3>Recent Orders</h3>
                    </div>
                    <div className="table-wrapper-new">
                      <table className="recent-orders-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Customer Name</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.slice(0, 4).map((o) => (
                            <tr key={o.id}>
                              <td><strong>{o.id}</strong></td>
                              <td>{o.customer}</td>
                              <td>{o.date}</td>
                              <td>
                                <span className={`table-status-pill ${o.status.toLowerCase()}`}>
                                  {o.status}
                                </span>
                              </td>
                              <td>{o.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ROW */}
                <div className="dashboard-double-row-grid" style={{ marginTop: "28px" }}>
                  <div className="dashboard-large-card">
                    <div className="card-header-new">
                      <h3>Inventory Status Check</h3>
                    </div>
                    <div className="inventory-cards-grid-new">
                      {stocks.map((s, i) => (
                        <div key={i} className="inventory-progress-card-item">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong>{s.name.split(" ")[0]}</strong>
                            <span className="inventory-indicator-bullet">●</span>
                          </div>
                          <span style={{ fontSize: "12px", color: "#666", display: "block", marginTop: "4px" }}>
                            {s.qty}
                          </span>
                          <div className="inventory-progress-bar-wrap">
                            <div className="inventory-progress-bar-fill" style={{ width: "75%" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="dashboard-large-card">
                    <div className="card-header-new">
                      <h3>Customer Management</h3>
                    </div>
                    <div className="table-wrapper-new">
                      <table className="recent-orders-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Total Orders</th>
                            <th>Total Value</th>
                            <th>Loyalty Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerManagement.map((c, i) => (
                            <tr key={i}>
                              <td><strong>{c.name}</strong></td>
                              <td>{c.orders}</td>
                              <td>{c.value}</td>
                              <td>
                                <span className={`loyalty-pill ${c.loyalty.toLowerCase()}`}>
                                  {c.loyalty}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: ORDER QUEUE */}
            {activeTab === "queue" && (
              <div className="tab-body-wrapper">

                {/* Summary of Active Brews on Top - Removed per user request */}

                <h3 className="section-title">Active Brewing Priority Board</h3>

                <div className="queue-kanban-board">
                  {/* COLUMN 1: HIGH PRIORITY */}
                  <div className="kanban-column high-col">
                    <div className="kanban-column-header">
                      <span>🚨 High Priority</span>
                      <span className="kanban-badge red">
                        {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "High").length}
                      </span>
                    </div>
                    <div className="kanban-cards-stack">
                      {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "High").length === 0 ? (
                        <div className="empty-column-msg">No high priority orders</div>
                      ) : (
                        orders
                          .filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "High")
                          .sort((a, b) => a.id.localeCompare(b.id))
                          .map((o) => renderQueueCard(o))
                      )}
                    </div>
                  </div>

                  {/* COLUMN 2: STANDARD / NORMAL PRIORITY */}
                  <div className="kanban-column normal-col">
                    <div className="kanban-column-header">
                      <span>🕒 Standard Priority</span>
                      <span className="kanban-badge chocolate">
                        {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && (o.priority === "Normal" || !o.priority)).length}
                      </span>
                    </div>
                    <div className="kanban-cards-stack">
                      {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && (o.priority === "Normal" || !o.priority)).length === 0 ? (
                        <div className="empty-column-msg">No standard orders</div>
                      ) : (
                        orders
                          .filter((o) => o.status !== "Delivered" && o.status !== "Completed" && (o.priority === "Normal" || !o.priority))
                          .sort((a, b) => a.id.localeCompare(b.id))
                          .map((o) => renderQueueCard(o))
                      )}
                    </div>
                  </div>

                  {/* COLUMN 3: LOW PRIORITY */}
                  <div className="kanban-column low-col">
                    <div className="kanban-column-header">
                      <span>🌱 Low Priority</span>
                      <span className="kanban-badge green">
                        {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "Low").length}
                      </span>
                    </div>
                    <div className="kanban-cards-stack">
                      {orders.filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "Low").length === 0 ? (
                        <div className="empty-column-msg">No low priority orders</div>
                      ) : (
                        orders
                          .filter((o) => o.status !== "Delivered" && o.status !== "Completed" && o.priority === "Low")
                          .sort((a, b) => a.id.localeCompare(b.id))
                          .map((o) => renderQueueCard(o))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OTHER OPERATIONAL TABS */}
            {activeTab === "prep" && false && (
              <div className="tab-body-wrapper">

                {/* Stats Header Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                    <span style={{ fontSize: "11px", color: "#666", display: "block" }}>☕ Total Beverage Tally</span>
                    <strong style={{ fontSize: "22px", color: "#2c1b0d" }}>78 Cups Required</strong>
                  </div>
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                    <span style={{ fontSize: "11px", color: "#666", display: "block" }}>🏢 Route Groups (Floors)</span>
                    <strong style={{ fontSize: "22px", color: "#2c1b0d" }}>3 Office Floors</strong>
                  </div>
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                    <span style={{ fontSize: "11px", color: "#666", display: "block" }}>🕒 Next Peak Rush Prediction</span>
                    <strong style={{ fontSize: "16px", color: "#e74c3c", display: "block", marginTop: "4px" }}>9:00 - 9:30 AM (Pre-brew 20c)</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "28px" }}>

                  {/* Left Column: Detailed Beverage prep cards */}
                  <div>
                    <h3 className="section-title">Today's Cooking Prep Tally</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                      {[
                        {
                          name: "Classic Masala Chai",
                          qty: 24,
                          brewed: 18,
                          img: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
                          recipe: "Assam base + crushed winter spices + whole milk",
                        },
                        {
                          name: "Cardamom (Elaichi) Chai",
                          qty: 18,
                          brewed: 14,
                          img: "https://i.pinimg.com/1200x/5c/b8/8a/5cb88a02e013987379378009ba8d7eb2.jpg",
                          recipe: "Elaichi pods + CTC tea + whole milk + low sugar",
                        },
                        {
                          name: "Ginger (Adrak) Chai",
                          qty: 15,
                          brewed: 9,
                          img: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg",
                          recipe: "Fresh farm grated ginger + CTC granules + light milk",
                        },
                        {
                          name: "Saffron Royal Chai",
                          qty: 9,
                          brewed: 5,
                          img: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
                          recipe: "Luxury Kashmiri saffron + cardamoms + thick milk base",
                        },
                        {
                          name: "Kashmiri Kahwa",
                          qty: 12,
                          brewed: 8,
                          img: "https://i.pinimg.com/736x/c4/a8/cc/c4a8ccde9a67e5f24e2be4d0621f4186.jpg",
                          recipe: "Green tea leaves + saffron strands + cinnamon + almond slivers",
                        },
                      ].map((item, idx) => {
                        const progress = (item.brewed / item.qty) * 100;
                        return (
                          <div key={idx} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "18px" }}>
                            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "12px" }}>
                              <img src={item.img} alt={item.name} className="queue-card-thumbnail" style={{ width: "56px", height: "56px" }} />
                              <div>
                                <h4 style={{ fontSize: "14px", margin: "0 0 4px" }}>{item.name}</h4>
                                <span style={{ fontSize: "10px", color: "#777", display: "block" }}>{item.recipe}</span>
                              </div>
                            </div>

                            <div style={{ margin: "10px 0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                                <span>Progress (Brewed)</span>
                                <strong>{item.brewed} / {item.qty} cups</strong>
                              </div>
                              <div className="inventory-progress-bar-wrap" style={{ background: "rgba(44, 27, 13, 0.05)", height: "6px" }}>
                                <div className="inventory-progress-bar-fill" style={{ width: `${progress}%`, background: "#2c1b0d" }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Routing optimization & Rush alerts */}
                  <div>
                    <h3 className="section-title">Route Optimizer (Floors)</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {[
                        {
                          floor: "Floor 5 (Block B)",
                          items: "5x Masala Chai, 2x Almond Cookies",
                          status: "High Demand",
                          courier: "Ramesh Kumar",
                        },
                        {
                          floor: "Floor 3 (Main Hall)",
                          items: "3x Ginger Chai, 4x Saffron Chai",
                          status: "Medium Demand",
                          courier: "Suresh Singh",
                        },
                        {
                          floor: "Floor 4 (Executive Cabin)",
                          items: "2x Kashmiri Kahwa, 1x Cardamom Chai",
                          status: "Normal",
                          courier: "Mahesh Pal",
                        },
                      ].map((route, i) => (
                        <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <h4 style={{ fontSize: "13.5px", margin: 0 }}>🏢 {route.floor}</h4>
                            <span className="priority-badge-pill normal" style={{ background: route.status === "High Demand" ? "rgba(231,76,60,0.1)" : "rgba(44,27,13,0.05)", color: route.status === "High Demand" ? "#e74c3c" : "#2c1b0d", fontSize: "9px" }}>
                              {route.status}
                            </span>
                          </div>
                          <p style={{ fontSize: "12px", color: "#666", margin: "0 0 8px" }}>📦 items: <strong>{route.items}</strong></p>
                          <div style={{ borderTop: "1px dashed rgba(0,0,0,0.05)", paddingTop: "8px", fontSize: "11px", display: "flex", justifyContent: "space-between" }}>
                            <span>Runner Allocated</span>
                            <strong>🏃 {route.courier}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {activeTab === "stock" && (() => {
              const totalValuation = stocks.reduce((acc, curr) => {
                const numericVal = parseFloat(curr.qty.split(" ")[0]) || 0;
                return acc + (numericVal * (curr.unitPrice || 0));
              }, 0);

              return (
                <div className="tab-body-wrapper">
                  {/* Toast Message Overlay */}
                  {toastMsg && (
                    <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                      <span>🚨</span> {toastMsg}
                    </div>
                  )}

                  <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>


                      {/* Logs of Raised Requests */}
                      <h4 style={{ fontSize: "13px", color: "#2c1b0d", marginBottom: "12px", fontWeight: "800" }}>📋 Restock Requests Log</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {restockRequests.map((r, i) => (
                          <div key={i} style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.03)", fontSize: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <strong>{r.item}</strong>
                              <span style={{ fontSize: "10px", background: r.urgency === "High" ? "rgba(231,76,60,0.1)" : "rgba(0,0,0,0.05)", color: r.urgency === "High" ? "#e74c3c" : "#555", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                {r.urgency} Urgency
                              </span>
                            </div>
                            <span style={{ display: "block", color: "#666" }}>Qty Requested: {r.qty}</span>
                            <span style={{ display: "block", color: "#888", fontStyle: "italic", fontSize: "11px", marginTop: "2px" }}>Notes: {r.notes}</span>

                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", borderTop: "1px solid rgba(0,0,0,0.02)", paddingTop: "6px", fontSize: "10px" }}>
                              <span style={{ color: "#27ae60" }}>● {r.status}</span>
                              <span style={{ color: "#999" }}>{r.date}</span>
                            </div>
                            
                            {/* Admin Controls */}
                            <div style={{ marginTop: "8px", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "8px" }}>
                              <select 
                                value={r.status} 
                                onChange={(e) => updateRestockRequest(r.id, { status: e.target.value })}
                                style={{ padding: "4px", fontSize: "10px", borderRadius: "4px", width: "100%", marginBottom: "6px", border: "1px solid #ddd" }}>
                                <option value="Sent to Admin">Sent to Admin</option>
                                <option value="Approved">Approved</option>
                                <option value="Ordered">Ordered</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                              <div style={{ display: "flex", gap: "4px" }}>
                                <input 
                                  type="text" 
                                  placeholder="Admin reply message..." 
                                  id={`restock-msg-${r.id}`}
                                  defaultValue={r.adminMessage || ""}
                                  style={{ flex: 1, padding: "4px 8px", fontSize: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
                                />
                                <button 
                                  onClick={() => {
                                    const msg = document.getElementById(`restock-msg-${r.id}`).value;
                                    updateRestockRequest(r.id, { adminMessage: msg });
                                    alert("Message sent to Chai Maker!");
                                  }}
                                  style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                >
                                  Update Message
                                </button>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>

                  </div>
                </div>
              )
            })()}

            {activeTab === "earnings" && (() => {
              const totalGross = totalSalesVal;
              const pendingPayoutVal = orders.filter(o => o.status === "Received" || o.status === "Pending").reduce((acc, o) => {
                const val = typeof o.total === "string" ? parseFloat(o.total.replace(/[^\d\.]/g, "")) : parseFloat(o.total);
                return acc + (isNaN(val) ? 0 : val);
              }, 0);
              const settledTransactionsVal = orders.filter(o => o.status === "Delivered" || o.status === "Completed").length;

              const transactions = orders.map((o, idx) => {
                return {
                  id: `TXN-${o.id.replace(/[^\d]/g, "") || idx + 1001}`,
                  name: o.customer || "Loyal Customer",
                  method: o.paymentMethod || "UPI Payment",
                  amount: typeof o.total === "string" && o.total.includes("₹") ? o.total : `₹${o.total}`,
                  time: o.date || "Just now",
                  status: o.status === "Delivered" || o.status === "Completed" ? "Successful" : "Processing"
                };
              }).slice(0, 10);

              const weekdaySales = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
              orders.forEach(o => {
                if (!o.date) return;
                const d = new Date(o.date);
                if (!isNaN(d.getTime())) {
                  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const dayName = days[d.getDay()];
                  const val = typeof o.total === "string" ? parseFloat(o.total.replace(/[^\d\.]/g, "")) : parseFloat(o.total);
                  if (!isNaN(val)) {
                    weekdaySales[dayName] = (weekdaySales[dayName] || 0) + val;
                  }
                }
              });
              
              const maxDaySale = Math.max(...Object.values(weekdaySales), 1);
              const chartData = [
                { day: "Mon", val: (weekdaySales.Mon / maxDaySale) * 100 || 10, amount: `₹${weekdaySales.Mon.toLocaleString()}` },
                { day: "Tue", val: (weekdaySales.Tue / maxDaySale) * 100 || 15, amount: `₹${weekdaySales.Tue.toLocaleString()}` },
                { day: "Wed", val: (weekdaySales.Wed / maxDaySale) * 100 || 12, amount: `₹${weekdaySales.Wed.toLocaleString()}` },
                { day: "Thu", val: (weekdaySales.Thu / maxDaySale) * 100 || 20, amount: `₹${weekdaySales.Thu.toLocaleString()}` },
                { day: "Fri", val: (weekdaySales.Fri / maxDaySale) * 100 || 18, amount: `₹${weekdaySales.Fri.toLocaleString()}` },
                { day: "Sat", val: (weekdaySales.Sat / maxDaySale) * 100 || 25, amount: `₹${weekdaySales.Sat.toLocaleString()}` },
                { day: "Sun", val: (weekdaySales.Sun / maxDaySale) * 100 || 30, amount: `₹${weekdaySales.Sun.toLocaleString()}` },
              ];

              return (
                <div className="tab-body-wrapper">

                  {/* Earnings Metrics Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>💰 Total Gross Earnings</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>₹{totalGross.toLocaleString()}</strong>
                      <span style={{ fontSize: "10.5px", color: "#27ae60", display: "block", marginTop: "4px" }}>▲ Live database synced</span>
                    </div>
                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>🏦 Pending Payout (Auto-Transfer)</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>₹{pendingPayoutVal.toLocaleString()}</strong>
                      <span style={{ fontSize: "10.5px", color: "#8a583c", display: "block", marginTop: "4px" }}>Scheduled: Friday, 6:00 PM</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>💳 Total Payments Settled</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>{settledTransactionsVal} Transactions</strong>
                      <span style={{ fontSize: "10.5px", color: "#27ae60", display: "block", marginTop: "4px" }}>🟢 UPI gateway healthy</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>

                    {/* Left Column: Earnings Graph & settlements */}
                    <div>
                      <h3 className="section-title">Weekly Revenue Trends</h3>

                      {/* Premium CSS Chart */}
                      <div style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "200px", paddingBottom: "10px", borderBottom: "1px solid rgba(0,0,0,0.06)", position: "relative" }}>

                          {/* Y-Axis Guideline markers */}
                          <div style={{ position: "absolute", left: 0, right: 0, top: "25%", borderBottom: "1px dashed rgba(0,0,0,0.03)", pointerEvents: "none" }} />
                          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderBottom: "1px dashed rgba(0,0,0,0.03)", pointerEvents: "none" }} />
                          <div style={{ position: "absolute", left: 0, right: 0, top: "75%", borderBottom: "1px dashed rgba(0,0,0,0.03)", pointerEvents: "none" }} />

                          {chartData.map((d, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative", zIndex: 1 }}>

                              {/* Hover Tooltip Value */}
                              <span style={{ fontSize: "10px", background: "#2c1b0d", color: "#fdf5e9", padding: "2px 6px", borderRadius: "4px", position: "absolute", bottom: `${d.val + 8}%`, opacity: 0.9, fontWeight: "bold" }}>
                                {d.amount}
                              </span>

                              {/* Bar */}
                              <div
                                style={{
                                  width: "28px",
                                  height: `${(d.val / 100) * 160}px`,
                                  background: "linear-gradient(180deg, #8a583c 0%, #2c1b0d 100%)",
                                  borderRadius: "6px 6px 0 0",
                                  transition: "transform 0.2s",
                                  cursor: "pointer"
                                }}
                              />
                              <span style={{ fontSize: "11px", color: "#666", marginTop: "8px", fontWeight: "bold" }}>{d.day}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Daily settlements breakdown list */}
                      <h3 className="section-title">Today's Settlement Details</h3>
                      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                        {todaySettlements.map((s, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: i === todaySettlements.length - 1 ? "none" : "1px solid rgba(0,0,0,0.04)", fontSize: "13px" }}>
                            <span style={{ color: "#555" }}>{s.item}</span>
                            <strong style={{ color: "#2c1b0d" }}>{s.value}</strong>
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* Right Column: Payments transaction feed */}
                    <div>
                      <h3 className="section-title">All Transaction Payments</h3>

                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {transactions.map((t, idx) => (
                          <div key={idx} style={{ background: "#ffffff", padding: "16px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong style={{ fontSize: "13.5px", display: "block", color: "#2c1b0d" }}>{t.name}</strong>
                              <span style={{ fontSize: "11px", color: "#666" }}>{t.method} • {t.time}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <strong style={{ fontSize: "15px", display: "block", color: "#27ae60" }}>{t.amount}</strong>
                              <span style={{ fontSize: "9px", background: "rgba(39, 174, 96, 0.1)", color: "#27ae60", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                {t.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>

                  </div>

                </div>
              );
            })()}

            {activeTab === "history" && (() => {
              const filteredHistory = historyOrders.filter((h) => {
                if (historyDateFilter === "today") {
                  return h.date.includes("09/12/2026");
                }
                if (historyDateFilter === "7days") {
                  return h.date.includes("09/12/2026") || h.date.includes("09/11/2026");
                }
                return true;
              });

              return (
                <div className="tab-body-wrapper">

                  {/* Invoice Modal Overlay */}
                  {activeInvoice && (() => {
                    const cleanId = activeInvoice.id.replace("#", "");
                    const priceVal = parseFloat(activeInvoice.total.replace("₹", "")) || 0;
                    const subTotal = (priceVal / 1.05).toFixed(2);
                    const taxVal = (priceVal - subTotal).toFixed(2);

                    return (
                      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, overflowY: "auto", padding: "20px" }}>
                        <style>{`
                          @media print {
                            body {
                              background: #ffffff !important;
                            }
                            body * {
                              visibility: hidden !important;
                            }
                            #printable-invoice-card, #printable-invoice-card * {
                              visibility: visible !important;
                            }
                            #printable-invoice-card {
                              position: absolute !important;
                              left: 0 !important;
                              top: 0 !important;
                              width: 100% !important;
                              border: none !important;
                              box-shadow: none !important;
                              padding: 0 !important;
                              margin: 0 !important;
                            }
                            .no-print {
                              display: none !important;
                            }
                          }
                        `}</style>
                        {/* Wrapper for Printable card and control buttons */}
                        <div style={{ width: "680px" }}>

                          {/* Close & Print Buttons Panel */}
                          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                            <button
                              type="button"
                              onClick={() => setActiveInvoice(null)}
                              style={{ padding: "8px 16px", background: "#fdf5e9", border: "1px solid rgba(44,27,13,0.2)", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "13px", color: "#2c1b0d", display: "flex", alignItems: "center", gap: "6px" }}
                            >
                              <span>←</span> Back to Order History
                            </button>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              style={{ padding: "8px 20px", background: "#2c1b0d", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
                            >
                              🖨️ Print or Download PDF
                            </button>
                          </div>

                          {/* INVOICE CARD (replicates corporate template layout) */}
                          <div id="printable-invoice-card" style={{ background: "#ffffff", padding: "48px", borderRadius: "8px", boxShadow: "0 10px 40px rgba(0,0,0,0.15)", border: "1px solid rgba(0,0,0,0.08)", color: "#2c1b0d", fontFamily: "Arial, sans-serif" }}>

                            {/* Row 1: Logo & INVOICE header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "28px" }}>🍵</span>
                                <div>
                                  <strong style={{ fontSize: "20px", color: "#2c1b0d", letterSpacing: "0.5px" }}>CHAI HEROES</strong>
                                  <span style={{ display: "block", fontSize: "9px", color: "#8a583c", textTransform: "uppercase", fontWeight: "bold", letterSpacing: "1px" }}>Brewmaster Terminal</span>
                                </div>
                              </div>
                              <h1 style={{ fontSize: "28px", color: "#2c1b0d", letterSpacing: "2px", margin: 0, fontWeight: "300", textTransform: "uppercase" }}>INVOICE</h1>
                            </div>

                            {/* Row 2: Details Columns */}
                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 2fr", gap: "16px", borderBottom: "1px solid #eee", paddingBottom: "20px", marginBottom: "20px" }}>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#888", display: "block", textTransform: "uppercase", marginBottom: "4px" }}>Invoice no.</span>
                                <strong style={{ fontSize: "13px" }}>#CH-{cleanId}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#888", display: "block", textTransform: "uppercase", marginBottom: "4px" }}>Date</span>
                                <strong style={{ fontSize: "13px" }}>{activeInvoice.date.split(" ")[0]}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#888", display: "block", textTransform: "uppercase", marginBottom: "4px" }}>Invoice to:</span>
                                <strong style={{ fontSize: "13.5px", display: "block" }}>{activeInvoice.customer}</strong>
                                <span style={{ fontSize: "11px", color: "#666" }}>Corporate Desk Partner</span>
                              </div>
                            </div>

                            {/* Row 3: Total Due block */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fbf9f6", padding: "20px 24px", borderRadius: "6px", marginBottom: "28px", border: "1px solid rgba(44,27,13,0.03)" }}>
                              <div>
                                <span style={{ fontSize: "10px", color: "#8a583c", textTransform: "uppercase", display: "block", fontWeight: "bold", letterSpacing: "0.5px" }}>TOTAL DUE</span>
                                <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>{activeInvoice.total}</strong>
                              </div>
                              <div style={{ textAlign: "right", fontSize: "11.5px", color: "#555" }}>
                                <span style={{ display: "block", fontWeight: "bold", color: "#2c1b0d" }}>📍 Delivery Destination</span>
                                <span>{activeInvoice.office}</span>
                              </div>
                            </div>

                            {/* Row 4: Main Itemized Table */}
                            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px" }}>
                              <thead>
                                <tr style={{ background: "#2c1b0d", color: "#ffffff", fontSize: "12px", textTransform: "uppercase" }}>
                                  <th style={{ padding: "10px 16px", textAlign: "left", borderRadius: "4px 0 0 4px" }}>Item Description</th>
                                  <th style={{ padding: "10px 16px", textAlign: "right" }}>Unit Price</th>
                                  <th style={{ padding: "10px 16px", textAlign: "center" }}>Qty</th>
                                  <th style={{ padding: "10px 16px", textAlign: "right", borderRadius: "0 4px 4px 0" }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ borderBottom: "1px solid #eee", fontSize: "13px" }}>
                                  <td style={{ padding: "16px" }}>
                                    <strong style={{ display: "block" }}>{activeInvoice.items}</strong>
                                    <span style={{ fontSize: "11px", color: "#666" }}>Pref: {activeInvoice.customization}</span>
                                  </td>
                                  <td style={{ padding: "16px", textAlign: "right" }}>₹{subTotal}</td>
                                  <td style={{ padding: "16px", textAlign: "center" }}>1</td>
                                  <td style={{ padding: "16px", textAlign: "right", fontWeight: "bold" }}>₹{subTotal}</td>
                                </tr>
                              </tbody>
                            </table>

                            {/* Row 5: Payout acceptance & totals */}
                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", marginBottom: "40px" }}>
                              <div>
                                <strong style={{ fontSize: "11px", textTransform: "uppercase", display: "block", color: "#666", marginBottom: "8px" }}>Payment Method We Accept</strong>
                                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                  <span style={{ fontSize: "12px", background: "rgba(44,27,13,0.05)", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>UPI (Instant)</span>
                                  <span style={{ fontSize: "12px", background: "rgba(44,27,13,0.05)", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>Corporate Wallet</span>
                                </div>
                              </div>

                              <div style={{ fontSize: "12.5px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#666" }}>
                                  <span>Sub Total:</span>
                                  <span>₹{subTotal}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#666", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                                  <span>Tax (GST 5%):</span>
                                  <span>₹{taxVal}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#2c1b0d", color: "#ffffff", borderRadius: "4px", marginTop: "10px", fontWeight: "bold" }}>
                                  <span>Grand Total:</span>
                                  <span>{activeInvoice.total}</span>
                                </div>
                              </div>
                            </div>

                            {/* Signature element */}
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "40px" }}>
                              <div style={{ textAlign: "center", width: "160px" }}>
                                <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "16px", color: "#8a583c", display: "block", marginBottom: "4px" }}>Brewmaster Admin</span>
                                <div style={{ borderTop: "1px solid #ccc", paddingTop: "6px", fontSize: "10.5px", color: "#888", textTransform: "uppercase", fontWeight: "bold" }}>Accounts Manager</div>
                              </div>
                            </div>

                            {/* Bottom Info bar */}
                            <div style={{ borderTop: "1px solid #eee", marginTop: "40px", paddingTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "#999" }}>
                              <span>🏢 Corporate Park Hub Road, Block A</span>
                              <span>📞 Support Desk: +91 99999 00000</span>
                              <span>✉️ billing@chaiheroes.com</span>
                            </div>

                          </div>
                        </div>

                      </div>
                    );
                  })()}

                  {/* Stats Info Cards */}
                  {(() => {
                    const deliveredCount = orders.filter(o => o.status === "Delivered").length;
                    const cancelledCount = orders.filter(o => o.status === "Cancelled").length;
                    const totalSettled = deliveredCount + cancelledCount;
                    const successRate = totalSettled === 0 ? 100 : ((deliveredCount / totalSettled) * 100).toFixed(1);

                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                          <span style={{ fontSize: "11px", color: "#666", display: "block" }}>☕ Total Served Brews</span>
                          <strong style={{ fontSize: "20px", color: "#2c1b0d" }}>{deliveredCount} Completed</strong>
                        </div>
                        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                          <span style={{ fontSize: "11px", color: "#666", display: "block" }}>📈 Settlement Success Rate</span>
                          <strong style={{ fontSize: "20px", color: "#27ae60" }}>{successRate}% Successful</strong>
                        </div>
                        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                          <span style={{ fontSize: "11px", color: "#666", display: "block" }}>🛑 Cancelled / Refunded</span>
                          <strong style={{ fontSize: "20px", color: "#e74c3c" }}>{cancelledCount} Invoices</strong>
                        </div>
                      </div>
                    );
                  })()}

                  {/* View Toggles & Filters Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>

                    {/* Date Filters */}
                    <div style={{ display: "flex", background: "rgba(44,27,13,0.05)", padding: "4px", borderRadius: "8px" }}>
                      {["today", "7days", "all"].map((filter) => (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setHistoryDateFilter(filter)}
                          style={{
                            padding: "6px 14px",
                            border: "none",
                            background: historyDateFilter === filter ? "#2c1b0d" : "transparent",
                            color: historyDateFilter === filter ? "#ffffff" : "#2c1b0d",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            textTransform: "capitalize"
                          }}
                        >
                          {filter === "7days" ? "Last 7 Days" : filter}
                        </button>
                      ))}
                    </div>

                    {/* Format Layout Toggle */}
                    <div style={{ display: "flex", background: "rgba(44,27,13,0.05)", padding: "4px", borderRadius: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode("grid")}
                        style={{
                          padding: "6px 14px",
                          border: "none",
                          background: historyViewMode === "grid" ? "#2c1b0d" : "transparent",
                          color: historyViewMode === "grid" ? "#ffffff" : "#2c1b0d",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        📱 Grid View
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode("list")}
                        style={{
                          padding: "6px 14px",
                          border: "none",
                          background: historyViewMode === "list" ? "#2c1b0d" : "transparent",
                          color: historyViewMode === "list" ? "#ffffff" : "#2c1b0d",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        📋 List View
                      </button>
                    </div>

                  </div>

                  {/* Toast Message Overlay */}
                  {toastMsg && (
                    <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", display: "flex", gap: "10px", alignItems: "center" }}>
                      <span>🖨️</span> {toastMsg}
                    </div>
                  )}

                  {/* Render List or Grid */}
                  {historyViewMode === "grid" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                      {filteredHistory.map((h, i) => (
                        <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px solid rgba(0,0,0,0.03)", paddingBottom: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "800", color: "#8a583c" }}>{h.id}</span>
                            <span style={{ fontSize: "11px", color: "#888" }}>{h.date}</span>
                          </div>

                          <div style={{ marginBottom: "14px" }}>
                            <span style={{ fontSize: "14px", display: "block", fontWeight: "bold" }}>👤 {h.customer}</span>
                            <span style={{ fontSize: "12px", color: "#555", display: "block", margin: "4px 0" }}>📦 {h.items}</span>
                            <span style={{ fontSize: "11px", color: "#888", display: "block" }}>⚙️ Add-ons: {h.customization}</span>
                            <span style={{ fontSize: "11px", color: "#888", display: "block" }}>🏢 Desk: {h.office}</span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <span style={{ fontSize: "10.5px", background: h.status === "Delivered" ? "rgba(39, 174, 96, 0.1)" : "rgba(231, 76, 60, 0.1)", color: h.status === "Delivered" ? "#27ae60" : "#e74c3c", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", marginRight: "6px" }}>
                                ● {h.status}
                              </span>
                              <strong style={{ fontSize: "14px", color: "#2c1b0d" }}>{h.total}</strong>
                            </div>

                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                onClick={() => setActiveInvoice(h)}
                                style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                              >
                                Print Invoice
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setToastMsg(`🔄 Re-opened order ${h.id} as active brewing request!`);
                                  setTimeout(() => setToastMsg(""), 3000);
                                }}
                                style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                              >
                                Re-open
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* LIST VIEW MODE */
                    <div style={{ background: "#ffffff", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "#fbf9f6", borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: "11px", textTransform: "uppercase", color: "#666" }}>
                            <th style={{ padding: "16px" }}>Order ID</th>
                            <th style={{ padding: "16px" }}>Customer</th>
                            <th style={{ padding: "16px" }}>Items & Details</th>
                            <th style={{ padding: "16px" }}>Desk</th>
                            <th style={{ padding: "16px" }}>Date</th>
                            <th style={{ padding: "16px" }}>Total</th>
                            <th style={{ padding: "16px" }}>Status</th>
                            <th style={{ padding: "16px", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistory.map((h, i) => (
                            <tr key={i} style={{ borderBottom: i === filteredHistory.length - 1 ? "none" : "1px solid rgba(0,0,0,0.04)", fontSize: "12.5px" }}>
                              <td style={{ padding: "16px", fontWeight: "bold", color: "#8a583c" }}>{h.id}</td>
                              <td style={{ padding: "16px", fontWeight: "bold" }}>{h.customer}</td>
                              <td style={{ padding: "16px" }}>
                                <span style={{ display: "block" }}>{h.items}</span>
                                <span style={{ fontSize: "10px", color: "#888" }}>{h.customization}</span>
                              </td>
                              <td style={{ padding: "16px", color: "#555" }}>{h.office}</td>
                              <td style={{ padding: "16px", color: "#777" }}>{h.date}</td>
                              <td style={{ padding: "16px", fontWeight: "bold", color: "#2c1b0d" }}>{h.total}</td>
                              <td style={{ padding: "16px" }}>
                                <span style={{ fontSize: "10px", background: h.status === "Delivered" ? "rgba(39, 174, 96, 0.1)" : "rgba(231, 76, 60, 0.1)", color: h.status === "Delivered" ? "#27ae60" : "#e74c3c", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold" }}>
                                  {h.status}
                                </span>
                              </td>
                              <td style={{ padding: "16px", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => setActiveInvoice(h)}
                                    style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "4px", fontSize: "10.5px", cursor: "pointer" }}
                                  >
                                    Print
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setToastMsg(`🔄 Re-opened order ${h.id}...`);
                                      setTimeout(() => setToastMsg(""), 3000);
                                    }}
                                    style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10.5px", cursor: "pointer" }}
                                  >
                                    Re-open
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              );
            })()}

            {activeTab === "menu" && false && (
              <div className="tab-body-wrapper">
                {toastMsg && (
                  <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span>🚨</span> {toastMsg}
                  </div>
                )}

                {/* Advanced Menu Sub-Tabs */}
                <div style={{ display: "flex", gap: "12px", borderBottom: "2px solid rgba(44,27,13,0.06)", paddingBottom: "12px", marginBottom: "28px" }}>
                  {[
                    { id: "live", label: "📱 Today's Live Menu" },
                    { id: "catalog", label: "📋 Add / Manage Products" },
                    { id: "schedule", label: "📅 Schedule & Slots" },
                    { id: "combos", label: "🌾 Combos & Seasonal" },
                    { id: "addons", label: "➕ Add-ons Catalog" }
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setMenuSubTab(sub.id)}
                      style={{
                        padding: "8px 16px",
                        border: "none",
                        background: menuSubTab === sub.id ? "#2c1b0d" : "transparent",
                        color: menuSubTab === sub.id ? "#ffffff" : "#2c1b0d",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        fontSize: "12.5px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* SUBTAB 1: TODAY'S LIVE MENU */}
                {menuSubTab === "live" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "28px" }}>
                    <div>
                      <h3 className="section-title">Today's Quick Toggles & Overrides</h3>
                      <p style={{ fontSize: "12px", color: "#666", marginTop: "-12px", marginBottom: "20px" }}>Changes made here instantly update the user homepage without editing catalog details.</p>

                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {menuItems.map((m, i) => {
                          // Check if any linked ingredient has low stock
                          const isLowStock = stocks.some(st => m.linkedIngredients?.includes(st.name) && st.level !== "In Stock");
                          return (
                            <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px", display: "flex", gap: "16px", alignItems: "center" }}>
                              <img src={m.image} alt={m.name} style={{ width: "68px", height: "68px", borderRadius: "12px", objectFit: "cover" }} />

                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                  <h4 style={{ fontSize: "14.5px", margin: 0, fontWeight: "bold" }}>
                                    {m.name} {m.isSpecial && <span style={{ fontSize: "10px", background: "rgba(241,196,15,0.2)", color: "#d35400", padding: "2px 6px", borderRadius: "4px", marginLeft: "6px" }}>★ Special</span>}
                                  </h4>
                                  <strong style={{ fontSize: "14.5px" }}>₹{m.price}</strong>
                                </div>
                                <p style={{ fontSize: "11.5px", color: "#777", margin: "0 0 10px" }}>{m.desc}</p>

                                {isLowStock && (
                                  <div style={{ fontSize: "11px", color: "#e74c3c", fontWeight: "bold", background: "rgba(231,76,60,0.08)", padding: "4px 8px", borderRadius: "4px", marginBottom: "10px", display: "inline-block" }}>
                                    ⚠️ linked stock is low! "Hurry, only few left" warning banner active.
                                  </div>
                                )}

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMenuAvailability(i)}
                                    style={{ border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer", background: m.active ? "rgba(39, 174, 96, 0.12)" : "rgba(0,0,0,0.05)", color: m.active ? "#27ae60" : "#777" }}
                                  >
                                    {m.active ? "🟢 Live on App" : "🔴 Hidden from Users"}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuItems(prev => prev.map((item, idx) => idx === i ? { ...item, isSpecial: !item.isSpecial } : item));
                                      setToastMsg(m.isSpecial ? `Removed today's special tag` : `Tagged ${m.name} as today's special!`);
                                      setTimeout(() => setToastMsg(""), 3000);
                                    }}
                                    style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                                  >
                                    {m.isSpecial ? "★ Unmark Special" : "★ Mark Special"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Preview Widget */}
                    <div>
                      <h3 className="section-title">📱 User Screen Live Preview</h3>
                      <div style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1.5px solid #2c1b0d", minHeight: "350px", position: "relative" }}>
                        <div style={{ background: "#2c1b0d", color: "#fff", padding: "10px", textAlign: "center", borderRadius: "10px 10px 0 0", margin: "-24px -24px 20px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "bold" }}>Preview: CHAI HEROES APP</span>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {menuItems.filter(m => m.active).map((m, i) => (
                            <div key={i} style={{ display: "flex", gap: "10px", borderBottom: "1px solid #f2eee9", paddingBottom: "10px" }}>
                              <img src={m.image} alt={m.name} style={{ width: "45px", height: "45px", borderRadius: "8px", objectFit: "cover" }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <strong style={{ fontSize: "12px" }}>{m.name}</strong>
                                  <span style={{ fontSize: "12px", fontWeight: "bold" }}>₹{m.price}</span>
                                </div>
                                <span style={{ fontSize: "10px", color: "#777", display: "block" }}>{m.desc.slice(0, 45)}...</span>
                                {m.isSpecial && <span style={{ fontSize: "8px", background: "#f1c40f", color: "#2c1b0d", padding: "1px 4px", borderRadius: "3px", fontWeight: "bold", display: "inline-block", marginTop: "2px" }}>Today's Special</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 2: BASE CATALOG SETUP */}
                {menuSubTab === "catalog" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    <div>
                      <h3 className="section-title">Base Catalog Configuration</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {menuItems.map((m, i) => (
                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                              <strong style={{ fontSize: "15px" }}>{m.name}</strong>
                              <span style={{ fontSize: "10px", background: "rgba(39, 174, 96, 0.1)", color: "#27ae60", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                {m.approvalStatus}
                              </span>
                            </div>
                            <p style={{ fontSize: "11.5px", color: "#666", margin: "0 0 10px" }}>{m.desc}</p>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", fontSize: "11px", color: "#555", borderTop: "1px solid #f2eee9", paddingTop: "10px", marginBottom: "12px" }}>
                              <span>📂 Cat: <strong>{m.category}</strong></span>
                              <span>⏱️ Prep: <strong>{m.prepTime}</strong></span>
                              <span>🥤 Unit: <strong>{m.unit}</strong></span>
                              <span>🟢 Type: <strong>{m.veg ? "Veg" : "Non-Veg"}</strong></span>
                              <span>📦 Limits: <strong>Min {m.minQty} - Max {m.maxQty}</strong></span>
                              <span>🔗 stock ingredients: <strong>{m.linkedIngredients?.join(", ") || "None"}</strong></span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const name = prompt("Change name of catalog item:", m.name);
                                  const price = prompt("Change price of catalog item:", m.price);
                                  if (name && price) {
                                    setMenuItems(prev => prev.map((item, idx) => idx === i ? { ...item, name, price: parseFloat(price) || item.price } : item));
                                    setToastMsg(`Updated "${name}" catalog details!`);
                                    setTimeout(() => setToastMsg(""), 3000);
                                  }
                                }}
                                style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                              >
                                Edit Catalog details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Item form */}
                    <div>
                      <h3 className="section-title">Create & Register Item</h3>
                      <form onSubmit={handleAddNewMenuItem} style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>

                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Item Name</label>
                          <input type="text" value={newMenuItemName} onChange={(e) => setNewMenuItemName(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>

                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Price (INR)</label>
                          <input type="number" value={newMenuItemPrice} onChange={(e) => setNewMenuItemPrice(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Category</label>
                            <select value={newMenuCategory} onChange={(e) => setNewMenuCategory(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                              <option value="Chai">Chai</option>
                              <option value="Coffee">Coffee</option>
                              <option value="Namkeen">Namkeen</option>
                              <option value="Biscuits">Biscuits</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Serving Unit</label>
                            <select value={newMenuUnit} onChange={(e) => setNewMenuUnit(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                              <option value="Cup">Cup</option>
                              <option value="Kulhad">Kulhad</option>
                              <option value="Pack">Pack</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Prep Time (batch)</label>
                            <input type="text" value={newMenuPrepTime} onChange={(e) => setNewMenuPrepTime(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                          </div>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Veg / Non-Veg</label>
                            <select value={newMenuVeg ? "veg" : "nonveg"} onChange={(e) => setNewMenuVeg(e.target.value === "veg")} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                              <option value="veg">🟢 Veg</option>
                              <option value="nonveg">🔴 Non-Veg</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Min Order Qty</label>
                            <input type="number" value={newMenuMinQty} onChange={(e) => setNewMenuMinQty(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                          </div>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Max Order Qty</label>
                            <input type="number" value={newMenuMaxQty} onChange={(e) => setNewMenuMaxQty(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Image URL</label>
                          <input type="text" value={newMenuItemImg} onChange={(e) => setNewMenuItemImg(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Description</label>
                          <textarea rows="2" value={newMenuItemDesc} onChange={(e) => setNewMenuItemDesc(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px", resize: "none" }} />
                        </div>

                        <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                          SEND REGISTER ITEM REQUEST
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* SUBTAB 3: SCHEDULES & SLOTS */}
                {menuSubTab === "schedule" && (
                  <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                    <h3 className="section-title" style={{ marginTop: 0 }}>Recurring Weekly Availability & Time Slots</h3>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {menuItems.map((m, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f2eee9", paddingBottom: "12px" }}>
                          <div>
                            <strong>{m.name}</strong>
                            <span style={{ display: "block", fontSize: "11px", color: "#888" }}>Current Time-slot: <strong>{m.timeSlot || "All Day"}</strong></span>
                          </div>

                          {/* Day selection badges */}
                          <div style={{ display: "flex", gap: "6px" }}>
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => {
                              const active = m.scheduleDays?.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const nextDays = active
                                      ? m.scheduleDays.filter(d => d !== day)
                                      : [...(m.scheduleDays || []), day];
                                    setMenuItems(prev => prev.map((item, i) => i === idx ? { ...item, scheduleDays: nextDays } : item));
                                  }}
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "10.5px",
                                    border: "none",
                                    borderRadius: "4px",
                                    background: active ? "rgba(44,27,13,0.12)" : "rgba(0,0,0,0.04)",
                                    color: active ? "#2c1b0d" : "#777",
                                    fontWeight: "bold",
                                    cursor: "pointer"
                                  }}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>

                          {/* Time slot change selector */}
                          <select
                            value={m.timeSlot || "All Day"}
                            onChange={(e) => {
                              const slot = e.target.value;
                              setMenuItems(prev => prev.map((item, i) => i === idx ? { ...item, timeSlot: slot } : item));
                            }}
                            style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "11.5px" }}
                          >
                            <option value="All Day">☀️ All Day</option>
                            <option value="Morning Only">🌅 Morning Only</option>
                            <option value="Evening Only">🌇 Evening Only</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUBTAB 4: COMBOS & SEASONAL SETUP */}
                {menuSubTab === "combos" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    <div>
                      <h3 className="section-title">Active Combos & Pairings</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
                        {combos.map((c, i) => (
                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <strong style={{ fontSize: "14px", color: "#2c1b0d" }}>{c.name}</strong>
                              <strong style={{ fontSize: "14px", color: "#8a583c" }}>₹{c.price}</strong>
                            </div>
                            <span style={{ fontSize: "11.5px", color: "#666", display: "block", marginBottom: "10px" }}>📦 Combo items: {c.items}</span>
                            <p style={{ fontSize: "11px", color: "#888", margin: "0 0 10px", fontStyle: "italic" }}>{c.desc}</p>

                            <button
                              type="button"
                              onClick={() => {
                                setCombos(prev => prev.map((cb, idx) => idx === i ? { ...cb, active: !cb.active } : cb));
                              }}
                              style={{ border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10.5px", fontWeight: "bold", cursor: "pointer", background: c.active ? "rgba(39, 174, 96, 0.1)" : "#f0f0f0", color: c.active ? "#27ae60" : "#777" }}
                            >
                              {c.active ? "Active" : "Paused"}
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Auto-suggest rules */}
                      <h3 className="section-title">💡 Auto-Suggest Pairings Rules</h3>
                      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                        <div style={{ fontSize: "12px", borderBottom: "1px solid #f2eee9", paddingBottom: "8px", marginBottom: "8px" }}>
                          <span>When user selects <strong>Classic Masala Chai</strong> ➔ Auto suggest: <strong>Almond Cookies</strong></span>
                        </div>
                        <div style={{ fontSize: "12px", borderBottom: "1px solid #f2eee9", paddingBottom: "8px", marginBottom: "8px" }}>
                          <span>When user selects <strong>Saffron Royal Chai</strong> ➔ Auto suggest: <strong>Saffron Biscuits</strong></span>
                        </div>
                        <div style={{ fontSize: "12px" }}>
                          <span>When user selects <strong>Kashmiri Kahwa</strong> ➔ Auto suggest: <strong>Almond Slivers Add-on</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* New Combo builder Form */}
                    <div>
                      <h3 className="section-title">Create Custom Combo</h3>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const name = e.target.comboName.value;
                          const price = e.target.comboPrice.value;
                          const baseItems = e.target.comboItems.value;
                          if (!name || !price || !baseItems) return;

                          // Append selected addons
                          let finalItems = baseItems;
                          if (selectedComboAddons.length > 0) {
                            finalItems += " + " + selectedComboAddons.join(" + ");
                          }

                          setCombos(prev => [...prev, { name, price: parseFloat(price), items: finalItems, active: true, desc: "Special package rate." }]);
                          e.target.reset();
                          setSelectedComboAddons([]);
                          setToastMsg("🌱 Successfully published new combo!");
                          setTimeout(() => setToastMsg(""), 3500);
                        }}
                        style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}
                      >
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Combo Name</label>
                          <input name="comboName" type="text" placeholder="e.g. Snack Combo" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Combo Price (INR)</label>
                          <input name="comboPrice" type="number" placeholder="e.g. 199" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Included Base Items</label>
                          <input name="comboItems" type="text" placeholder="e.g. Ginger Chai + Biscuits" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>

                        {/* Add-ons Selector */}
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555", display: "block", marginBottom: "6px" }}>Select Bundle Add-ons</label>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {addonsList.map((ad, idx) => {
                              const checked = selectedComboAddons.includes(ad.name);
                              return (
                                <label key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      if (checked) {
                                        setSelectedComboAddons(prev => prev.filter(n => n !== ad.name));
                                      } else {
                                        setSelectedComboAddons(prev => [...prev, ad.name]);
                                      }
                                    }}
                                  />
                                  <span>{ad.name} (+₹{ad.price})</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                          CREATE & REGISTER COMBO
                        </button>
                      </form>

                      {/* Seasonal / Festive settings */}
                      <h3 className="section-title">🍂 Seasonal Menu Settings</h3>
                      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                        <span style={{ fontSize: "11px", color: "#8a583c", fontWeight: "bold", display: "block", marginBottom: "10px" }}>WINTER LIMITED EDITION</span>
                        <div style={{ fontSize: "11.5px", color: "#555" }}>
                          <p>Item: <strong>Kesar Chai Special</strong></p>
                          <p>Active period: <strong>Nov 15 - Feb 15</strong></p>
                          <span style={{ fontSize: "10px", color: "#27ae60", background: "rgba(39,174,96,0.1)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>● Auto-Schedule Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 5: ADD-ONS CATALOG */}
                {menuSubTab === "addons" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    <div>
                      <h3 className="section-title">Add-ons Catalog Setup</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {addonsList.map((ad, i) => (
                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "18px", display: "flex", gap: "16px", alignItems: "center" }}>
                            <img src={ad.image || "/chai-ingredients.png"} alt={ad.name} style={{ width: "50px", height: "50px", borderRadius: "8px", objectFit: "cover" }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong style={{ fontSize: "13.5px" }}>{ad.name}</strong>
                                <strong style={{ fontSize: "13.5px", color: "#2c1b0d" }}>₹{ad.price}</strong>
                              </div>
                              <p style={{ fontSize: "11px", color: "#777", margin: "4px 0 8px" }}>{ad.desc}</p>

                              <button
                                type="button"
                                onClick={() => {
                                  setAddonsList(prev => prev.map((item, idx) => idx === i ? { ...item, active: !item.active } : item));
                                }}
                                style={{ border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer", background: ad.active ? "rgba(39, 174, 96, 0.1)" : "#f0f0f0", color: ad.active ? "#27ae60" : "#777" }}
                              >
                                {ad.active ? "🟢 Available" : "🔴 Paused"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add new addon Form */}
                    <div>
                      <h3 className="section-title">Create Custom Add-on</h3>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newAddonName || !newAddonPrice) return;
                          const newAdd = {
                            name: newAddonName,
                            price: parseFloat(newAddonPrice) || 0,
                            desc: newAddonDesc || "Fresh add-on suggestion.",
                            image: newAddonImg || "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
                            active: true
                          };
                          setAddonsList(prev => [...prev, newAdd]);
                          setNewAddonName("");
                          setNewAddonPrice("");
                          setNewAddonDesc("");
                          setNewAddonImg("");
                          setToastMsg(`🌱 Added add-on "${newAddonName}" successfully!`);
                          setTimeout(() => setToastMsg(""), 3000);
                        }}
                        style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}
                      >
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Add-on Name</label>
                          <input type="text" value={newAddonName} onChange={(e) => setNewAddonName(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Add-on Price (INR)</label>
                          <input type="number" value={newAddonPrice} onChange={(e) => setNewAddonPrice(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Image Link URL</label>
                          <input type="text" value={newAddonImg} onChange={(e) => setNewAddonImg(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Short Description</label>
                          <textarea rows="2" value={newAddonDesc} onChange={(e) => setNewAddonDesc(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px", resize: "none" }} />
                        </div>
                        <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                          PUBLISH ADD-ON
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "create_product" && (
              <div className="tab-body-wrapper">
                {toastMsg && (
                  <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span>🚨</span> {toastMsg}
                  </div>
                )}




                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                  
                  {/* Left Column: Products List */}
                  <div>
                    <h3 className="section-title">Active Shop Products ({productsList.length})</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {productsList.map((p) => (
                        <div key={p.id} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px", display: "flex", gap: "16px", borderRadius: "16px" }}>
                          <img src={p.image} alt={p.name} style={{ width: "90px", height: "90px", borderRadius: "12px", objectFit: "cover" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <strong style={{ fontSize: "16px", color: "#2c1b0d" }}>{p.name}</strong>
                              <span style={{ fontSize: "13px", fontWeight: "bold", color: "#8a583c" }}>{p.price}</span>
                            </div>
                            <span style={{ fontSize: "11px", color: "#666", background: "#f5ece1", padding: "2px 8px", borderRadius: "4px", display: "inline-block", margin: "4px 0" }}>{p.category}</span>
                            <p style={{ fontSize: "12px", color: "#555", margin: "6px 0" }}>{p.desc}</p>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", fontSize: "11px", color: "#777", marginTop: "8px" }}>
                              <span>☕ Caffeine: <strong>{p.caffeine || "Medium"}</strong></span>
                              <span>🍬 Sweet: <strong>{p.sweetness || "Medium"}</strong></span>
                              <span>⏱️ Steep: <strong>{p.steepTime || "5 mins"}</strong></span>
                              <span>🍪 Pair: <strong>{p.pairing || "Cookies"}</strong></span>
                              <span>★ Rating: <strong>{p.rating || 5}</strong></span>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              style={{ background: "#e74c3c", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {productsList.length === 0 && (
                        <div style={{ textAlign: "center", padding: "40px", background: "#fff", borderRadius: "16px", color: "#888", border: "1px dashed #ccc" }}>
                          No products found in the database. Add your first product on the right!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Add Product Form */}
                  <div>
                    <h3 className="section-title">Create & Register Product</h3>
                    <form onSubmit={handleAddNewProduct} style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      
                      <div className="form-group" style={{ marginBottom: "12px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Product Name</label>
                        <input type="text" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                      </div>

                      <div className="form-group" style={{ marginBottom: "12px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Price (INR)</label>
                        <input type="number" value={newProdPrice} onChange={(e) => setNewProdPrice(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                      </div>

                      <div className="form-group" style={{ marginBottom: "12px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Category</label>
                        <select value={newProdCategory} onChange={(e) => setNewProdCategory(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                          <option value="Masala">Masala</option>
                          <option value="Cardamom">Cardamom</option>
                          <option value="Ginger">Ginger</option>
                          <option value="Saffron">Saffron</option>
                          <option value="Organic Greens">Organic Greens</option>
                          <option value="Herbal Infusions">Herbal Infusions</option>
                        </select>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                        <div className="form-group">
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Caffeine</label>
                          <select value={newProdCaffeine} onChange={(e) => setNewProdCaffeine(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                            <option value="None">None</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Sweetness</label>
                          <select value={newProdSweetness} onChange={(e) => setNewProdSweetness(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                            <option value="None">None</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                        <div className="form-group">
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Steep Time</label>
                          <select value={newProdSteepTime} onChange={(e) => setNewProdSteepTime(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                            <option value="3 mins">3 mins</option>
                            <option value="4 mins">4 mins</option>
                            <option value="5 mins">5 mins</option>
                            <option value="6 mins">6 mins</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Pairing</label>
                          <input type="text" placeholder="e.g. Biscuits" value={newProdPairing} onChange={(e) => setNewProdPairing(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                        <div className="form-group">
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Rating</label>
                          <input type="number" step="0.1" min="1" max="5" value={newProdRating} onChange={(e) => setNewProdRating(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", flexDirection: "column" }}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Upload Product Image</label>
                              <input type="file" accept="image/*" onChange={(e) => handleUploadImage(e)} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12px" }} />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowImageLibrary(true);
                                window.libraryTarget = "new";
                              }}
                              style={{ background: "#8a583c", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", height: "35px" }}
                            >
                              📂 Image Library
                            </button>
                          </div>
                          <div>
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Or Image URL</label>
                            <input type="text" placeholder="https://..." value={newProdImage} onChange={(e) => setNewProdImage(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555", display: "block", marginBottom: "6px" }}>Select from Premium Gallery</label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                          {[
                            { name: "Masala Chai", url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80" },
                            { name: "Ginger Chai", url: "https://images.unsplash.com/photo-1594631252845-29fc4586d56c?auto=format&fit=crop&w=600&q=80" },
                            { name: "Saffron Royal", url: "https://images.unsplash.com/photo-1563887589-6601ea06285b?auto=format&fit=crop&w=600&q=80" },
                            { name: "Filter Coffee", url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80" },
                            { name: "Green Tea", url: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=600&q=80" },
                            { name: "Iced Brew", url: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80" }
                          ].map((img, idx) => (
                            <div
                              key={idx}
                              onClick={() => setNewProdImage(img.url)}
                              style={{
                                cursor: "pointer",
                                border: newProdImage === img.url ? "2px solid #8a583c" : "2px solid transparent",
                                borderRadius: "8px",
                                overflow: "hidden",
                                height: "55px",
                                position: "relative"
                              }}
                            >
                              <img src={img.url} alt={img.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "8px", textAlign: "center", padding: "2px 0" }}>
                                {img.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Description</label>
                        <textarea rows="2" value={newProdDesc} onChange={(e) => setNewProdDesc(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px", resize: "none" }} />
                      </div>

                      <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>
                        PUBLISH TO SHOP
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            )}


            {activeTab === "shop" && (
              <div className="tab-body-wrapper">
                {toastMsg && (
                  <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span>🚨</span> {toastMsg}
                  </div>
                )}
                
                {editingProduct && (
                  <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                    <div style={{ background: "#fff", padding: "32px", borderRadius: "20px", width: "450px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.2)", position: "relative" }}>
                      <h3 style={{ margin: "0 0 20px", color: "#2c1b0d" }}>Edit Product</h3>
                      <form onSubmit={handleUpdateProductSubmit}>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Product Name</label>
                          <input type="text" value={editProdName} onChange={(e) => setEditProdName(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Price (INR)</label>
                          <input type="number" value={editProdPrice} onChange={(e) => setEditProdPrice(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Category</label>
                          <select value={editProdCategory} onChange={(e) => setEditProdCategory(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}>
                            <option value="Masala">Masala</option>
                            <option value="Cardamom">Cardamom</option>
                            <option value="Ginger">Ginger</option>
                            <option value="Saffron">Saffron</option>
                            <option value="Organic Greens">Organic Greens</option>
                            <option value="Herbal Infusions">Herbal Infusions</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Description</label>
                          <textarea rows="2" value={editProdDesc} onChange={(e) => setEditProdDesc(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px", resize: "none" }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: "20px", display: "flex", gap: "10px", flexDirection: "column" }}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Upload Product Image</label>
                              <input type="file" accept="image/*" onChange={(e) => handleUploadImage(e, "edit")} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12px" }} />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowImageLibrary(true);
                                window.libraryTarget = "edit";
                              }}
                              style={{ background: "#8a583c", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", height: "35px" }}
                            >
                              📂 Image Library
                            </button>
                          </div>
                          <div>
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Or Image URL</label>
                            <input type="text" value={editProdImage} onChange={(e) => setEditProdImage(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                          <button type="button" onClick={() => setEditingProduct(null)} style={{ background: "#ccc", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12.5px", cursor: "pointer", color: "#333" }}>Cancel</button>
                          <button type="submit" style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12.5px", cursor: "pointer", fontWeight: "bold" }}>Save Changes</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                <h3 className="section-title">Store Products Catalog ({productsList.length})</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "24px", paddingBottom: "40px" }}>
                  {productsList.map((p) => (
                    <div key={p.id} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px", display: "flex", flexDirection: "column", borderRadius: "16px", height: "100%", border: "1px solid rgba(44,27,13,0.04)" }}>
                      <img src={p.image} alt={p.name} style={{ width: "100%", height: "180px", borderRadius: "12px", objectFit: "cover", marginBottom: "12px" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <strong style={{ fontSize: "16px", color: "#2c1b0d" }}>{p.name}</strong>
                          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#8a583c" }}>{p.price}</span>
                        </div>
                        <span style={{ fontSize: "11px", color: "#666", background: "#f5ece1", padding: "2px 8px", borderRadius: "4px", display: "inline-block", margin: "6px 0" }}>{p.category}</span>
                        <p style={{ fontSize: "12.5px", color: "#555", margin: "6px 0 12px" }}>{p.desc}</p>
                      </div>
                      <div style={{ display: "flex", gap: "10px", borderTop: "1px solid #f2eee9", paddingTop: "12px", marginTop: "12px" }}>
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setEditProdName(p.name);
                            setEditProdPrice(p.priceNum || parseFloat(p.price.replace("₹", "")) || 0);
                            setEditProdCategory(p.category || "Masala");
                            setEditProdDesc(p.desc || "");
                            setEditProdImage(p.image || "");
                          }}
                          style={{ flex: 1, background: "#2c1b0d", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          style={{ flex: 1, background: "#e74c3c", color: "#fff", border: "none", padding: "10px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {productsList.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", background: "#fff", borderRadius: "16px", color: "#888", border: "1px dashed #ccc" }}>
                      No products found. Use "Create Product" to add some!
                    </div>
                  )}
                </div>
              </div>
            )}

                      {activeTab === "addons" && (
            <div className="tab-fade-in" style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <div>
                  <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#2c1b0d", margin: "0 0 8px" }}>Add-on Products</h1>
                  <p style={{ color: "#777", margin: 0, fontSize: "15px" }}>Manage cookies, toasts, and extra products to be shown at checkout.</p>
                </div>
              </div>

              {/* Add New Addon */}
              <div className="dashboard-card" style={{ padding: "30px", marginBottom: "40px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#2c1b0d", marginBottom: "20px" }}>Add New Add-on</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                  <div className="form-group">
                    <label>Add-on Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Almond Cookies" 
                      value={newAddonName}
                      onChange={(e) => setNewAddonName(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Price (e.g. ₹89)</label>
                    <input 
                      type="text" 
                      placeholder="₹89" 
                      value={newAddonPrice}
                      onChange={(e) => setNewAddonPrice(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                  <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label>Image (Upload or URL)</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewAddonImg(reader.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="admin-input"
                      style={{ padding: "6px" }}
                    />
                    <div style={{ textAlign: "center", fontSize: "11px", color: "#888", fontWeight: "bold" }}>— OR PASTE URL —</div>
                    <input 
                      type="text" 
                      placeholder="https://..." 
                      value={newAddonImg.startsWith("data:image") ? "" : newAddonImg}
                      onChange={(e) => setNewAddonImg(e.target.value)}
                      className="admin-input"
                    />
                    {newAddonImg && newAddonImg.startsWith("data:image") && (
                      <div style={{ fontSize: "11px", color: "#27ae60", fontWeight: "bold", marginTop: "-4px" }}>✓ Image file loaded ready to upload</div>
                    )}
                  </div>
                </div>
                <button 
                  className="btn-primary" 
                  style={{ marginTop: "20px", width: "100%", padding: "12px" }}
                  onClick={async () => {
                    if (!newAddonName || !newAddonPrice) return alert("Fill required fields");
                    try {
                      await addAddon({ name: newAddonName, price: newAddonPrice, image: newAddonImg || "/chai-ingredients.png" });
                      alert("Add-on created successfully!");
                      setNewAddonName(""); setNewAddonPrice(""); setNewAddonImg("");
                      // Refresh
                      getAddons().then(setAddonsList);
                    } catch(e) {
                      console.error(e);
                      alert("Error adding addon");
                    }
                  }}
                >
                  + Create Add-on
                </button>
              </div>

              {/* Existing Addons Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
                {addonsList && addonsList.length > 0 ? addonsList.map((addon) => (
                  <div key={addon.id} className="dashboard-card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ height: "140px", background: "#f5f5f7" }}>
                      <img src={addon.image} alt={addon.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ padding: "20px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 8px" }}>{addon.name}</h3>
                      <p style={{ color: "#8a583c", fontWeight: 700, margin: "0 0 16px" }}>{addon.price}</p>
                      
                      <button 
                        style={{ marginTop: "auto", background: "#fcfaf7", border: "1px solid #e74c3c", color: "#e74c3c", padding: "8px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
                        onClick={async () => {
                          if(confirm("Are you sure you want to delete this addon?")) {
                            await deleteAddon(addon.id);
                            getAddons().then(setAddonsList);
                          }
                        }}
                      >
                        Delete Add-on
                      </button>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: "40px", textAlign: "center", color: "#777", background: "#fff", borderRadius: "16px" }}>
                    No add-on products found.
                  </div>
                )}
              </div>
            </div>
          )}

            {/* Feedback Tab */}
            {activeTab === "feedback" && (
              <div className="tab-fade-in" style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                  <div>
                    <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#2c1b0d", margin: "0 0 8px" }}>Pending Feedback</h1>
                    <p style={{ color: "#777", margin: 0 }}>Review user ratings and feedback before making them public on the product pages.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setLoadingFeedback(true);
                      getPendingFeedback().then(data => { setPendingFeedback(data); setLoadingFeedback(false); });
                    }}
                    className="btn-primary" 
                    style={{ padding: "8px 16px", background: "#f5f5f7", color: "#2c1b0d", border: "1px solid #ddd" }}
                  >
                    Refresh
                  </button>
                </div>

                {loadingFeedback ? (
                  <p>Loading pending feedback...</p>
                ) : pendingFeedback.length === 0 ? (
                  <div className="dashboard-card" style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ fontSize: "16px", color: "#666" }}>You're all caught up! No pending feedback.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {pendingFeedback.map(fb => (
                      <div key={fb.id} className="dashboard-card" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                            <strong style={{ fontSize: "16px", color: "#2c1b0d" }}>{fb.customer || fb.userName}</strong>
                            <span style={{ fontSize: "13px", background: "#f5f5f7", padding: "4px 8px", borderRadius: "999px" }}>
                              Product: <strong>{fb.productName}</strong>
                            </span>
                          </div>
                          <div style={{ color: "#f1c40f", fontSize: "16px", marginBottom: "12px" }}>
                            {"★".repeat(fb.rating || 5)}{"☆".repeat(5 - (fb.rating || 5))}
                          </div>
                          {(fb.text || fb.comment) && <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.6, margin: 0 }}>"{fb.text || fb.comment}"</p>}
                          <div style={{ fontSize: "12px", color: "#999", marginTop: "12px" }}>
                            Submitted on: {new Date(fb.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button 
                            onClick={() => handleApproveFeedback(fb.id)}
                            style={{ background: "#5c7a4d", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleDeleteFeedback(fb.id)}
                            style={{ background: "#e74c3c", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "contact" && (() => {


              return (
                <div className="tab-fade-in" style={{ padding: "30px", maxWidth: "800px", margin: "0 auto" }}>
                  <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#2c1b0d", margin: "0 0 20px" }}>Footer Settings</h1>
                  <p style={{ color: "#777", marginBottom: "30px" }}>Update the branding and contact details shown in the website footer.</p>
                  
                  <div className="dashboard-card" style={{ padding: "30px", background: "#fff", borderRadius: "16px" }}>
                    
                    <h3 style={{ fontSize: "16px", marginBottom: "16px" }}>Brand Details</h3>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Brand Name</label>
                      <input 
                        type="text" 
                        value={localContact.brandName || ""} 
                        onChange={(e) => setLocalContact({...localContact, brandName: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "24px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Brand Description</label>
                      <textarea 
                        rows="3"
                        value={localContact.brandDesc || ""} 
                        onChange={(e) => setLocalContact({...localContact, brandDesc: e.target.value})} 
                        className="admin-input" 
                        style={{ resize: "none" }}
                      />
                    </div>

                    <h3 style={{ fontSize: "16px", marginBottom: "16px", marginTop: "32px", borderTop: "1px solid #eee", paddingTop: "24px" }}>Contact Details</h3>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Address Line 1</label>
                      <input 
                        type="text" 
                        value={localContact.address1 || ""} 
                        onChange={(e) => setLocalContact({...localContact, address1: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Address Line 2 (City, Zip)</label>
                      <input 
                        type="text" 
                        value={localContact.address2 || ""} 
                        onChange={(e) => setLocalContact({...localContact, address2: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Phone Number</label>
                      <input 
                        type="text" 
                        value={localContact.phone || ""} 
                        onChange={(e) => setLocalContact({...localContact, phone: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: "24px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>Email Address</label>
                      <input 
                        type="text" 
                        value={localContact.email || ""} 
                        onChange={(e) => setLocalContact({...localContact, email: e.target.value})} 
                        className="admin-input" 
                      />
                    </div>
                    
                    <button 
                      onClick={async () => {
                        setSavingContact(true);
                        try {
                          await updateContactInfo(localContact);
                          alert("Contact info updated successfully! (Refresh the page to see changes in the footer)");
                        } catch(e) {
                          alert("Error updating contact info");
                        }
                        setSavingContact(false);
                      }}
                      disabled={savingContact}
                      className="btn-primary" 
                      style={{ padding: "12px 24px", width: "100%", fontSize: "14px" }}
                    >
                      {savingContact ? "Saving..." : "Save Footer Settings"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {activeTab === "subs" && (() => {
              const activeSubs = subscriptions;

              return (
                <div className="tab-body-wrapper">
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>

                    {/* Left Panel: Active Subscriptions */}
                    <div>
                      <h3 className="section-title">Corporate Subscriptions Ledger</h3>
                      <p style={{ fontSize: "12px", color: "#666", marginTop: "-12px", marginBottom: "20px" }}>Active recurring beverage plans mapped to office locations.</p>

                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {activeSubs.map((sub, i) => (
                          <div key={i} className="queue-card-detailed-item" style={{ 
                            background: "#ffffff", 
                            padding: "20px", 
                            borderLeft: sub.status !== "Active" ? "4px solid #777" :
                                       (!sub.endDate && !sub.expiryDate) ? "4px solid #27ae60" :
                                       (Math.ceil((new Date(sub.endDate || sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) < 0) ? "4px solid #e74c3c" :
                                       (Math.ceil((new Date(sub.endDate || sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) <= 3) ? "4px solid #f39c12" : "4px solid #27ae60"
                          }}>

                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid rgba(0,0,0,0.03)", paddingBottom: "6px" }}>
                              <span style={{ fontSize: "11px", fontWeight: "bold", color: "#8a583c" }}>{sub.id}</span>
                              <span style={{ fontSize: "11px", color: "#666" }}>
                                Started: {sub.startDate} | 
                                <strong style={{ 
                                  color: !sub.endDate && !sub.expiryDate ? "#27ae60" : 
                                         (Math.ceil((new Date(sub.endDate || sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) < 0) ? "#e74c3c" : 
                                         (Math.ceil((new Date(sub.endDate || sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) <= 3) ? "#f39c12" : "#27ae60",
                                  marginLeft: "4px"
                                }}>
                                  {!sub.endDate && !sub.expiryDate ? "No Expiry Limit" : 
                                   (Math.ceil((new Date(sub.endDate || sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) < 0) ? `Expired (On ${sub.endDate || sub.expiryDate})` : 
                                   `Expires: ${sub.endDate || sub.expiryDate} (${Math.ceil((new Date(sub.endDate || sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days left)`}
                                </strong>
                              </span>
                            </div>

                            {sub.endDate || sub.expiryDate ? (
                              (() => {
                                const diffDays = Math.ceil((new Date(sub.endDate || sub.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                                if (diffDays < 0) {
                                  return (
                                    <div style={{ background: "#fce8e6", color: "#e74c3c", padding: "8px 12px", borderRadius: "8px", fontSize: "11.5px", fontWeight: "bold", marginBottom: "12px", border: "1px solid rgba(231, 76, 60, 0.2)" }}>
                                      🚨 Plan Expired! Stop the service immediately.
                                    </div>
                                  );
                                } else if (diffDays <= 3) {
                                  return (
                                    <div style={{ background: "#fef5e7", color: "#f39c12", padding: "8px 12px", borderRadius: "8px", fontSize: "11.5px", fontWeight: "bold", marginBottom: "12px", border: "1px solid rgba(243, 156, 18, 0.2)" }}>
                                      ⚠️ Expiry Warning: Expiring in {diffDays} days! Stop service soon.
                                    </div>
                                  );
                                }
                                return null;
                              })()
                            ) : null}

                            <div style={{ marginBottom: "12px" }}>
                              <span style={{ fontSize: "14.5px", fontWeight: "bold", display: "block" }}>👤 {sub.customer}</span>
                              <span style={{ fontSize: "12px", color: "#555", display: "block", margin: "4px 0" }}>🏢 Delivery Address: {sub.office || sub.address || "General Office Area"}</span>
                              <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#2c1b0d", display: "block" }}>☕ Beverages: {sub.items}</span>
                              <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#8a583c", display: "block", marginTop: "4px" }}>💰 Price: {sub.price || "₹1,200/month"}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "11.5px", color: "#666" }}>
                                ⏰ {sub.timeSlot} ({sub.schedule})
                              </span>

                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  type="button"
                                  onClick={() => toggleSubscriptionStatus(sub)}
                                  style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                                >
                                  {sub.status === "Active" ? "Pause Plan" : "Resume Plan"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => forceDispatchSubscription(sub)}
                                  style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                                >
                                  Force Dispatch
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Panel: Today's Subscription Orders checklist */}
                    <div>
                      <h3 className="section-title">Today's Subscription Schedule</h3>
                      <p style={{ fontSize: "12px", color: "#666", marginTop: "-12px", marginBottom: "20px" }}>Live queue of active subscription deliveries for today.</p>

                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {activeSubs.filter(sub => sub.status === "Active").map((sub, i) => (
                          <div key={i} style={{ background: "#ffffff", padding: "16px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong style={{ fontSize: "13px", display: "block" }}>{sub.customer}</strong>
                              <span style={{ fontSize: "11.5px", color: "#555", display: "block" }}>🏢 Room: {sub.office ? (sub.office.includes(",") ? sub.office.split(",")[1].trim() : sub.office) : "General Office Area"}</span>
                              <span style={{ fontSize: "12px", color: "#8a583c", fontWeight: "bold" }}>{sub.items}</span>
                              <span style={{ display: "block", fontSize: "11px", color: "#888" }}>Deliver at: {sub.timeSlot}</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.target.disabled = true;
                                e.target.innerText = "✓ Dispatched";
                                e.target.style.background = "rgba(39, 174, 96, 0.12)";
                                e.target.style.color = "#27ae60";
                                setToastMsg(`Marked subscription order for ${sub.customer} as delivered.`);
                                setTimeout(() => setToastMsg(""), 3000);
                              }}
                              style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                            >
                              Dispatch
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}



            {activeTab === "leave" && (
              <div className="tab-body-wrapper">
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "28px" }}>

                  {/* Left Column: Apply Leave Form */}
                  <div>
                    <h3 className="section-title">Leave Request Hub</h3>

                    {/* Leave Requests Log for Admin */}
                    <h3 className="section-title">Manage Leave Requests</h3>
                    <div style={{ background: "#ffffff", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#fbf9f6", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "#666" }}>
                            <th style={{ padding: "12px 16px" }}>Leave Dates</th>
                            <th style={{ padding: "12px 16px" }}>Reason</th>
                            <th style={{ padding: "12px 16px", textAlign: "right" }}>Status Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaveRequests.map((req, i) => (
                            <tr key={req.id || i} style={{ borderBottom: i === leaveRequests.length - 1 ? "none" : "1px solid rgba(0,0,0,0.04)" }}>
                              <td style={{ padding: "12px 16px" }}>{req.start} to {req.end}</td>
                              <td style={{ padding: "12px 16px", color: "#555" }}>{req.reason}</td>
                              <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                {req.status === "Pending Approval" || !req.status ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
                                    <input 
                                      type="text" 
                                      placeholder="Admin Note (Optional)" 
                                      value={adminLeaveReasons[req.id] || ""} 
                                      onChange={(e) => setAdminLeaveReasons({ ...adminLeaveReasons, [req.id]: e.target.value })}
                                      style={{ padding: "6px", fontSize: "11px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", width: "150px" }}
                                    />
                                    <div style={{ display: "flex", gap: "6px" }}>
                                      <button onClick={() => updateLeaveRequest(req.id, { status: "Approved", adminReason: adminLeaveReasons[req.id] || "" })} style={{ background: "rgba(39,174,96,0.1)", color: "#27ae60", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}>Approve</button>
                                      <button onClick={() => updateLeaveRequest(req.id, { status: "Rejected", adminReason: adminLeaveReasons[req.id] || "" })} style={{ background: "rgba(231,76,60,0.1)", color: "#e74c3c", border: "none", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", cursor: "pointer" }}>Reject</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                                    <span style={{
                                      fontSize: "9.5px",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      fontWeight: "bold",
                                      background: req.status === "Approved" ? "rgba(39,174,96,0.1)" : "rgba(231,76,60,0.1)",
                                      color: req.status === "Approved" ? "#27ae60" : "#e74c3c"
                                    }}>
                                      {req.status}
                                    </span>
                                    {req.adminReason && <span style={{ fontSize: "10px", color: "#666" }}>Note: {req.adminReason}</span>}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Shift Config */}
                  <div>
                    <h3 className="section-title">Shift Timing & Operations</h3>
                    <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Daily Operations Window</label>
                        <input
                          type="text"
                          value={workingHours}
                          onChange={(e) => setWorkingHours(e.target.value)}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px" }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await updateProfileSettings({ workingHours });
                          setToastMsg("🌱 Successfully saved shift timings!");
                          setTimeout(() => setToastMsg(""), 3000);
                        }}
                        style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "11.5px", cursor: "pointer" }}
                      >
                        Save Configuration
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="tab-body-wrapper">
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>

                  {/* Left Column: Brewmaster Profile Details */}
                  <div>
                    <h3 className="section-title">Brewmaster Identity Profile</h3>

                    <div style={{ background: "#ffffff", padding: "28px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "24px", display: "flex", gap: "20px", alignItems: "center" }}>
                      <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#2c1b0d", color: "#fdf5e9", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "36px", fontWeight: "bold" }}>
                        👨‍🍳
                      </div>
                      <div>
                        <h4 style={{ fontSize: "18px", margin: "0 0 4px", fontWeight: "bold" }}>{brewmasterName}</h4>
                        <span style={{ fontSize: "12px", color: "#8a583c", fontWeight: "bold", textTransform: "uppercase", display: "block" }}>🎖️ Senior Brewmaster</span>
                        <span style={{ fontSize: "11px", color: "#777", display: "block", marginTop: "4px" }}>Station #02 • Corporate Park Hub</span>
                      </div>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await updateProfileSettings({ brewmasterName, brewmasterContact, brewmasterBio });
                        setToastMsg("🌱 Profile details updated successfully!");
                        setTimeout(() => setToastMsg(""), 3000);
                      }}
                      style={{ background: "#ffffff", padding: "28px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.04)" }}
                    >
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Full Name</label>
                        <input
                          type="text"
                          value={brewmasterName}
                          onChange={(e) => setBrewmasterName(e.target.value)}
                          required
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px" }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Contact Number</label>
                        <input
                          type="text"
                          value={brewmasterContact}
                          onChange={(e) => setBrewmasterContact(e.target.value)}
                          required
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px" }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Professional Bio</label>
                        <textarea
                          rows="3"
                          value={brewmasterBio}
                          onChange={(e) => setBrewmasterBio(e.target.value)}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px", resize: "none" }}
                        />
                      </div>

                      <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>
                        SAVE IDENTITY DETAILS
                      </button>
                    </form>

                    {/* Change Password Form */}
                    <form
                      onSubmit={handleUpdatePassword}
                      style={{ background: "#ffffff", padding: "28px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.04)", marginTop: "24px" }}
                    >
                      <h4 style={{ fontSize: "16px", margin: "0 0 16px", fontWeight: "bold" }}>Change Password</h4>
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px" }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          required
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px" }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px" }}
                        />
                      </div>
                      {passwordMessage && (
                        <p style={{ fontSize: "12px", color: passwordMessage.includes("Error") ? "#e74c3c" : "#27ae60", marginBottom: "16px", fontWeight: "bold" }}>
                          {passwordMessage}
                        </p>
                      )}
                      <button type="submit" style={{ width: "100%", background: "#8a583c", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>
                        UPDATE PASSWORD
                      </button>
                    </form>
                  </div>

                  {/* Right Column: Station Configuration & Settings */}
                  <div>
                    <h3 className="section-title">Kitchen Operations Settings</h3>

                    <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "24px" }}>
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Active Station Outlet Name</label>
                        <input
                          type="text"
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px" }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await updateProfileSettings({ shopName });
                          setToastMsg("🌱 Kitchen Station configuration updated!");
                          setTimeout(() => setToastMsg(""), 3000);
                        }}
                        style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "11.5px", cursor: "pointer" }}
                      >
                        Update Station Config
                      </button>
                    </div>

                    {/* Session controls */}
                    <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <h4 style={{ fontSize: "12px", textTransform: "uppercase", margin: "0 0 12px", color: "#e74c3c", fontWeight: "bold" }}>Session & Security</h4>
                      <p style={{ fontSize: "11.5px", color: "#666", marginBottom: "20px" }}>Log out of the active terminal session. All local configurations remain saved on the server database.</p>

                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem("admin_logged");
                          setIsLoggedIn(false);
                        }}
                        style={{ width: "100%", background: "#e74c3c", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "11.5px", cursor: "pointer" }}
                      >
                        🔌 Sign Out from Terminal
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* FIXED RIGHT SIDEBAR (PENDING ORDERS WITH PRODUCT IMAGE & ALL DETAILS) */}
          <aside 
            className="dashboard-right-sidebar"
            style={{
              transform: showPendingSidebar ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.3s ease-in-out",
              zIndex: 9999
            }}
          >
            <div className="right-sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3>📥 Pending Requests</h3>
                <span className="pending-badge-count" style={{ display: "inline-block", marginTop: "4px" }}>{pendingSidebarOrders.length} Queue</span>
              </div>
              <button 
                onClick={() => setShowPendingSidebar(false)}
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  fontSize: "20px", 
                  cursor: "pointer", 
                  color: "#e74c3c", 
                  fontWeight: "bold",
                  padding: "4px 8px"
                }}
              >
                ✕
              </button>
            </div>

            <div className="pending-orders-stack">
              {pendingSidebarOrders.length === 0 ? (
                <div className="empty-sidebar-state">
                  <span className="empty-emoji">🍵</span>
                  <p>All incoming requests have been answered.</p>
                </div>
              ) : (
                pendingSidebarOrders.map((o) => (
                  <div key={o.id} className="right-sidebar-order-card">

                    {/* ID & Date top line */}
                    <div className="sidebar-card-header">
                      <strong className="sidebar-order-id">{o.id}</strong>
                      <span className="sidebar-order-date">{o.date}</span>
                    </div>

                    {/* Main order info with product image layout */}
                    <div className="sidebar-card-body-detailed">
                      <img src={o.img} alt={o.item} className="sidebar-product-img" />

                      <div className="sidebar-product-details">
                        <h4 className="sidebar-product-title">{o.item}</h4>
                        <span className="sidebar-customer-name">👤 {o.customer}</span>
                      </div>
                    </div>

                    {/* Office Number & Customizations moved below image to save height */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", borderTop: "1px dashed rgba(0,0,0,0.05)", paddingTop: "10px" }}>
                      <div className="sidebar-office-badge" style={{ margin: 0, flexShrink: 0, display: "flex", alignItems: "flex-start", gap: "4px" }}>
                        <span style={{ marginTop: "1px" }}>🏢</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {(o.office || "Desk Area").split(',').map((part, i, arr) => (
                            <span key={i}>{part.trim()}{i !== arr.length - 1 ? ',' : ''}</span>
                          ))}
                        </div>
                      </div>

                      <div className="sidebar-extra-details" style={{ display: "flex", flexDirection: "column", gap: "4px", margin: 0, alignItems: "flex-end", textAlign: "right", fontSize: "10.5px" }}>
                        <span>Sugar: {o.sugar}</span>
                        <span>Milk: {o.milk}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="sidebar-card-actions">
                      <button onClick={() => rejectSpecificOrder(o.id)} className="sidebar-action-btn reject">
                        Reject
                      </button>
                      <button onClick={() => acceptSpecificOrder(o.id)} className="sidebar-action-btn accept">
                        Accept
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </aside>

        </div>
      )}

      {/* ALERT POPUP */}
      {incomingOrder && (
        <div className="alert-modal-backdrop">
          <div className="alert-modal-card">
            <div className="flashing-alarm-header">
              🚨 NEW INCOMING DISPATCH ORDER!
            </div>

            <div className="timer-wrapper">
              <svg width="60" height="60" viewBox="0 0 60 60" className="timer-svg">
                <circle cx="30" cy="30" r="26" stroke="rgba(231,76,60,0.15)" strokeWidth="4" fill="none" />
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  stroke="#e74c3c"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray="163"
                  strokeDashoffset={163 - (163 * countdown) / 60}
                />
                <text x="30" y="35" textAnchor="middle" fill="#e74c3c" fontSize="13" fontWeight="bold">
                  {countdown}s
                </text>
              </svg>
            </div>

            <div className="alert-modal-details" style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <img src={incomingOrder.img} alt={incomingOrder.item} className="sidebar-product-img" style={{ width: "50px", height: "50px" }} />
              <div>
                <h3 style={{ fontSize: "16px", color: "#2c1b0d", margin: "0 0 4px" }}>
                  {incomingOrder.item}
                </h3>
                <p style={{ margin: 0, fontSize: "12px" }}>Office: <strong>{incomingOrder.office}</strong></p>
                <p style={{ margin: 0, fontSize: "12px" }}>Total: <strong>{incomingOrder.price}</strong></p>
              </div>
            </div>

            <div className="alert-modal-actions" style={{ marginTop: "20px" }}>
              <button onClick={rejectOrderAlert} className="alert-btn reject">
                REJECT ORDER
              </button>
              <button onClick={acceptOrderAlert} className="alert-btn accept">
                ACCEPT & BREW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMAGE LIBRARY POPUP */}
      {showImageLibrary && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000 }}>
          <div style={{ background: "#fff", padding: "32px", borderRadius: "24px", width: "650px", maxWidth: "90vw", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #f2eee9", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, color: "#2c1b0d" }}>📁 Uploaded Images Library</h3>
              <button 
                onClick={() => setShowImageLibrary(false)}
                style={{ background: "transparent", border: "none", fontSize: "22px", cursor: "pointer", color: "#e74c3c", fontWeight: "bold" }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px" }}>
              {libraryImages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
                  <span style={{ fontSize: "36px" }}>📂</span>
                  <p style={{ marginTop: "12px" }}>No uploaded images found in your library yet.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "16px" }}>
                  {libraryImages.map((img) => (
                    <div 
                      key={img.id}
                      onClick={() => handleSelectLibraryImage(img.url)}
                      style={{ 
                        border: "2px solid rgba(44, 27, 13, 0.08)", 
                        borderRadius: "12px", 
                        overflow: "hidden", 
                        cursor: "pointer", 
                        transition: "all 0.2s ease",
                        background: "#fcfaf7"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#2c1b0d"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(44, 27, 13, 0.08)"}
                    >
                      <img src={img.url} alt={img.name} style={{ width: "100%", height: "100px", objectFit: "cover" }} />
                      <div style={{ padding: "6px", fontSize: "10px", color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                        {img.name || "Image Link"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f2eee9", paddingTop: "12px" }}>
              <button 
                onClick={() => setShowImageLibrary(false)}
                style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", fontSize: "12.5px", cursor: "pointer" }}
              >
                Close Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled JSX */}
      <style>{`
        /* Authentication Screen */
        .login-gate-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 90vh;
          padding: 80px 24px;
        }

        .login-card {
          background: #ffffff;
          border: 1px solid rgba(44, 27, 13, 0.08);
          width: 100%;
          max-width: 420px;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 30px 60px rgba(44, 27, 13, 0.08);
          box-sizing: border-box;
        }

        .brewmaster-badge {
          background: #2c1b0d;
          color: #ffffff;
          font-size: 10px;
          font-weight: 900;
          padding: 4px 10px;
          border-radius: 6px;
          display: inline-block;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .login-card h2 {
          font-size: 22px;
          font-weight: 900;
          color: #2c1b0d;
          margin-bottom: 8px;
        }

        .login-card p {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .login-error-alert {
          background: rgba(231, 76, 60, 0.08);
          color: #e74c3c;
          padding: 10px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 18px;
        }

        .form-group label {
          font-size: 11px;
          font-weight: 700;
          color: #555;
          text-transform: uppercase;
        }

        .login-input {
          background: #fbf9f6;
          border: 1.5px solid rgba(44,27,13,0.1);
          border-radius: 8px;
          padding: 12px;
          color: #2c1b0d;
          outline: none;
          font-size: 14px;
        }

        .login-input:focus {
          border-color: #2c1b0d;
        }

        .btn-authenticate {
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          padding: 14px;
          border-radius: 8px;
          font-weight: 800;
          width: 100%;
          cursor: pointer;
          margin-top: 10px;
          transition: transform 0.2s;
        }

        .btn-authenticate:hover {
          transform: scale(1.02);
        }

        /* 3-Column Layout with Fixed Sidebar */
        .dashboard-wrapper {
          display: flex;
          min-height: 100vh;
        }

        .dashboard-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 200px;
          background: #2c1b0d;
          color: #fdf5e9;
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: 4px 0 30px rgba(0,0,0,0.05);
        }

        .sidebar-logo {
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-text {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
        }

        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
          overflow-y: auto;
          max-height: calc(100vh - 180px);
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .sidebar-menu::-webkit-scrollbar {
          display: none;
        }

        .menu-icon-btn {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #dcd0c0;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
          text-align: left;
        }

        .btn-emoji {
          font-size: 16px;
        }

        .menu-icon-btn:hover, .menu-icon-btn.active {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .sidebar-bottom {
          margin-top: auto;
          width: 100%;
        }

        .menu-icon-btn.logout {
          color: #e74c3c;
        }

        /* Container main */
        .dashboard-container {
          margin-left: 200px;
          margin-right: 420px;
          flex-grow: 1;
          padding: 24px;
          box-sizing: border-box;
          width: calc(100% - 620px);
        }

        /* Fixed Right Sidebar for Pending Queue (Detailed cards style) */
        .dashboard-right-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 420px;
          background: #ffffff;
          border-left: 1px solid rgba(44, 27, 13, 0.08);
          padding: 40px 24px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: -4px 0 30px rgba(0,0,0,0.02);
        }

        .right-sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding-bottom: 16px;
        }

        .right-sidebar-header h3 {
          font-size: 16px;
          font-weight: 850;
          color: #2c1b0d;
          margin: 0;
        }

        .pending-badge-count {
          background: rgba(231,76,60,0.1);
          color: #e74c3c;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .pending-orders-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
          flex-grow: 1;
          padding-right: 6px;
        }
        .pending-orders-stack::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .pending-orders-stack::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.15);
          border-radius: 4px;
        }

        .right-sidebar-order-card {
          background: #fbf9f6;
          border: 1px solid rgba(44,27,13,0.06);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.01);
        }

        .sidebar-card-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          padding-bottom: 6px;
        }

        .sidebar-order-id {
          font-size: 12.5px;
          color: #2c1b0d;
          font-weight: 800;
        }

        .sidebar-order-date {
          font-size: 11px;
          color: #888;
        }

        /* Detailed Card layout */
        .sidebar-card-body-detailed {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .sidebar-product-img {
          width: 60px;
          height: 60px;
          object-fit: cover;
          border-radius: 8px;
          border: 1.5px solid rgba(44,27,13,0.06);
          flex-shrink: 0;
        }

        .sidebar-product-details {
          flex-grow: 1;
          min-width: 0;
        }

        .sidebar-product-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #2c1b0d;
          margin: 0 0 4px;
        }

        .sidebar-customer-name {
          font-size: 11.5px;
          color: #555;
          display: block;
          margin-bottom: 4px;
        }

        .sidebar-office-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          color: #8a583c;
          background: rgba(138, 88, 60, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          margin-bottom: 6px;
        }

        .sidebar-extra-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 10px;
          color: #777;
          margin-bottom: 8px;
        }

        .sidebar-total-amount {
          font-size: 13px;
          color: #2c1b0d;
          font-weight: 900;
          display: block;
        }

        .sidebar-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
          border-top: 1px dashed rgba(44,27,13,0.1);
          padding-top: 10px;
        }

        .sidebar-action-btn {
          flex: 1;
          border: none;
          padding: 8px;
          font-size: 11.5px;
          font-weight: 800;
          border-radius: 6px;
          cursor: pointer;
        }

        .sidebar-action-btn.accept {
          background: #2c1b0d;
          color: #fff;
        }

        .sidebar-action-btn.reject {
          background: rgba(231,76,60,0.1);
          color: #e74c3c;
        }

        .empty-sidebar-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 100%;
          color: #888;
        }

        .empty-emoji {
          font-size: 32px;
          margin-bottom: 12px;
        }

        /* Top Header Area matching second image */
        .dashboard-header-new {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .welcome-label {
          font-size: 13px;
          color: #888;
          display: block;
          margin-bottom: 2px;
        }

        .operator-title {
          font-size: 24px;
          font-weight: 900;
          color: #2c1b0d;
          margin: 0;
          white-space: nowrap;
        }

        .header-search-box-wrap {
          position: relative;
          width: 100%;
          max-width: 440px;
        }

        .search-icon-new {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: #888;
        }

        .search-input-new {
          width: 100%;
          background: #ffffff;
          border: 1px solid rgba(44, 27, 13, 0.08);
          border-radius: 12px;
          padding: 12px 14px 12px 42px;
          color: #2c1b0d;
          outline: none;
          font-size: 13.5px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.01);
        }

        .alert-bell-btn {
          background: #ffffff;
          border: 1px solid rgba(44,27,13,0.08);
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.01);
        }

        .profile-avatar-new {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          object-fit: cover;
        }

        /* Sales Subheader */
        .sales-order-subheader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .sales-order-subheader h2 {
          font-size: 18px;
          font-weight: 850;
          color: #2c1b0d;
          margin: 0 0 4px;
        }

        .sales-order-subheader p {
          font-size: 12px;
          color: #666;
          margin: 0;
        }

        .subheader-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .btn-export-data {
          background: #ffffff;
          border: 1px solid rgba(44, 27, 13, 0.1);
          color: #2c1b0d;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
        }

        .filter-pill-group {
          background: rgba(44, 27, 13, 0.05);
          padding: 4px;
          border-radius: 8px;
          display: flex;
          gap: 2px;
        }

        .filter-pill-btn {
          border: none;
          background: transparent;
          color: #777;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
        }

        .filter-pill-btn.active {
          background: #e74c3c;
          color: #ffffff;
        }

        /* Stats cards row */
        .stats-cards-row-new {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .stats-card-item {
          background: #ffffff;
          border: 1px solid rgba(44, 27, 13, 0.04);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.01);
        }

        .stats-card-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
          color: #666;
          margin-bottom: 12px;
        }

        .stats-icon-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }

        .stats-icon-circle.red-bg { background: rgba(231, 76, 60, 0.1); }
        .stats-icon-circle.yellow-bg { background: rgba(241, 196, 15, 0.1); }
        .stats-icon-circle.green-bg { background: rgba(39, 174, 96, 0.1); }

        .stats-card-item h3 {
          font-size: 20px;
          font-weight: 900;
          color: #2c1b0d;
          margin: 0 0 6px;
        }

        .stats-percent-tag {
          font-size: 11px;
          font-weight: 700;
        }

        .stats-percent-tag.green { color: #27ae60; }
        .stats-percent-tag.red { color: #e74c3c; }

        /* Double row grids */
        .dashboard-double-row-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 28px;
        }

        .dashboard-large-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(44, 27, 13, 0.04);
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }

        .card-header-new {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          padding-bottom: 10px;
        }

        .card-header-new h3 {
          font-size: 15px;
          font-weight: 850;
          color: #2c1b0d;
          margin: 0;
        }

        .payout-status-badge {
          background: #fbf9f6;
          border: 1px solid rgba(44,27,13,0.1);
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
        }

        /* Performance pills */
        .performance-tally-pills {
          display: flex;
          gap: 14px;
          margin-bottom: 20px;
        }

        .tally-pill {
          font-size: 12px;
          font-weight: 700;
          color: #2c1b0d;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.04);
        }

        .tally-pill.red { border-left: 4px solid #e74c3c; }
        .tally-pill.yellow { border-left: 4px solid #f1c40f; }
        .tally-pill.green { border-left: 4px solid #27ae60; }

        /* Performance vertical bar chart */
        .bar-chart-performance-visual {
          display: flex;
          gap: 16px;
          height: 180px;
          padding-top: 10px;
        }

        .y-axis-labels {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-size: 10px;
          color: #999;
          text-align: right;
          width: 24px;
        }

        .bars-track-new {
          flex-grow: 1;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-left: 1px solid rgba(0,0,0,0.05);
          border-bottom: 1px solid rgba(0,0,0,0.05);
          padding-left: 10px;
          position: relative;
        }

        .bar-column-new {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-grow: 1;
          position: relative;
        }

        .bar-rect-track {
          height: 140px;
          width: 12px;
          display: flex;
          align-items: flex-end;
          position: relative;
        }

        .bar-rect-fill {
          background: rgba(44, 27, 13, 0.12);
          width: 100%;
          border-radius: 4px;
          position: relative;
        }

        .bar-rect-fill.highlighted {
          background: #e74c3c;
        }

        .chart-tooltip-bubble {
          position: absolute;
          top: -46px;
          left: 50%;
          transform: translateX(-50%);
          background: #2c1b0d;
          color: #ffffff;
          font-size: 9.5px;
          padding: 6px;
          border-radius: 6px;
          white-space: nowrap;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          z-index: 10;
        }

        .bar-month-lbl {
          font-size: 10px;
          color: #888;
          margin-top: 6px;
          font-weight: 700;
        }

        /* Recent Orders Table */
        .table-wrapper-new {
          overflow-x: auto;
        }

        .recent-orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }

        .recent-orders-table th {
          color: #777;
          font-weight: 700;
          padding: 12px 8px;
          border-bottom: 1.5px solid rgba(0,0,0,0.04);
        }

        .recent-orders-table td {
          padding: 12px 8px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          color: #2c1b0d;
        }

        .table-status-pill {
          font-size: 9.5px;
          font-weight: 850;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .table-status-pill.shipped { background: rgba(52, 152, 219, 0.1); color: #3498db; }
        .table-status-pill.pending { background: rgba(241, 196, 15, 0.1); color: #d35400; }
        .table-status-pill.delivered { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
        .table-status-pill.cancelled { background: rgba(231, 76, 60, 0.1); color: #e74c3c; }

        /* Inventory check */
        .inventory-cards-grid-new {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .inventory-progress-card-item {
          background: #fbf9f6;
          border: 1px solid rgba(0,0,0,0.04);
          padding: 14px;
          border-radius: 12px;
        }

        .inventory-indicator-bullet {
          color: #27ae60;
        }

        .inventory-progress-bar-wrap {
          background: rgba(44, 27, 13, 0.05);
          height: 6px;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 12px;
        }

        .inventory-progress-bar-fill {
          background: #2c1b0d;
          height: 100%;
        }

        /* Loyalty badges */
        .loyalty-pill {
          font-size: 9px;
          font-weight: 900;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .loyalty-pill.gold { background: rgba(241, 196, 15, 0.2); color: #d35400; }
        .loyalty-pill.platinum { background: rgba(52, 152, 219, 0.2); color: #2980b9; }

        /* Other layouts */
        .tab-body-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 850;
          color: #2c1b0d;
          margin-bottom: 20px;
        }

        .queue-list-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .queue-order-card {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.05);
          padding: 20px;
          border-radius: 16px;
        }

        /* Kanban Priority board layout */
        .queue-kanban-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: start;
        }

        .kanban-column {
          background: rgba(44, 27, 13, 0.02);
          border: 1px solid rgba(44, 27, 13, 0.05);
          border-radius: 24px;
          padding: 20px;
          min-height: 600px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .kanban-column.high-col { border-top: 4px solid #e74c3c; }
        .kanban-column.normal-col { border-top: 4px solid #2c1b0d; }
        .kanban-column.low-col { border-top: 4px solid #27ae60; }

        .kanban-column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 850;
          font-size: 14.5px;
          color: #2c1b0d;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(44, 27, 13, 0.08);
          margin-bottom: 8px;
        }

        .kanban-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .kanban-badge.red { background: rgba(231, 76, 60, 0.1); color: #e74c3c; }
        .kanban-badge.chocolate { background: rgba(44, 27, 13, 0.1); color: #2c1b0d; }
        .kanban-badge.green { background: rgba(39, 174, 96, 0.15); color: #27ae60; }

        .kanban-cards-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-column-msg {
          text-align: center;
          color: #999;
          font-size: 12.5px;
          padding: 40px 10px;
          border: 1px dashed rgba(44,27,13,0.1);
          border-radius: 12px;
          background: #ffffff;
        }

        .queue-card-detailed-item.low-priority-style {
          border-left: 5px solid #27ae60;
        }
        
        .priority-badge-pill.low {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
        }

        .queue-card-detailed-item {
          background: #ffffff;
          border: 1px solid rgba(44, 27, 13, 0.06);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.01);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .queue-card-detailed-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(44, 27, 13, 0.05);
        }

        .queue-card-detailed-item.high-priority-pulse {
          border-left: 5px solid #e74c3c;
          background: #fffcfb;
          animation: pulseBorderLight 2s infinite alternate;
        }

        @keyframes pulseBorderLight {
          from { border-left-color: #e74c3c; box-shadow: 0 4px 15px rgba(231, 76, 60, 0.05); }
          to { border-left-color: #c0392b; box-shadow: 0 4px 20px rgba(231, 76, 60, 0.15); }
        }

        .queue-card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(0,0,0,0.03);
          padding-bottom: 8px;
        }

        .queue-card-id {
          font-size: 13px;
          font-weight: 800;
          color: #2c1b0d;
        }

        .priority-badge-pill {
          font-size: 9px;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .priority-badge-pill.high {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
          animation: flashTextMini 0.8s infinite alternate;
        }

        @keyframes flashTextMini {
          from { opacity: 0.8; }
          to { opacity: 1; }
        }

        .priority-badge-pill.normal {
          background: rgba(44, 27, 13, 0.05);
          color: #2c1b0d;
        }

        .queue-card-body-wrap {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .queue-card-thumbnail {
          width: 72px;
          height: 72px;
          object-fit: cover;
          border-radius: 10px;
          border: 1.5px solid rgba(44,27,13,0.06);
        }

        .queue-card-text-details h4 {
          font-size: 15px;
          font-weight: 850;
          color: #2c1b0d;
          margin: 0 0 6px;
        }

        .queue-customer-lbl, .queue-office-lbl {
          display: block;
          font-size: 12px;
          color: #555;
          margin-bottom: 4px;
        }

        .queue-customization-specs {
          display: flex;
          gap: 8px;
          font-size: 10.5px;
          color: #777;
          margin-top: 6px;
        }

        .queue-card-action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px dashed rgba(0,0,0,0.05);
          padding-top: 14px;
        }

        .btn-action-fill {
          border: none;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 800;
          border-radius: 6px;
          cursor: pointer;
          color: #ffffff;
        }

        .btn-action-fill.accept { background: #2c1b0d; }
        .btn-action-fill.dispatch { background: #3498db; }
        .btn-action-fill.complete { background: #27ae60; }

        .btn-action-outline {
          background: transparent;
          border: 1px solid rgba(0,0,0,0.1);
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 800;
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-action-outline.reject {
          border-color: rgba(231, 76, 60, 0.2);
          color: #e74c3c;
          background: rgba(231, 76, 60, 0.05);
        }

        .served-status-success-badge {
          font-size: 12.5px;
          color: #27ae60;
          font-weight: bold;
        }

        .stocks-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .stock-control-card {
          background: #ffffff;
          border: 1.5px solid rgba(0,0,0,0.04);
          padding: 20px;
          border-radius: 16px;
        }

        .stock-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 14px;
        }

        .stock-indicator-pill {
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .stock-indicator-pill.in-stock { background: rgba(39, 174, 96, 0.1); color: #27ae60; }
        .stock-indicator-pill.low-stock { background: rgba(241, 196, 15, 0.1); color: #d35400; }
        .stock-indicator-pill.out-of-stock { background: rgba(231, 76, 60, 0.1); color: #e74c3c; }

        .btn-raise-restock {
          background: transparent;
          border: 1px dashed rgba(44, 27, 13, 0.3);
          color: #2c1b0d;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 750;
          border-radius: 6px;
          cursor: pointer;
        }

        /* Realtime alert popup modal */
        .alert-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }

        .alert-modal-card {
          background: #ffffff;
          border: 2.5px solid #e74c3c;
          border-radius: 24px;
          width: 90%;
          max-width: 440px;
          padding: 26px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }

        .flashing-alarm-header {
          background: #e74c3c;
          color: #ffffff;
          padding: 12px;
          font-weight: 900;
          text-align: center;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .timer-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 14px;
        }

        .alert-modal-details {
          font-size: 13.5px;
          color: #2c1b0d;
          line-height: 1.5;
          margin-bottom: 20px;
        }

        .alert-modal-actions {
          display: flex;
          gap: 10px;
        }

        .alert-btn {
          flex: 1;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 800;
          cursor: pointer;
        }

        .alert-btn.accept {
          background: #2c1b0d;
          color: #fff;
        }

        .alert-btn.reject {
          background: #fbf9f6;
          border: 1px solid rgba(0,0,0,0.1);
          color: #e74c3c;
        }

        @media (max-width: 1400px) {
          .dashboard-container {
            margin-right: 0;
            width: calc(100% - 260px);
          }
          .dashboard-right-sidebar {
            position: static;
            width: 100%;
            border-left: none;
            border-top: 1px solid rgba(44, 27, 13, 0.08);
            margin-top: 40px;
          }
        }

        @media (max-width: 1100px) {
          .dashboard-double-row-grid {
            grid-template-columns: 1fr;
          }
          .stats-cards-row-new {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 860px) {
          .dashboard-sidebar {
            display: none;
          }
          .dashboard-container {
            margin-left: 0;
            width: 100%;
          }
          .stats-cards-row-new {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

