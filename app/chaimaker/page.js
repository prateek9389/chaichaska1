"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { onOrdersSnapshot, getSubscriptions, updateSubscription, updateOrder, addRestockRequest, onRestockRequestsSnapshot, onLeaveRequestsSnapshot, addLeaveRequest, getProfileSettings, updateProfileSettings } from "@/lib/firestore";
import { loginWithEmail, signOut, signInWithGoogle } from "@/lib/auth";

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
  const [queueTab, setQueueTab] = useState("one-time");
  const [selectedQueueOrder, setSelectedQueueOrder] = useState(null);
  const [isQueueSidebarOpen, setIsQueueSidebarOpen] = useState(false);
  const [deliveryTimeInput, setDeliveryTimeInput] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  // Active Orders Queue with detailed fields (including office number, product image, details, priority, createdAt, allocatedTime)
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

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

  const [stocks, setStocks] = useState([]);

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
  const [showPendingSidebar, setShowPendingSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("readNotifications_chaimaker");
    if (saved) {
      try { setReadNotifications(JSON.parse(saved)); } catch(e) {}
    }
  }, []);

  const markAsRead = (id) => {
    setReadNotifications(prev => {
      const next = [...prev, id];
      localStorage.setItem("readNotifications_chaimaker", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    async function loadProfile() {
      const data = await getProfileSettings();
      if (data) {
        if (data.brewmasterContact) setBrewmasterContact(data.brewmasterContact);
        if (data.brewmasterBio) setBrewmasterBio(data.brewmasterBio);
        if (data.shopName) setShopName(data.shopName);
        if (data.workingHours) setWorkingHours(data.workingHours);
      }
    }
    loadProfile();
  }, []);

  // Add new stock item form state
  const [newStockName, setNewStockName] = useState("");
  const [newStockQty, setNewStockQty] = useState("");
  const [newStockLevel, setNewStockLevel] = useState("In Stock");

  // Inline stock edit state
  const [editingStockIdx, setEditingStockIdx] = useState(null);
  const [editStockQty, setEditStockQty] = useState("");
  const [editStockLevel, setEditStockLevel] = useState("In Stock");

  // Customer Management Table
  const customerManagement = [
    { name: "John Bike Parts", orders: 10, lastOrder: "09/12/2026", loyalty: "Gold" },
    { name: "Elite Cycling Co.", orders: 15, lastOrder: "09/11/2026", loyalty: "Platinum" },
  ];

  const filteredOrders = orders.filter(o => {
    if (!o.createdAt) return true;
    const now = Date.now();
    const diff = now - o.createdAt;
    if (timeFilter === "Daily") return diff <= 24 * 60 * 60 * 1000;
    if (timeFilter === "Weekly") return diff <= 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === "Monthly") return diff <= 30 * 24 * 60 * 60 * 1000;
    return true;
  });

  const totalOrdersCount = filteredOrders.length;
  const completedOrdersCount = filteredOrders.filter(o => o.status === "Delivered" || o.status === "Completed").length;
  const pendingOrdersCount = filteredOrders.filter(o => o.status === "Received" || o.status === "Pending" || o.status === "Preparing").length;

  const statsSummary = {
    totalOrders: `${totalOrdersCount} orders`,
    deliveryShipment: `${completedOrdersCount} Delivery`,
    pendingShipment: `${pendingOrdersCount} orders`,
  };

  const itemCounts = {};
  orders.forEach(o => {
    const name = o.item || "Chai Selection";
    itemCounts[name] = (itemCounts[name] || 0) + 1;
  });
  const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
  const topItem1 = sortedItems[0] ? `${sortedItems[0][0]} (${sortedItems[0][1]} units)` : "Classic Masala Chai (0 units)";
  const topItem2 = sortedItems[1] ? `${sortedItems[1][0]} (${sortedItems[1][1]} units)` : "Saffron Royal Chai (0 units)";
  const topItem3 = sortedItems[2] ? `${sortedItems[2][0]} (${sortedItems[2][1]} units)` : "Ginger Chai (0 units)";

  const todaySettlements = [
    { item: "Classic Masala Chai (24 units)", value: "₹3,576" },
    { item: "Saffron Royal Chai (9 units)", value: "₹2,241" },
    { item: "Ginger (Adrak) Chai (15 units)", value: "₹2,535" },
    { item: "Almond Cookies (30 units)", value: "₹1,500" },
  ];

  const historyOrders = orders.map((o) => {
    const customizations = [];
    if (o.sugar) customizations.push(`Sugar: ${o.sugar}`);
    if (o.milk) customizations.push(`Milk: ${o.milk}`);
    
    return {
      id: o.id.startsWith("#") ? o.id : `#${o.id.replace("CHAI-ORD-", "")}`,
      customer: o.customer || "Loyal Customer",
      status: o.status || "Received",
      date: o.date || "Just now",
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

  // Settings & Working Hours
  const [leaveStart, setLeaveStart] = useState("2026-07-10");
  const [leaveEnd, setLeaveEnd] = useState("2026-07-12");
  const [newLeaveReason, setNewLeaveReason] = useState("");
  const [leaveRequests, setLeaveRequests] = useState([
    { start: "2026-07-10", end: "2026-07-12", reason: "Family Event", status: "Approved" }
  ]);

  const notifications = [
    ...orders
      .filter(o => o.status === "Received" || o.status === "Pending" || o.status === "Preparing")
      .map(o => ({ id: o.id, text: `Order ${o.id} - ${o.item}`, time: o.date })),
    ...restockRequests
      .map((r, i) => ({ id: r.id || `restock-${i}`, text: `Stock Alert: ${r.item} (${r.qty})`, time: r.date || "New" })),
    ...leaveRequests
      .filter(l => l.status === "Pending")
      .map((l, i) => ({ id: l.id || `leave-${i}`, text: `Leave: ${l.start} to ${l.end}`, time: "New" }))
  ].filter(n => !readNotifications.includes(n.id));

  const [workingHours, setWorkingHours] = useState("8:00 AM - 6:00 PM");
  const [shopName, setShopName] = useState("Chai Chaska Jaipur HQ");
  const [brewmasterName, setBrewmasterName] = useState("Chai Maker");
  const [brewmasterContact, setBrewmasterContact] = useState("+91 98765 43210");
  const [brewmasterBio, setBrewmasterBio] = useState("Specialist in traditional spice infusions, kulhad brewing, and custom spice blends with 6+ years of corporate hospitality experience.");

  // Realtime Incoming Alert states
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const audioIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const [timeTick, setTimeTick] = useState(0);

  useEffect(() => {
    const savedLogin = localStorage.getItem("brewmaster_logged");
    if (savedLogin === "true") {
      setIsLoggedIn(true);
    }
    let prevOrderIds = [];
    const unsubOrders = onOrdersSnapshot((data) => {
      const currentPending = data.filter(o => o.status === "Received" || o.status === "Pending");
      const newOrders = currentPending.filter(o => !prevOrderIds.includes(o.id));
      if (newOrders.length > 0 && prevOrderIds.length > 0) {
        newOrders.forEach(o => {
          const speakText = `New order received from ${o.customer || "a customer"} for ${o.item || "Chai"}`;
          if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(speakText);
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
          }
          setIncomingOrder(o);
          setToastMsg(`🚨 New Request: ${o.item || "Chai"}!`);
          setTimeout(() => setToastMsg(""), 5000);
        });
      }
      prevOrderIds = data.map(o => o.id);
      setOrders(data);
    });
    const unsubSubs = onSnapshot(collection(db, "subscriptions"), (snap) => {
      const items = [];
      snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setSubscriptions(items);
    });
    const unsubStock = onSnapshot(collection(db, "stock"), (snap) => {
      const items = [];
      snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
      setStocks(items);
    });
    const unsubRestock = onRestockRequestsSnapshot((data) => {
      setRestockRequests(data);
    });
    const unsubLeave = onLeaveRequestsSnapshot((data) => {
      setLeaveRequests(data);
    });
    return () => {
      unsubOrders();
      unsubSubs();
      unsubStock();
      unsubRestock();
      unsubLeave();
    };
  }, []);

  const allocateTime = async (id, timeVal) => {
    try {
      await updateOrder(id, { allocatedTime: timeVal });
    } catch (err) {
      console.error("Error allocating time:", err);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const mail = username.trim().toLowerCase();

    const envEmail = process.env.NEXT_PUBLIC_BREWMASTER_EMAIL || "brewmaster@chaichaska.com";
    const envPass = process.env.NEXT_PUBLIC_BREWMASTER_PASSWORD || "Str0ngBr3wP@ss!";

    if (mail === envEmail && password === envPass) {
      setIsLoggedIn(true);
      localStorage.setItem("brewmaster_logged", "true");
      setLoginError("");
    } else {
      setLoginError("Access denied. Invalid credentials.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const user = await signInWithGoogle();
      if (user.email === "rohitsengar02@gmail.com") {
        setIsLoggedIn(true);
        localStorage.setItem("brewmaster_logged", "true");
        setLoginError("");
      } else {
        await signOut();
        setLoginError("Access denied. Unauthorized email.");
      }
    } catch (e) {
      console.error(e);
      setLoginError("Google sign-in failed.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error("Logout error", e);
    }
    setIsLoggedIn(false);
    localStorage.removeItem("brewmaster_logged");
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
    } catch (err) {}
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

  const acceptOrderAlert = async () => {
    stopAlertRinging();
    if (incomingOrder) {
      try {
        await updateOrder(incomingOrder.id, { status: "Preparing" });
      } catch(err) {
        console.error(err);
      }
    }
    setIncomingOrder(null);
  };

  const rejectOrderAlert = async () => {
    stopAlertRinging();
    if (incomingOrder) {
      try {
        await updateOrder(incomingOrder.id, { status: "Cancelled" });
      } catch(err) {
        console.error(err);
      }
    }
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

  const handleRaiseAlert = async (e) => {
    e.preventDefault();
    if (!requestQty) return;
    const newReq = {
      item: selectedItem,
      qty: requestQty,
      urgency: urgency,
      notes: requestNotes || "No notes",
      date: new Date().toLocaleDateString("en-IN") + " " + new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }),
      status: "Sent to Admin"
    };
    try {
      await addRestockRequest(newReq);
      setToastMsg(`🚨 Restock alert for "${selectedItem}" has been sent to the Admin!`);
      setRequestQty("");
      setRequestNotes("");
    } catch(err) {
      console.error(err);
      setToastMsg("Error sending request.");
    }
    setTimeout(() => setToastMsg(""), 4500);
  };

  const handleToggleMenuAvailability = (idx) => {
    setMenuItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, active: !item.active } : item))
    );
    setToastMsg(`Updated menu item availability!`);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleAddNewMenuItem = (e) => {
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
    setMenuItems((prev) => [...prev, newItem]);
    setToastMsg(`🌱 Added "${newMenuItemName}" to today's menu!`);
    setNewMenuItemName("");
    setNewMenuItemPrice("");
    setNewMenuItemImg("");
    setNewMenuItemDesc("");
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleAddNewStock = (e) => {
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
    setStocks((prev) => [...prev, newItem]);
    setToastMsg(`🌱 Successfully added "${newStockName}" to Kitchen Stock!`);
    setNewStockName("");
    setNewStockQty("");
    setTimeout(() => setToastMsg(""), 4000);
  };

  const handleSaveStockEdit = (idx) => {
    setStocks((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, qty: editStockQty, level: editStockLevel } : s))
    );
    setEditingStockIdx(null);
    setToastMsg(`✓ Updated stock details successfully!`);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const toggleStockStatus = (idx, level) => {
    const nextLevels = { "In Stock": "Low Stock", "Low Stock": "Out of Stock", "Out of Stock": "In Stock" };
    const nextLvl = nextLevels[level];
    setStocks((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, level: nextLvl } : s))
    );
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
            {/* Amount Total removed for Brewmaster */}
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
                onClick={() => updateOrder(o.id, { status: "Shipped" })}
                style={{ background: "#f39c12", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
              >
                Ready to Dispatch
              </button>
            )}
            {(o.status === "Shipped" || o.status === "In Transit") && (
              <button
                onClick={() => updateOrder(o.id, { status: "Delivered" })}
                style={{ background: "#8a583c", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
              >
                Mark Delivered
              </button>
            )}
            {o.status === "Delivered" && (
              <span style={{ background: "rgba(39,174,96,0.1)", color: "#27ae60", padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>✓ Delivered</span>
            )}
            {o.status === "Cancelled" && (
              <span style={{ fontSize: "12px", color: "#e74c3c", fontWeight: "bold" }}>❌ Cancelled</span>
            )}
            {o.status === "Cancelled by User" && (
              <span style={{ fontSize: "12px", color: "#e74c3c", fontWeight: "bold" }}>❌ Cancelled by User</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const activeUnservedOrders = orders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled" && o.status !== "Cancelled by User");
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
      price: "₹0",
      priceNum: 0,
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
            <div className="brewmaster-badge">BREWMASTER ACCESS ONLY</div>
            <h2>Authenticate Terminal</h2>
            <p>Enter operator credentials to link with active brewing controllers.</p>
            
            {loginError && <div className="login-error-alert">{loginError}</div>}

            <div className="form-group">
              <label>Operator Email</label>
              <input
                type="email"
                placeholder="Email (e.g. brewmaster@gmail.com)"
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
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <button type="submit" className="btn-authenticate">
              AUTHENTICATE TERMINAL
            </button>
            <button type="button" onClick={handleGoogleLogin} className="btn-authenticate" style={{ background: "#4285F4", color: "#fff", marginTop: "12px", border: "none" }}>
              SIGN IN WITH GOOGLE
            </button>
          </form>
        </div>
      ) : (
        /* BREWMASTER PANEL */
        <div className="dashboard-wrapper">
          
          {/* FIXED LEFT SIDEBAR */}
          <aside className="dashboard-sidebar">
            <div className="sidebar-logo">
              <img src="/logo.png" alt="Chai Chaska Logo" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "50%" }} />
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
              <button onClick={() => setActiveTab("history")} className={`menu-icon-btn ${activeTab === "history" ? "active" : ""}`}>
                <span className="btn-emoji">📜</span> Order History
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
              marginRight: "0", 
              width: "calc(100% - 200px)",
              transition: "all 0.3s ease-in-out"
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
                  <span style={{ display: "inline-block" }}>📋</span> Pending Requests ({pendingSidebarOrders.length})
                </button>

                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowNotifications(!showNotifications)} className="alert-bell-btn" title="Simulate Alarm" style={{ border: "none", background: "transparent", fontSize: "18px", cursor: "pointer", position: "relative" }}>
                    🔔
                    {notifications.length > 0 && (
                      <span style={{ position: "absolute", top: "5px", right: "5px", width: "10px", height: "10px", background: "red", borderRadius: "50%", border: "2px solid #fff" }} />
                    )}
                  </button>
                  {showNotifications && (
                    <div style={{ position: "absolute", top: "100%", right: "0", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "12px", width: "250px", padding: "12px", boxShadow: "0 10px 20px rgba(0,0,0,0.1)", zIndex: 100 }}>
                      <h4 style={{ margin: "0 0 10px", fontSize: "14px" }}>Notifications</h4>
                      {notifications.length === 0 ? (
                        <p style={{ fontSize: "12px", color: "#666" }}>No new notifications.</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: "12px", color: "#333", fontWeight: "bold" }}>{n.text}</div>
                              <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>{n.time}</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} style={{ border: "none", background: "transparent", color: "#e74c3c", cursor: "pointer", fontSize: "14px", padding: "4px" }}>✖</button>
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
                        link.setAttribute("download", `chaimaker_orders_${timeFilter.toLowerCase()}.csv`);
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

                  
                </div>

                {/* MIDDLE ROW */}
                <div className="dashboard-double-row-grid">
                  <div className="dashboard-large-card">
                    <div className="card-header-new">
                      <h3>Sales Performance</h3>
                      <span className="payout-status-badge">Monthly ∨</span>
                    </div>
                    <div className="performance-tally-pills">
                      <span className="tally-pill red">🥇 {topItem1}</span>
                      <span className="tally-pill yellow">🥈 {topItem2}</span>
                      <span className="tally-pill green">🥉 {topItem3}</span>
                    </div>

                    <div className="bar-chart-performance-visual">
                      <div className="y-axis-labels">
                        <span>250</span><span>200</span><span>150</span><span>100</span><span>50</span><span>0</span>
                      </div>
                      <div className="bars-track-new">
                        {[
                          { m: "Jan", h: 40 }, { m: "Feb", h: 60 }, { m: "Mar", h: 45 }, { m: "Apr", h: 70 },
                          { m: "May", h: 55 }, { m: "Jun", h: 80 }, { m: "Jul", h: 65 }, { m: "Aug", h: 90, highlighted: true },
                          { m: "Sep", h: 75 }, { m: "Oct", h: 60 }, { m: "Nov", h: 50 }, { m: "Dec", h: 30 }
                        ].map((bar, i) => (
                          <div key={i} className="bar-column-new">
                            <div className="bar-rect-track">
                              <div
                                className={`bar-rect-fill ${bar.highlighted ? "highlighted" : ""}`}
                                style={{ height: `${bar.h}%` }}
                              >
                                {bar.highlighted && (
                                  <div className="chart-tooltip-bubble">
                                    
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 className="section-title" style={{ margin: 0 }}>Order Queue (List View)</h3>
                  <div className="admin-tabs" style={{ background: 'transparent', padding: 0, display: "flex", gap: "10px" }}>
                    <button 
                      className={`admin-tab ${queueTab === "one-time" ? "active" : ""}`} 
                      onClick={() => setQueueTab("one-time")}
                      style={{
                        background: queueTab === "one-time" ? "#8e44ad" : "#f5f5f5",
                        color: queueTab === "one-time" ? "#fff" : "#555",
                        border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer"
                      }}
                    >
                      One-Time Orders
                    </button>
                    <button 
                      className={`admin-tab ${queueTab === "subscription" ? "active" : ""}`} 
                      onClick={() => setQueueTab("subscription")}
                      style={{
                        background: queueTab === "subscription" ? "#8e44ad" : "#f5f5f5",
                        color: queueTab === "subscription" ? "#fff" : "#555",
                        border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer"
                      }}
                    >
                      Subscription Orders
                    </button>
                  </div>
                </div>

                <div className="queue-list-container">
                  {queueTab === "one-time" ? (
                    orders.filter(o => o.priority !== "Subscription").length === 0 ? (
                      <div className="empty-column-msg">No active one-time orders found.</div>
                    ) : (
                      orders
                        .filter(o => o.priority !== "Subscription")
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((o) => (
                          <div
                            key={o.id}
                            className="queue-list-item"
                            onClick={() => {
                              setSelectedQueueOrder(o);
                              setDeliveryTimeInput(o.allocatedTime || "");
                              setIsQueueSidebarOpen(true);
                            }}
                          >
                            <img src={o.image || o.img || "/assets/images/tea_icon.png"} alt={o.id} className="queue-list-img" />
                            <div className="queue-list-info">
                              <h4>{o.id} - {o.customer}</h4>
                              <p>{o.item}</p>
                              <span className="time-elapsed">
                                {Math.floor((Date.now() - o.createdAt) / 60000)}m ago
                              </span>
                            </div>
                            <div className="queue-list-status">
                              <span className={`table-status-pill ${o.status ? o.status.toLowerCase() : "received"}`}>
                                {o.status || "Received"}
                              </span>
                            </div>
                          </div>
                        ))
                    )
                  ) : (
                    subscriptions.length === 0 ? (
                      <div className="empty-column-msg">No subscriptions found.</div>
                    ) : (
                      subscriptions
                        .sort((a, b) => {
                          if (a.status === "Active" && b.status !== "Active") return -1;
                          if (a.status !== "Active" && b.status === "Active") return 1;
                          return b.createdAt - a.createdAt;
                        })
                        .map((sub) => (
                          <div
                            key={sub.id}
                            className="queue-list-item"
                            style={{
                              borderLeft: sub.status === "Active" ? "4px solid #8e44ad" : "4px solid #e74c3c",
                              opacity: sub.status === "Active" ? 1 : 0.6
                            }}
                          >
                            <img src={sub.image || sub.img || "/assets/images/tea_icon.png"} alt={sub.id} className="queue-list-img" />
                            <div className="queue-list-info">
                              <h4>{sub.id} - {sub.customer || "Customer"}</h4>
                              <p>{sub.items || sub.item}</p>
                              <span className="time-elapsed">
                                Time Slot: {sub.timeSlot || "N/A"} | {sub.frequency || "Daily"}
                              </span>
                            </div>
                            <div className="queue-list-status">
                              {sub.status === "Active" ? (
                                <span className="table-status-pill received" style={{ background: "#f3e5f5", color: "#8e44ad" }}>
                                  Daily Delivery
                                </span>
                              ) : (
                                <span className="table-status-pill cancelled" style={{ background: "#fce8e6", color: "#e74c3c" }}>
                                  Paused
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                    )
                  )}
                </div>

                {/* SLIDING SIDEBAR FOR ORDER DETAILS */}
                <div className={`queue-sidebar-overlay ${isQueueSidebarOpen ? "open" : ""}`} onClick={() => setIsQueueSidebarOpen(false)}></div>
                <div className={`queue-sidebar-panel ${isQueueSidebarOpen ? "open" : ""}`}>
                  {selectedQueueOrder && (
                    <div className="queue-sidebar-content">
                      <button className="sidebar-close-btn" onClick={() => setIsQueueSidebarOpen(false)}>✕</button>

                      <h2>Order {selectedQueueOrder.id}</h2>
                      <div className="sidebar-detail-group">
                        <label>Customer</label>
                        <p>{selectedQueueOrder.customer}</p>
                        <label>Office</label>
                        <p>{selectedQueueOrder.office}</p>
                        <label>Phone</label>
                        <p>{selectedQueueOrder.phone || "N/A"}</p>
                      </div>

                      <div className="sidebar-detail-group">
                        <label>Items</label>
                        <p><strong>{selectedQueueOrder.item}</strong></p>
                        <label>Add-ons</label>
                        <p>{selectedQueueOrder.addons || "None"}</p>
                        <label>Preferences</label>
                        <p>{selectedQueueOrder.sugar} | {selectedQueueOrder.milk}</p>
                        <label>Total</label>
                        <p>{selectedQueueOrder.total}</p>
                      </div>

                      <div className="sidebar-detail-group">
                        <label>Update Status</label>
                        <select
                          className="sidebar-select"
                          value={selectedQueueOrder.status || "Received"}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            setSelectedQueueOrder({ ...selectedQueueOrder, status: newStatus });
                            updateOrder(selectedQueueOrder.id, { status: newStatus });
                          }}
                        >
                          <option value="Received">Received</option>
                          <option value="Preparing">Preparing</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div className="sidebar-detail-group">
                        <label>Set Delivery Time</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <input
                            type="text"
                            className="sidebar-input"
                            value={deliveryTimeInput}
                            onChange={(e) => setDeliveryTimeInput(e.target.value)}
                            placeholder="e.g. 15 mins"
                          />
                          <button
                            className="sidebar-save-btn"
                            onClick={() => {
                              const updatedStatus = selectedQueueOrder.status || "Received";
                              updateOrder(selectedQueueOrder.id, {
                                allocatedTime: deliveryTimeInput,
                                status: updatedStatus
                              });

                              if (selectedQueueOrder.userId || selectedQueueOrder.userId === undefined) {
                                // Assume userId exists in real data. If so, fetch token and notify
                                const uid = selectedQueueOrder.userId || selectedQueueOrder.customerUid;
                                if (uid) {
                                  getDoc(doc(db, "users", uid)).then(userSnap => {
                                    if (userSnap.exists() && userSnap.data().fcmToken) {
                                      fetch("/api/notify", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          token: userSnap.data().fcmToken,
                                          title: "Order Update",
                                          body: `Your order is now ${updatedStatus}`,
                                          orderId: selectedQueueOrder.id,
                                          userId: uid
                                        })
                                      });
                                    }
                                  }).catch(e => console.error("Error fetching user for push:", e));
                                }
                              }

                              setIsQueueSidebarOpen(false);
                              setToastMsg("Order details updated & notification sent!");
                              setTimeout(() => setToastMsg(""), 3000);
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>


              </div>
            )}

            {/* OTHER OPERATIONAL TABS */}
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

                      {/* Raise Restock Alert Form */}
                      <h3 className="section-title">Raise Restock Request</h3>
                      <form onSubmit={handleRaiseAlert} style={{ background: "#ffffff", padding: "30px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", marginBottom: "32px" }}>
                        <div className="form-group" style={{ marginBottom: "20px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#8a583c", marginBottom: "8px", display: "block" }}>Ingredient Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Assam Loose Tea Leaves"
                            value={selectedItem}
                            onChange={(e) => setSelectedItem(e.target.value)}
                            required
                            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(138,88,60,0.2)", fontSize: "14px", background: "#fdfbf9", color: "#2c1b0d", outline: "none", transition: "all 0.2s ease" }}
                            onFocus={(e) => e.target.style.borderColor = "#8a583c"}
                            onBlur={(e) => e.target.style.borderColor = "rgba(138,88,60,0.2)"}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "20px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#8a583c", marginBottom: "8px", display: "block" }}>Requested Quantity</label>
                          <input
                            type="text"
                            placeholder="e.g. 20 Kg, 50 Litres"
                            value={requestQty}
                            onChange={(e) => setRequestQty(e.target.value)}
                            required
                            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(138,88,60,0.2)", fontSize: "14px", background: "#fdfbf9", color: "#2c1b0d", outline: "none", transition: "all 0.2s ease" }}
                            onFocus={(e) => e.target.style.borderColor = "#8a583c"}
                            onBlur={(e) => e.target.style.borderColor = "rgba(138,88,60,0.2)"}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "24px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#8a583c", marginBottom: "10px", display: "block" }}>Urgency Level</label>
                          <div style={{ display: "flex", gap: "12px" }}>
                            {["Low", "Medium", "High"].map((level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setUrgency(level)}
                                style={{
                                  flex: 1,
                                  padding: "10px",
                                  border: "2px solid",
                                  borderColor: urgency === level ? "#2c1b0d" : "rgba(44,27,13,0.08)",
                                  background: urgency === level ? "#2c1b0d" : "#ffffff",
                                  color: urgency === level ? "#ffffff" : "#555",
                                  borderRadius: "10px",
                                  fontSize: "12px",
                                  fontWeight: "800",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  boxShadow: urgency === level ? "0 4px 12px rgba(44,27,13,0.15)" : "none"
                                }}
                              >
                                {level === "High" ? "🚨 High" : level}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: "24px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#8a583c", marginBottom: "8px", display: "block" }}>Urgent Notes (optional)</label>
                          <textarea
                            placeholder="Why is this restock urgent?"
                            value={requestNotes}
                            onChange={(e) => setRequestNotes(e.target.value)}
                            rows="2"
                            style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(138,88,60,0.2)", fontSize: "14px", background: "#fdfbf9", color: "#2c1b0d", outline: "none", resize: "none", transition: "all 0.2s ease" }}
                            onFocus={(e) => e.target.style.borderColor = "#8a583c"}
                            onBlur={(e) => e.target.style.borderColor = "rgba(138,88,60,0.2)"}
                          />
                        </div>

                        <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "800", fontSize: "13px", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", boxShadow: "0 6px 16px rgba(44,27,13,0.2)", transition: "transform 0.1s ease" }}
                        onMouseDown={(e) => e.target.style.transform = "scale(0.98)"}
                        onMouseUp={(e) => e.target.style.transform = "scale(1)"}
                        onMouseLeave={(e) => e.target.style.transform = "scale(1)"}>
                          SEND ALERT TO ADMIN
                        </button>
                      </form>

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
                            
                            {r.adminMessage && (
                              <div style={{ marginTop: "6px", padding: "6px", background: "#f8f9fa", borderRadius: "4px", fontSize: "10px", color: "#444", borderLeft: "2px solid #3498db" }}>
                                <strong>Admin Reply:</strong> {r.adminMessage}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                  </div>
                </div>
              )
            })()}

            {activeTab === "earnings" && (() => {
              const transactions = [
                { id: "TXN-8801", name: "Aarav Mehta", method: "UPI (GPay)", time: "10 mins ago", status: "Successful" },
                { id: "TXN-8802", name: "Priya Patel", method: "Wallet Balance", time: "22 mins ago", status: "Successful" },
                { id: "TXN-8803", name: "Karan Johar", method: "Credit Card", time: "1 hour ago", status: "Successful" },
                { id: "TXN-8804", name: "Rohan Sharma", method: "UPI (PhonePe)", time: "3 hours ago", status: "Successful" },
                { id: "TXN-8805", name: "Sunita Rao", method: "UPI (Paytm)", time: "4 hours ago", status: "Successful" },
                { id: "TXN-8806", name: "Kabir Singh", method: "Wallet Balance", time: "Yesterday", status: "Successful" },
              ];

              const chartData = [
                { day: "Mon", val: 60, },
                { day: "Tue", val: 80, },
                { day: "Wed", val: 45, },
                { day: "Thu", val: 95, },
                { day: "Fri", val: 70, },
                { day: "Sat", val: 30, },
                { day: "Sun", val: 90, },
              ];

              return (
                <div className="tab-body-wrapper">
                  
                  {/* Earnings Metrics Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>💰 Total Gross Earnings</span>
                      
                      <span style={{ fontSize: "10.5px", color: "#27ae60", display: "block", marginTop: "4px" }}>▲ +14% from last week</span>
                    </div>
                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>🏦 Pending Payout (Auto-Transfer)</span>
                      
                      <span style={{ fontSize: "10.5px", color: "#8a583c", display: "block", marginTop: "4px" }}>Scheduled: Friday, 6:00 PM</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>💳 Total Payments Settled</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>450 Transactions</strong>
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
              const completedCount = orders.filter(o => o.status === "Delivered" || o.status === "Completed").length;
              const cancelledCount = orders.filter(o => o.status === "Cancelled" || o.status === "Refunded").length;
              const totalProcessed = orders.filter(o => o.status !== "Received" && o.status !== "Pending" && o.status !== "Preparing").length;
              const successRate = totalProcessed > 0 ? ((completedCount / totalProcessed) * 100).toFixed(1) : "100.0";

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
                                  <td></td>
                                  <td style={{ padding: "16px", textAlign: "center" }}>1</td>
                                  <td></td>
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
                                  <span></span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#666", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                                  <span>Tax (GST 5%):</span>
                                  <span></span>
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                    <div style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>☕ Total Served Brews</span>
                      <strong style={{ fontSize: "20px", color: "#2c1b0d" }}>{completedCount} Completed</strong>
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
                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.05)", borderTop: sub.status === "Active" ? "4px solid #27ae60" : sub.status === "Paused" ? "4px solid #f39c12" : "4px solid #e74c3c", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", marginBottom: "16px" }}>
                            
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", borderBottom: "1px dashed rgba(0,0,0,0.1)", paddingBottom: "12px" }}>
                              <div>
                                <h4 style={{ fontSize: "16px", fontWeight: "800", color: "#2c1b0d", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                                  👤 {sub.customer}
                                  {sub.status !== "Active" && (
                                    <span style={{ fontSize: "10px", background: sub.status === "Paused" ? "#f39c12" : "#e74c3c", color: "#fff", padding: "3px 8px", borderRadius: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                      {sub.status}
                                    </span>
                                  )}
                                </h4>
                                <span style={{ fontSize: "11px", color: "#8a583c", fontWeight: "600", background: "rgba(138,88,60,0.1)", padding: "2px 8px", borderRadius: "12px" }}>ID: {sub.id}</span>
                              </div>
                              
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "11.5px", color: "#555", fontWeight: "500", marginBottom: "2px" }}>
                                  <span style={{color:"#888"}}>Start:</span> <strong style={{color:"#2c1b0d"}}>{sub.startDate}</strong>
                                </div>
                                <div style={{ fontSize: "11.5px", color: "#555", fontWeight: "500" }}>
                                  <span style={{color:"#888"}}>End:</span> <strong style={{color:"#2c1b0d"}}>{sub.endDate || "Ongoing"}</strong>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                              <div style={{ background: "#fcfaf7", padding: "12px", borderRadius: "12px" }}>
                                <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px", textTransform: "uppercase", fontWeight: "bold" }}>📦 Delivery Address</span>
                                <span style={{ fontSize: "13px", color: "#2c1b0d", fontWeight: "500", lineHeight: "1.4", display: "block" }}>{sub.office}</span>
                              </div>
                              <div style={{ background: "#fcfaf7", padding: "12px", borderRadius: "12px" }}>
                                <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px", textTransform: "uppercase", fontWeight: "bold" }}>☕ Plan Items</span>
                                <span style={{ fontSize: "13px", color: "#2c1b0d", fontWeight: "bold", lineHeight: "1.4", display: "block" }}>{sub.items}</span>
                              </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid rgba(0,0,0,0.03)" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ background: "#e8f6ef", color: "#27ae60", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold" }}>
                                  ⏰ {sub.timeSlot || sub.time || "09:00"}
                                </span>
                                <span style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>({sub.schedule || "Daily"})</span>
                              </div>
                              
                              <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                  type="button"
                                  onClick={() => toggleSubscriptionStatus(sub)}
                                  style={{ background: "#fff", color: "#2c1b0d", border: "1px solid #ddd", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: "600", transition: "all 0.2s" }}
                                  onMouseOver={(e) => e.target.style.background = "#f5f5f5"}
                                  onMouseOut={(e) => e.target.style.background = "#fff"}
                                >
                                  {sub.status === "Active" ? "Pause Plan" : "Resume Plan"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => forceDispatchSubscription(sub)}
                                  style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s", boxShadow: "0 2px 6px rgba(44,27,13,0.3)" }}
                                  onMouseOver={(e) => e.target.style.background = "#4a2d16"}
                                  onMouseOut={(e) => e.target.style.background = "#2c1b0d"}
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
                    
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!newLeaveReason || !leaveStart || !leaveEnd) return;
                        try {
                          await addLeaveRequest({ start: leaveStart, end: leaveEnd, reason: newLeaveReason, status: "Pending Approval" });
                          setNewLeaveReason("");
                          setToastMsg("🌱 Applied for leave! Request submitted to building administrator.");
                          setTimeout(() => setToastMsg(""), 3500);
                        } catch (err) {
                          setToastMsg("❌ Error applying leave: " + err.message);
                          setTimeout(() => setToastMsg(""), 3500);
                        }
                      }}
                      style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                        <div className="form-group">
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Start Date</label>
                          <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>End Date</label>
                          <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Reason for Leave</label>
                        <input type="text" placeholder="e.g. Personal emergency, Kitchen maintenance" value={newLeaveReason} onChange={(e) => setNewLeaveReason(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                      </div>

                      <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>
                        SUBMIT LEAVE REQUEST
                      </button>
                    </form>

                    {/* Applied Leaves Log */}
                    <h3 className="section-title">Leave History & Status</h3>
                    <div style={{ background: "#ffffff", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#fbf9f6", borderBottom: "1px solid rgba(0,0,0,0.06)", color: "#666" }}>
                            <th style={{ padding: "12px 16px" }}>Leave Dates</th>
                            <th style={{ padding: "12px 16px" }}>Reason</th>
                            <th style={{ padding: "12px 16px", textAlign: "right" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaveRequests.map((req, i) => (
                            <tr key={req.id || i} style={{ borderBottom: i === leaveRequests.length - 1 ? "none" : "1px solid rgba(0,0,0,0.04)" }}>
                              <td style={{ padding: "12px 16px" }}>{req.start} to {req.end}</td>
                              <td style={{ padding: "12px 16px", color: "#555" }}>{req.reason}</td>
                              <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                                  <span style={{
                                    fontSize: "9.5px",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontWeight: "bold",
                                    background: req.status === "Approved" ? "rgba(39,174,96,0.1)" : (req.status === "Rejected" ? "rgba(231,76,60,0.1)" : "rgba(241,196,15,0.12)"),
                                    color: req.status === "Approved" ? "#27ae60" : (req.status === "Rejected" ? "#e74c3c" : "#d35400")
                                  }}>
                                    {req.status}
                                  </span>
                                  {req.adminReason && <span style={{ fontSize: "10px", color: "#666" }}>Admin Note: {req.adminReason}</span>}
                                </div>
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
                          localStorage.removeItem("brewmaster_logged");
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
          width: 20%;
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
          margin-left: 20%;
          margin-right: 20%;
          flex-grow: 1;
          padding: 24px;
          box-sizing: border-box;
          width: 60%;
        }

        /* Fixed Right Sidebar for Pending Queue (Detailed cards style) */
        .dashboard-right-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 20%;
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
        .queue-list-item {
          display: flex;
          align-items: center;
          padding: 16px;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid rgba(44, 27, 13, 0.06);
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .queue-list-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.06);
        }

        .queue-list-img {
          width: 60px;
          height: 60px;
          border-radius: 10px;
          object-fit: cover;
          margin-right: 16px;
        }

        .queue-list-info {
          flex: 1;
        }

        .queue-list-info h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          color: #2c1b0d;
        }

        .queue-list-info p {
          margin: 0 0 6px 0;
          font-size: 14px;
          color: #555;
        }

        .time-elapsed {
          font-size: 12px;
          color: #888;
          background: #fbf9f6;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .queue-list-status {
          margin-left: 16px;
        }

        /* Sidebar Styles */
        .queue-sidebar-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4);
          z-index: 999;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s;
        }
        .queue-sidebar-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .queue-sidebar-panel {
          position: fixed;
          top: 0; right: -400px;
          width: 100%;
          max-width: 400px;
          height: 100vh;
          background: #ffffff;
          z-index: 1000;
          box-shadow: -4px 0 20px rgba(0,0,0,0.1);
          transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
        }
        .queue-sidebar-panel.open {
          right: 0;
        }

        .queue-sidebar-content {
          padding: 30px;
          position: relative;
        }

        .sidebar-close-btn {
          position: absolute;
          top: 20px; right: 20px;
          background: none; border: none;
          font-size: 20px;
          cursor: pointer;
          color: #888;
        }

        .queue-sidebar-content h2 {
          font-size: 22px;
          margin-bottom: 24px;
          color: #2c1b0d;
        }

        .sidebar-detail-group {
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .sidebar-detail-group label {
          display: block;
          font-size: 12px;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }

        .sidebar-detail-group p {
          font-size: 15px;
          color: #2c1b0d;
          margin: 0 0 10px 0;
        }

        .sidebar-select, .sidebar-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.1);
          font-size: 15px;
          color: #2c1b0d;
          background: #fdfdfd;
          outline: none;
        }

        .sidebar-save-btn {
          background: #2c1b0d;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0 20px;
          font-weight: 600;
          cursor: pointer;
        }

      `}</style>
    </div>
  );
}


