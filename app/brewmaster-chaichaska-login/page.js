"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { getProductMeta } from "@/lib/productMeta";
import { onOrdersSnapshot, updateOrder, updateStockItem, addStockItem, addRestockRequest, onRestockRequestsSnapshot, onLeaveRequestsSnapshot, addLeaveRequest, onBrewmastersSnapshot, getProfileSettings, onProfileSettingsSnapshot, updateProfileSettings, onProductsSnapshot, createOrder, getMenuItems, getCombos, getRestockHistory, getFeedback } from "@/lib/firestore";
import { loginWithEmail, signOut, signInWithGoogle, onAuthStateChange } from "@/lib/auth";
import { useRouter } from "next/navigation";
import EditOrderModal from "@/components/EditOrderModal";


function getOrderDateString(order) {
  if (!order) return "";

  // 1. Direct orderDate if present (e.g. YYYY-MM-DD or DD/MM/YYYY)
  if (order.orderDate && typeof order.orderDate === 'string') {
    const trimmed = order.orderDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }
  }

  // 2. createdAt timestamp or Firestore Timestamp
  let timestamp = null;
  if (order.createdAt) {
    if (typeof order.createdAt === 'number') {
      timestamp = order.createdAt;
    } else if (order.createdAt?.seconds) {
      timestamp = order.createdAt.seconds * 1000;
    } else if (typeof order.createdAt?.toDate === 'function') {
      timestamp = order.createdAt.toDate().getTime();
    } else if (typeof order.createdAt === 'string') {
      const parsed = Date.parse(order.createdAt);
      if (!isNaN(parsed)) timestamp = parsed;
    }
  }

  // 3. date string field (e.g. "25/09/2026 17:52", "2026-09-25", "Just now")
  if (!timestamp && order.date && typeof order.date === 'string') {
    const ds = order.date.trim();
    if (ds === "Just now") {
      timestamp = Date.now();
    } else if (/^\d{4}-\d{2}-\d{2}/.test(ds)) {
      return ds.slice(0, 10);
    } else {
      const match = ds.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (match) {
        const d = match[1].padStart(2, '0');
        const m = match[2].padStart(2, '0');
        const y = match[3];
        return `${y}-${m}-${d}`;
      }
      const parsed = Date.parse(ds);
      if (!isNaN(parsed)) timestamp = parsed;
    }
  }

  if (timestamp && !isNaN(timestamp)) {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return "";
}

function isOrderMatchingDateFilter(order, dateFilter) {
  if (!dateFilter || dateFilter === "all" || dateFilter === "All") return true;

  const orderDateStr = getOrderDateString(order);
  if (!orderDateStr) return false;

  const now = new Date();
  const formatYMD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = formatYMD(now);

  if (dateFilter === "today" || dateFilter === "Daily") {
    return orderDateStr === todayStr;
  }

  if (dateFilter === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return orderDateStr === formatYMD(y);
  }

  if (dateFilter === "7days" || dateFilter === "Weekly") {
    const past7 = new Date(now);
    past7.setDate(past7.getDate() - 6);
    return orderDateStr >= formatYMD(past7) && orderDateStr <= todayStr;
  }

  if (dateFilter === "Monthly") {
    const orderParts = orderDateStr.split('-');
    return parseInt(orderParts[0], 10) === now.getFullYear() && parseInt(orderParts[1], 10) === (now.getMonth() + 1);
  }

  // Exact date match (e.g. "2026-09-30" or "2026-09-25")
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
    return orderDateStr === dateFilter;
  }

  return true;
}


export default function AdminDashboard() {
  const router = useRouter();
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

  // Tabs State (Default is Order Queue)
  const [activeTabState, setActiveTabState] = useState("queue");
  const [isMobileMoreDrawerOpen, setIsMobileMoreDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("brewmaster_active_tab");
      if (savedTab) setActiveTabState(savedTab);
    }
  }, []);

  const setActiveTab = (tab) => {
    localStorage.setItem("brewmaster_active_tab", tab);
    setActiveTabState(tab);
  };

  const activeTab = activeTabState;

  // Order Notification Sound (MP3 with Synthesizer Fallback)
  const notificationAudioRef = useRef(null);

  const playSynthChimeFallback = () => {
    try {
      if (typeof window === "undefined") return;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.55);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1320, now + 0.16);
      gain2.gain.setValueAtTime(0.4, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.8);
    } catch (e) {}
  };

  const playNewOrderChime = () => {
    try {
      if (typeof window === "undefined") return;
      if (!notificationAudioRef.current) {
        notificationAudioRef.current = new Audio("/universfield-new-notification-036-485897.mp3");
      }
      notificationAudioRef.current.currentTime = 0;
      const playPromise = notificationAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Fallback if browser policy restricts direct audio
          playSynthChimeFallback();
        });
      }
    } catch (err) {
      playSynthChimeFallback();
    }
  };
  const [timeFilter, setTimeFilter] = useState("All");
  const [queueFilter, setQueueFilter] = useState("All");
  const [queueDateFilter, setQueueDateFilter] = useState("all");
  const [activeStatsModal, setActiveStatsModal] = useState(null);
  const [pendingModalView, setPendingModalView] = useState("orders");
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");

  const [selectedQueueOrder, setSelectedQueueOrder] = useState(null);
  const [isQueueSidebarOpen, setIsQueueSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deliveryTimeInput, setDeliveryTimeInput] = useState("");
  const [queueDeliveryPaymentMethod, setQueueDeliveryPaymentMethod] = useState("Cash");
  const [queueDeliveryPaymentStatus, setQueueDeliveryPaymentStatus] = useState("Paid");
  const [isOnline, setIsOnline] = useState(true);
  const [saveAnimation, setSaveAnimation] = useState(false);
  const [showTodayStatsSidebar, setShowTodayStatsSidebar] = useState(false);
  const [tallyDateFilter, setTallyDateFilter] = useState("today");
  const [customTallyDate, setCustomTallyDate] = useState(new Date().toISOString().split('T')[0]);
  const [tallySearchTerm, setTallySearchTerm] = useState("");
  const [queuePaymentFilter, setQueuePaymentFilter] = useState("all");
  const [queueDeliveryStatusFilter, setQueueDeliveryStatusFilter] = useState("all");
  const [queueSearchTerm, setQueueSearchTerm] = useState("");
  const [queueStatusFilter, setQueueStatusFilter] = useState("all");
  const [queueChannelFilter, setQueueChannelFilter] = useState("all");
  const [queueLocationFilter, setQueueLocationFilter] = useState("all");
  const [selectedQueueItemIds, setSelectedQueueItemIds] = useState([]);

  // Active Orders Queue with detailed fields (including office number, product image, details, priority, createdAt, allocatedTime)
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [editingOrder, setEditingOrder] = useState(null);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);

  // Continuous sound effect while any order is unhandled ("Received" or "Pending")
  const unhandledNewOrdersCount = orders.filter(o => 
    o.priority !== "Subscription" && 
    ((o.status || "Received") === "Received" || o.status === "Pending")
  ).length;

  useEffect(() => {
    if (unhandledNewOrdersCount > 0 && isLoggedIn) {
      // Play immediately once
      playNewOrderChime();
      const interval = setInterval(() => {
        playNewOrderChime();
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [unhandledNewOrdersCount, isLoggedIn]);

  const handleOpenEditOrderModal = (order, e) => {
    if (e) e.stopPropagation();
    setEditingOrder(order);
    setIsEditOrderModalOpen(true);
  };

  const updateOrderStatusDirectly = async (order, newStatus, e) => {
    if (e) e.stopPropagation();
    if (!order || !order.id) return;
    try {
      const updates = { status: newStatus };
      if (order.isOffline && newStatus === "Delivered" && (!order.paymentMethod || order.paymentMethod === "Pending Selection")) {
        updates.paymentMethod = "Cash";
        updates.paymentStatus = "Paid";
      }
      await updateOrder(order.id, updates);
      if (selectedQueueOrder && selectedQueueOrder.id === order.id) {
        setSelectedQueueOrder(prev => ({ ...prev, ...updates }));
      }
      setToastMsg(`Status updated to ${newStatus}!`);
      setTimeout(() => setToastMsg(""), 3000);
    } catch (err) {
      console.error("Error updating status directly:", err);
      alert("Failed to update status");
    }
  };

  const [isOfflineItemModalOpen, setIsOfflineItemModalOpen] = useState(false);
  const [offlineOrderForm, setOfflineOrderForm] = useState({
    customerName: "",
    address: "",
    phone: "",
    walkIn: true,
    orderDate: new Date().toLocaleDateString('en-CA'),
    orderTime: new Date().toTimeString().slice(0, 5),
    status: "Received",
    paymentMethod: "Cash",
    paymentStatus: "Paid",
    items: []
  });

  // Live Brewing Kettles & Hot Stations State (Interactive Grid)
  const [kettleStations, setKettleStations] = useState([
    { id: 1, name: "Karak Masala Chai", kettle: "Kettle 01", status: "Boiling", temp: "96°C", cups: 12, maxCups: 15, tag: "Signature Blend", icon: "☕" },
    { id: 2, name: "Royal Adrak Kadak", kettle: "Kettle 02", status: "Steeping", temp: "88°C", cups: 8, maxCups: 12, tag: "Fresh Ginger", icon: "🫖" },
    { id: 3, name: "Elaichi Special", kettle: "Kettle 03", status: "Ready", temp: "82°C", cups: 15, maxCups: 15, tag: "Keep Warm", icon: "🌿" },
    { id: 4, name: "Filter Kaapi", kettle: "Station 04", status: "Decoction", temp: "85°C", cups: 6, maxCups: 10, tag: "Strong Roast", icon: "⚡" },
    { id: 5, name: "Lemon Green Tea", kettle: "Station 05", status: "Standby", temp: "90°C", cups: 4, maxCups: 8, tag: "Herbal Infusion", icon: "🍵" },
    { id: 6, name: "Bun Maska Griller", kettle: "Griller 06", status: "Toasting", temp: "180°C", cups: 3, maxCups: 6, tag: "Bakery Heat", icon: "🍞" }
  ]);

  const cycleKettleStatus = (stationId) => {
    setKettleStations(prev => prev.map(st => {
      if (st.id === stationId) {
        const nextStatus = st.status === "Boiling" ? "Steeping" : st.status === "Steeping" ? "Ready" : st.status === "Ready" ? "Standby" : "Boiling";
        const nextTemp = nextStatus === "Boiling" ? "96°C" : nextStatus === "Steeping" ? "88°C" : nextStatus === "Ready" ? "82°C" : "75°C";
        return { ...st, status: nextStatus, temp: nextTemp };
      }
      return st;
    }));
  };

  // Robust Price Parsing & Formatting Helpers
  const parseOrderPrice = (o) => {
    if (!o) return 0;
    if (typeof o.priceNum === "number" && !isNaN(o.priceNum) && o.priceNum > 0) return o.priceNum;
    if (typeof o.amount === "number" && !isNaN(o.amount) && o.amount > 0) return o.amount;
    if (typeof o.price === "number" && !isNaN(o.price) && o.price > 0) return o.price;
    const raw = o.total || o.totalPrice || o.price || o.amount || 0;
    if (typeof raw === "number" && !isNaN(raw) && raw > 0) return raw;
    if (typeof raw === "string") {
      const num = parseFloat(raw.replace(/[^\d.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
    if (Array.isArray(o.items) && o.items.length > 0) {
      const sum = o.items.reduce((acc, it) => {
        const p = typeof it.price === "number" ? it.price : parseFloat(String(it.price || it.priceNum || it.basePrice || 0).replace(/[^\d.]/g, "")) || 0;
        const q = parseInt(it.quantity || it.qty) || 1;
        return acc + (p * q);
      }, 0);
      if (sum > 0) return sum;
    }
    return 0;
  };

  const formatOrderTotal = (o) => {
    const num = parseOrderPrice(o);
    if (num > 0) return `₹${num.toLocaleString("en-IN")}`;
    if (typeof o?.total === "string" && o.total.includes("₹") && /\d/.test(o.total)) return o.total;
    return "₹0";
  };

  // Helper to determine if an order has pending payment
  const isOrderPendingPayment = (o) => {
    if (!o) return false;
    if (o.status === "Cancelled" || o.status === "Cancelled by User" || o.status === "Refunded") return false;
    const ps = String(o.paymentStatus || "").trim().toLowerCase();
    const pm = String(o.paymentMethod || "").trim().toLowerCase();
    const st = String(o.status || "").trim().toLowerCase();
    if (ps === "paid" || ps === "completed" || ps === "success" || ps === "successful") return false;
    if (ps === "pending" || ps.includes("cod") || ps.includes("unpaid") || ps.includes("due") || ps === "pending payment") return true;
    if (st === "pending payment") return true;
    if (pm.includes("cod") || pm.includes("cash on delivery")) {
      return o.status !== "Delivered" && o.status !== "Completed";
    }
    return false;
  };

  // Detailed Product Delivery & Orders Tally for Sidebar Drawer
  const dailyStatsAndProductTally = (() => {
    const selectedFilter = tallyDateFilter;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredOrdersForDate = orders.filter(o => isOrderMatchingDateFilter(o, selectedFilter));

    const nonCancelledOrders = filteredOrdersForDate.filter(o => o.status !== "Cancelled" && o.status !== "Cancelled by User" && o.status !== "Refunded");

    let totalRevenue = 0;
    let totalOrders = nonCancelledOrders.length;
    let deliveredOrdersCount = 0;
    let preparingOrdersCount = 0;
    let receivedOrdersCount = 0;
    let onlineOrdersCount = 0;
    let offlineOrdersCount = 0;

    const productMap = {};

    nonCancelledOrders.forEach(o => {
      const price = parseOrderPrice(o);
      totalRevenue += price;

      const isDelivered = o.status === "Delivered" || o.status === "Completed";
      const isPreparing = o.status === "Preparing" || o.status === "Out for Delivery" || o.status === "Ready" || o.status === "Shipped";
      const isReceived = o.status === "Received" || o.status === "Pending";
      const isOffline = Boolean(o.isOffline || o.walkIn);

      if (isDelivered) deliveredOrdersCount++;
      if (isPreparing) preparingOrdersCount++;
      if (isReceived) receivedOrdersCount++;
      if (isOffline) offlineOrdersCount++;
      else onlineOrdersCount++;

      if (Array.isArray(o.items) && o.items.length > 0) {
        o.items.forEach(it => {
          const name = it.name || it.item || "Chai Item";
          const qty = parseInt(it.quantity || it.qty) || 1;
          const unitP = typeof it.price === "number" ? it.price : parseFloat(String(it.price || it.priceNum || it.basePrice || 0).replace(/[^\d.]/g, "")) || 0;
          const meta = getProductMeta(name, it.image || it.img, it.category);
          const img = meta.image;
          const cat = meta.category;
          const key = name.trim().toLowerCase();

          if (!productMap[key]) {
            productMap[key] = {
              name,
              image: img,
              category: cat,
              totalQty: 0,
              deliveredQty: 0,
              preparingQty: 0,
              receivedQty: 0,
              unitPrice: unitP,
              revenue: 0
            };
          } else {
            if (meta.image && (!productMap[key].image || productMap[key].image.includes("logo.png") || productMap[key].image.includes("ezzolluycd01piettblm") || productMap[key].image.includes("cmzhutu452ld8798gbln") || productMap[key].image.includes("br6kkfrjvoopkqkzpanm") || productMap[key].image.includes("p7f5conzmiziw1trmlsw") || productMap[key].image.includes("obzeioklky9xtmsrupw2"))) {
              productMap[key].image = meta.image;
            }
            if (meta.category && (productMap[key].category === "Beverages" || productMap[key].category === "Other")) {
              productMap[key].category = meta.category;
            }
          }

          productMap[key].totalQty += qty;
          if (isDelivered) {
            productMap[key].deliveredQty += qty;
          } else if (isPreparing) {
            productMap[key].preparingQty += qty;
          } else {
            productMap[key].receivedQty += qty;
          }
          productMap[key].revenue += (unitP > 0 ? unitP * qty : (price / Math.max(o.items.length, 1)));
          if (img && img !== "/logo.png") productMap[key].image = img;
          if (cat && cat !== "Beverages") productMap[key].category = cat;
        });
      } else if (o.item) {
        const itemStr = o.item;
        const parts = itemStr.split("+");
        parts.forEach(part => {
          const match = part.trim().match(/^(.*?)(?:\s*x\s*(\d+))?$/);
          const name = match && match[1] ? match[1].trim() : part.trim();
          const qty = match && match[2] ? parseInt(match[2]) : 1;
          const key = name.toLowerCase();
          const meta = getProductMeta(name, o.image || o.img, "");
          const img = meta.image;
          const cat = meta.category;

          if (!productMap[key]) {
            productMap[key] = {
              name,
              image: img,
              category: cat,
              totalQty: 0,
              deliveredQty: 0,
              preparingQty: 0,
              receivedQty: 0,
              unitPrice: 0,
              revenue: 0
            };
          } else {
            if (meta.image && (!productMap[key].image || productMap[key].image.includes("logo.png") || productMap[key].image.includes("ezzolluycd01piettblm") || productMap[key].image.includes("cmzhutu452ld8798gbln") || productMap[key].image.includes("br6kkfrjvoopkqkzpanm") || productMap[key].image.includes("p7f5conzmiziw1trmlsw") || productMap[key].image.includes("obzeioklky9xtmsrupw2"))) {
              productMap[key].image = meta.image;
            }
            if (meta.category && (productMap[key].category === "Beverages" || productMap[key].category === "Other")) {
              productMap[key].category = meta.category;
            }
          }

          productMap[key].totalQty += qty;
          if (isDelivered) {
            productMap[key].deliveredQty += qty;
          } else if (isPreparing) {
            productMap[key].preparingQty += qty;
          } else {
            productMap[key].receivedQty += qty;
          }
          productMap[key].revenue += price / Math.max(parts.length, 1);
          if (img && img !== "/logo.png") productMap[key].image = img;
          if (cat && cat !== "Beverages") productMap[key].category = cat;
        });
      }
    });

    const productList = Object.values(productMap).sort((a, b) => b.totalQty - a.totalQty);

    return {
      totalOrders,
      totalRevenue,
      deliveredOrdersCount,
      preparingOrdersCount,
      receivedOrdersCount,
      onlineOrdersCount,
      offlineOrdersCount,
      productList,
      totalUnitsOrdered: productList.reduce((sum, p) => sum + p.totalQty, 0),
      totalUnitsDelivered: productList.reduce((sum, p) => sum + p.deliveredQty, 0),
      totalUnitsPreparing: productList.reduce((sum, p) => sum + (p.preparingQty + p.receivedQty), 0),
      rawOrders: filteredOrdersForDate
    };
  })();

  // Today's Prep Tally — dynamically derived from today's orders
  const todayTally = (() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter(o => (o.createdAt || 0) >= todayStart.getTime());
    const tally = {};
    todayOrders.forEach(o => {
      if (Array.isArray(o.items) && o.items.length > 0) {
        o.items.forEach(it => {
          const name = it.name || it.item || "Chai";
          const qty = parseInt(it.quantity) || 1;
          tally[name] = (tally[name] || 0) + qty;
        });
      } else {
        const itemStr = o.item || "Chai";
        itemStr.split("+").forEach(part => {
          const match = part.trim().match(/^(.*?)(?:\s*x\s*(\d+))?$/);
          const name = match && match[1] ? match[1].trim() : part.trim();
          const qty = match && match[2] ? parseInt(match[2]) : 1;
          tally[name] = (tally[name] || 0) + qty;
        });
      }
    });
    return tally;
  })();

  // Floor batches — dynamically derived from active orders
  const floorBatches = (() => {
    const floorMap = {};
    orders.filter(o => o.status === "Received" || o.status === "Pending" || o.status === "Preparing").forEach(o => {
      const floor = o.office || o.address || "General Area";
      if (!floorMap[floor]) floorMap[floor] = { items: [], count: 0 };
      floorMap[floor].items.push(o.item || "Chai Selection");
      floorMap[floor].count++;
    });
    return Object.entries(floorMap).map(([f, v]) => ({
      floor: f,
      items: v.items.join(", "),
      status: v.count >= 5 ? "High Demand" : v.count >= 2 ? "Medium Demand" : "Normal Demand"
    }));
  })();

  const [stocks, setStocks] = useState([]);

  // Auto alerts and restock logs
  const [autoAlertEnabled, setAutoAlertEnabled] = useState(true);
  const [restockHistory, setRestockHistory] = useState([]);

  // Restock alerts/requests states — fetched from Firebase
  const [restockRequests, setRestockRequests] = useState([]);
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
      try { setReadNotifications(JSON.parse(saved)); } catch (e) { }
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
  const [loggingUsageIdx, setLoggingUsageIdx] = useState(null);
  const [usageAmount, setUsageAmount] = useState("");
  const [restockingIdx, setRestockingIdx] = useState(null);
  const [restockAmount, setRestockAmount] = useState("");
  const [editingStockIdx, setEditingStockIdx] = useState(null);
  const [editStockMinLimit, setEditStockMinLimit] = useState(10);
  const [isAddInventoryModalOpen, setIsAddInventoryModalOpen] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState({ category: "Tea", name: "", unit: "kg", qty: 0, minLimit: 10 });
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("All");
  const [inventorySelectedDate, setInventorySelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // (Price helpers relocated above)

  // Customer Management Table — dynamically derived from live database orders
  const customerManagement = (() => {
    const map = {};
    orders.forEach(o => {
      const name = o.customer || o.address?.firstName || "Customer";
      if (!map[name]) map[name] = { name, orders: 0, lastOrder: 0 };
      map[name].orders++;
      map[name].lastOrder = Math.max(map[name].lastOrder, o.createdAt || 0);
    });
    return Object.values(map).map(c => ({
      name: c.name,
      orders: c.orders,
      lastOrder: c.lastOrder ? new Date(c.lastOrder).toLocaleDateString("en-IN") : "-",
      loyalty: c.orders >= 10 ? "Platinum" : c.orders >= 5 ? "Gold" : c.orders >= 2 ? "Silver" : "New"
    })).sort((a, b) => b.orders - a.orders);
  })();

  // (isOrderPendingPayment relocated above)

  const filteredOrders = orders.filter(o => isOrderMatchingDateFilter(o, timeFilter));

  const selectedDateTotalSales = filteredOrders.reduce((acc, o) => {
    const val = parseOrderPrice(o);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const handleDownloadCSV = () => {
    if (!filteredOrders || !filteredOrders.length) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Order ID,Items,Type,Amount (Rs)\n";

    filteredOrders.forEach(o => {
      const amt = parseOrderPrice(o);
      const amtStr = isNaN(amt) ? "0.00" : amt.toFixed(2);
      const idStr = o.orderId || (o.id && o.id.startsWith("#") ? o.id : `#${o.id ? o.id.slice(-6).toUpperCase() : "LIVE"}`);
      const itemName = (o.item || (Array.isArray(o.items) ? o.items.map(it => `${it.name || it.item} x${it.quantity || 1}`).join(" | ") : "Chai Selection")).replace(/,/g, " ");
      const typeStr = o.isOffline || o.walkIn ? "Offline / Counter" : "Online";

      csvContent += `${idStr},${itemName},${typeStr},${amtStr}\n`;
    });

    csvContent += `,,,Total: Rs ${selectedDateTotalSales.toFixed(2)}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = timeFilter === "Daily" ? "Today" : timeFilter;
    link.setAttribute("download", `Sales_Report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalOrdersCount = filteredOrders.length;
  const completedOrdersCount = filteredOrders.filter(o => o.status === "Delivered" || o.status === "Completed").length;
  const activeBrewingCount = filteredOrders.filter(o => o.status === "Preparing").length;
  const awaitingBrewCount = filteredOrders.filter(o => o.status === "Received" || o.status === "Pending").length;
  const readyDeliveryCount = filteredOrders.filter(o => o.status === "Ready" || o.status === "Out for Delivery" || o.status === "Shipped").length;
  const offlineOrdersCount = filteredOrders.filter(o => Boolean(o.isOffline || o.walkIn)).length;
  const onlineOrdersCount = totalOrdersCount - offlineOrdersCount;

  const statsSummary = {
    totalOrders: `${totalOrdersCount}`,
    activeBrewing: `${activeBrewingCount}`,
    awaitingBrew: `${awaitingBrewCount}`,
    readyDelivery: `${readyDeliveryCount}`,
    offlineOrders: `${offlineOrdersCount}`,
    completedOrders: `${completedOrdersCount}`,
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

  // Today's settlements — dynamically derived from today's orders
  const todaySettlements = (() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = orders.filter(o => (o.createdAt || 0) >= todayStart.getTime() && o.status !== "Cancelled" && o.status !== "Cancelled by User" && o.status !== "Refunded");
    const itemMap = {};
    todayOrders.forEach(o => {
      const key = o.item || "Chai Selection";
      if (!itemMap[key]) itemMap[key] = { count: 0, value: 0 };
      itemMap[key].count++;
      const val = parseOrderPrice(o);
      itemMap[key].value += isNaN(val) ? 0 : val;
    });
    return Object.entries(itemMap).map(([k, v]) => ({
      item: `${k} (${v.count} units)`,
      value: `₹${v.value.toLocaleString("en-IN")}`
    }));
  })();

  const historyOrders = orders.map((o, idx) => {
    const customizations = [];
    if (o.sugar) customizations.push(`Sugar: ${o.sugar}`);
    if (o.milk) customizations.push(`Milk: ${o.milk}`);
    if (o.addons && o.addons !== "None") customizations.push(`Add-ons: ${o.addons}`);

    return {
      id: o.orderId || (o.id && o.id.startsWith("#") ? o.id : `#${o.id ? o.id.replace("CHAI-ORD-", "").slice(-6).toUpperCase() : (idx + 1001)}`),
      originalId: o.id,
      customer: o.customer || (o.address?.firstName ? `${o.address.firstName} ${o.address.lastName || ''}`.trim() : (o.walkIn ? "Counter Walk-in Customer" : "Corporate Desk Partner")),
      status: o.status || "Received",
      date: o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "Just now"),
      createdAt: o.createdAt || 0,
      total: formatOrderTotal(o),
      numericTotal: parseOrderPrice(o),
      items: o.item || (Array.isArray(o.items) ? o.items.map(it => `${it.name || it.item} x${it.quantity || 1}`).join(", ") : "Chai Selection"),
      itemsList: Array.isArray(o.items) ? o.items : [],
      customization: customizations.join(", ") || (o.walkIn ? "Fresh Counter Brew" : "Standard Recipe"),
      office: o.office || o.address || (o.walkIn ? "Counter Pickup" : "Desk Delivery"),
      phone: o.phone || (typeof o.address === "object" ? o.address?.phone : "") || "",
      isOffline: Boolean(o.isOffline || o.walkIn),
      walkIn: Boolean(o.walkIn),
      paymentMethod: o.paymentMethod || (o.isOffline || o.walkIn ? "Cash" : "Online UPI"),
      paymentStatus: o.paymentStatus || "Paid",
      image: o.img || o.image || (Array.isArray(o.items) && o.items[0]?.image) || "/logo.png",
      rawOrder: o
    };
  });

  // Products & Menu items — fetched from Firebase
  const [menuItems, setMenuItems] = useState([]);
  const [menuSubTab, setMenuSubTab] = useState("live");
  const [combos, setCombos] = useState([]);

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
  const [historyViewMode, setHistoryViewMode] = useState("list");
  const [historyDateFilter, setHistoryDateFilter] = useState("all");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Feedback list — fetched from Firebase
  const [feedbackList, setFeedbackList] = useState([]);

  // Settings & Working Hours
  const [workingHours, setWorkingHours] = useState("8:00 AM - 6:00 PM");
  const [shopName, setShopName] = useState("Chai Chaska Jaipur HQ");
  const [brewmasterName, setBrewmasterName] = useState("Chai Maker");
  const [brewmasterContact, setBrewmasterContact] = useState("+91 98765 43210");
  const [brewmasterBio, setBrewmasterBio] = useState("Specialist in traditional spice infusions, kulhad brewing, and custom spice blends with 6+ years of corporate hospitality experience.");

  // Brewmaster Identity & Leave System
  const [brewmasters, setBrewmasters] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedBmDetails, setSelectedBmDetails] = useState(null);
  const [leaveStart, setLeaveStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [leaveEnd, setLeaveEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [selectedLeaveType, setSelectedLeaveType] = useState("Casual Leave");
  const [newLeaveReason, setNewLeaveReason] = useState("");
  const [leaveRequests, setLeaveRequests] = useState([]);

  const notifications = [
    ...orders
      .filter(o => o.status === "Received" || o.status === "Pending" || o.status === "Preparing")
      .map(o => ({ id: o.id, text: `Order ${o.id} - ${o.item}`, time: o.date })),
    ...stocks
      .filter(s => (parseFloat(s.qty) || 0) <= (s.minLimit || 10))
      .map(s => ({ id: `low-stock-${s.id}`, text: `Low Stock: ${s.name} (${s.qty} ${s.unit} left)`, time: "Now" })),
    ...restockRequests
      .map((r, i) => ({ id: r.id || `restock-${i}`, text: `Restock Req: ${r.item} (${r.qty})`, time: r.date || "New" })),
    ...leaveRequests
      .filter(l => l.status === "Pending" || l.status === "Pending Approval")
      .map((l, i) => ({ id: l.id || `leave-${i}`, text: `Leave: ${l.startDate || l.start} to ${l.endDate || l.end}`, time: "New" }))
  ].filter(n => !readNotifications.includes(n.id));

  // Realtime Incoming Alert states
  const [incomingOrder, setIncomingOrder] = useState(null);
  const audioRef = useRef(null);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const [timeTick, setTimeTick] = useState(0);

  // Initialize ringtone audio instance and unlock autoplay on user gesture
  useEffect(() => {
    if (typeof window !== "undefined") {
      const audio = new Audio("/ringtone.mp3");
      audio.loop = true;
      audio.preload = "auto";
      audioRef.current = audio;

      const unlockAudio = () => {
        if (audioRef.current) {
          audioRef.current.play().then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsAudioUnlocked(true);
          }).catch(() => { });
        }
        window.removeEventListener("click", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
      };

      window.addEventListener("click", unlockAudio, { once: true });
      window.addEventListener("keydown", unlockAudio, { once: true });

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        window.removeEventListener("click", unlockAudio);
        window.removeEventListener("keydown", unlockAudio);
      };
    }
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChange((user) => {
      if (user) {
        if (user.email === "rohitsengar02@gmail.com") {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
          localStorage.removeItem("brewmaster_logged");
          router.push("/");
        }
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem("brewmaster_logged");
      }
    });

    let prevOrderIds = null;
    const unsubOrders = onOrdersSnapshot((data) => {
      const currentPending = data.filter(o => o.status === "Received" || o.status === "Pending");
      if (prevOrderIds !== null) {
        const newOrders = currentPending.filter(o => !prevOrderIds.includes(o.id));
        if (newOrders.length > 0) {
          const newest = newOrders[0];
          // Only trigger ringing alert & popup modal for real-time online customer orders placed in last 10 mins
          const isOfflineOrder = Boolean(newest.isOffline || newest.walkIn || newest.offlineAdded);
          const isRecent = newest.createdAt && (Date.now() - newest.createdAt < 10 * 60 * 1000);
          if (!isOfflineOrder && isRecent) {
            setIncomingOrder(newest);
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch((err) => {
                console.warn("Autoplay audio blocked or pending user interaction:", err);
              });
            }
            setToastMsg(`🚨 New Online Order #${newest.id ? (typeof newest.id === "string" ? newest.id.slice(-4) : newest.id) : ""}!`);
            setTimeout(() => setToastMsg(""), 6000);
          }
        }
      }
      prevOrderIds = data.map(o => o.id);
      setOrders(data);
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
    const unsubProducts = onProductsSnapshot((data) => setProductsList(data));
    const unsubProfile = onProfileSettingsSnapshot((data) => {
      if (data) {
        if (data.brewmasterName) setBrewmasterName(data.brewmasterName);
        if (data.brewmasterContact) setBrewmasterContact(data.brewmasterContact);
        if (data.brewmasterBio) setBrewmasterBio(data.brewmasterBio);
        if (data.shopName) setShopName(data.shopName);
        if (data.workingHours) setWorkingHours(data.workingHours);
      }
    });
    const unsubBrew = onBrewmastersSnapshot((data) => {
      setBrewmasters(data);
      setSelectedEmployeeId((prevId) => {
        const activeId = prevId || (data.length > 0 ? data[0].employeeId : "");
        const matched = data.find((b) => b.employeeId === activeId) || (data.length > 0 ? data[0] : null);
        setSelectedBmDetails(matched);
        return activeId;
      });
    });
    getMenuItems().then(setMenuItems);
    getCombos().then(setCombos);
    getRestockHistory().then(setRestockHistory);
    getFeedback().then(setFeedbackList);

    return () => {
      unsubOrders();
      unsubStock();
      unsubRestock();
      unsubLeave();
      unsubBrew();
      unsubProfile();
      unsubProducts();
      unsubAuth();
    };
  }, [router]);

  // WhatsApp Direct Redirect Helper (Auto-takes customer phone entered during order; shows 'No number found' if absent)
  const resolveOrderPhone = (order) => {
    if (!order) return "";
    const candidates = [
      order.phone,
      order.customerPhone,
      order.userPhone,
      order.mobile,
      order.phoneNumber,
      order.contactPhone,
      typeof order.address === "object" ? (order.address?.phone || order.address?.mobile || order.address?.phoneNumber) : "",
      typeof order.user === "object" ? (order.user?.phone || order.user?.phoneNumber) : "",
    ];
    for (const raw of candidates) {
      if (raw && typeof raw === "string") {
        const trimmed = raw.trim();
        if (trimmed && trimmed !== "N/A" && trimmed !== "Walk-in" && trimmed !== "null" && trimmed !== "undefined" && trimmed !== "-" && trimmed !== "none") {
          let digits = trimmed.replace(/\D/g, "");
          if (digits.length === 11 && digits.startsWith("0")) {
            digits = digits.substring(1);
          }
          if (digits.length === 12 && digits.startsWith("91")) {
            return digits;
          }
          if (digits.length === 10) {
            return "91" + digits;
          }
          if (digits.length > 10) {
            return digits;
          }
        }
      }
    }
    return "";
  };

  const sendWhatsAppRedirect = (order) => {
    if (!order) return;
    const cleanPhone = resolveOrderPhone(order);

    // If no customer phone number was provided during order placement
    if (!cleanPhone) {
      setToastMsg("❌ Customer phone number not found on this order!");
      setTimeout(() => setToastMsg(""), 3500);
      return;
    }

    const cleanId = order.orderId || (order.id ? (typeof order.id === 'string' ? order.id.slice(-6).toUpperCase() : order.id) : "LIVE");
    const customer = order.customer || (order.address?.firstName ? `${order.address.firstName} ${order.address.lastName || ''}`.trim() : "Customer");
    const status = order.status || "Received";
    const items = order.item || (Array.isArray(order.items) ? order.items.map(i => `${i.name || i.item} x${i.quantity || 1}`).join(", ") : "Chai & Snacks");
    const total = typeof order.total === "string" && order.total.includes("₹") ? order.total : `₹${order.total || order.price || order.priceNum || 0}`;
    const location = order.office || order.address || (order.walkIn ? "Counter Pickup" : "Desk Delivery");
    const timeEst = order.allocatedTime ? `⏱️ *Est. Prep/Delivery Time:* ${order.allocatedTime}\n` : "";

    let statusLine = "🫖 *Status:* Received (Order queued for brewing)";
    if (status === "Preparing") {
      statusLine = "🔥 *Status:* Preparing & Brewing Fresh in Kitchen";
    } else if (status === "Out for Delivery" || status === "Ready" || status === "Shipped") {
      statusLine = "🚀 *Status:* Out for Delivery / Ready for Pickup";
    } else if (status === "Delivered" || status === "Completed") {
      statusLine = "✅ *Status:* Delivered & Completed";
    } else if (status === "Cancelled" || status === "Cancelled by User") {
      statusLine = "❌ *Status:* Order Cancelled";
    }

    const msg =
      `☕ *CHAI CHASKA — ORDER UPDATE* ☕

Hello *${customer}*! 👋
Your order status has been updated:

${statusLine}
📋 *Order ID:* #${cleanId}
📦 *Items:* ${items}
💰 *Total Amount:* ${total}
📍 *Destination:* ${location}
${timeEst}
Enjoy your freshly brewed Chai Chaska! ☕✨`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

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

    const envEmail = process.env.NEXT_PUBLIC_BREWMASTER_EMAIL || "[EMAIL_ADDRESS]";
    const envPass = process.env.NEXT_PUBLIC_BREWMASTER_PASSWORD || "brewmaster@123";

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

  const startAlertRinging = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.warn("Audio alert autoplay blocked:", err);
      });
    }
  };

  const stopAlertRinging = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const triggerMockOrderAlert = () => {
    const mockOrderObj = {
      id: `#CC-${Math.floor(1000 + Math.random() * 9000)}`,
      item: "Kesar Elaichi Special Chai x2",
      customer: "Amit Sharma",
      customerName: "Amit Sharma",
      office: "Office 305, Block C",
      floor: "3rd Floor",
      phone: "+91 98765 43210",
      sugar: "Mild Sugar",
      milk: "Fresh Dairy Milk",
      total: "Counter Order",
      price: "Counter Order",
      priority: "Desk Hot Delivery",
      paymentMethod: "Cash on Delivery",
      paymentStatus: "COD",
      items: [
        { name: "Kesar Elaichi Special Chai", quantity: 2, sugar: "Mild Sugar", milk: "Fresh Dairy Milk" }
      ],
      createdAt: Date.now()
    };
    setIncomingOrder(mockOrderObj);
    startAlertRinging();
  };

  const testAudioAlert = () => {
    triggerMockOrderAlert();
  };

  const acceptOrderAlert = async () => {
    stopAlertRinging();
    if (incomingOrder && incomingOrder.id && !String(incomingOrder.id).startsWith("#CC-")) {
      try {
        await updateOrder(incomingOrder.id, { status: "Preparing" });
      } catch (err) {
        console.error("Error accepting order:", err);
      }
    }
    setIncomingOrder(null);
  };

  const rejectOrderAlert = async () => {
    stopAlertRinging();
    if (incomingOrder && incomingOrder.id && !String(incomingOrder.id).startsWith("#CC-")) {
      try {
        await updateOrder(incomingOrder.id, { status: "Cancelled" });
      } catch (err) {
        console.error("Error rejecting order:", err);
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
    } catch (err) {
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
          <img src={getProductMeta(o.item || (Array.isArray(o.items) && o.items[0]?.name), o.img || o.image).image} alt={o.item} className="queue-card-thumbnail" />

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
            {(o.status === "Shipped" || o.status === "In Transit" || o.status === "Out for Delivery" || o.status === "Ready") && (
              <button
                onClick={() => {
                  const updates = { status: "Delivered" };
                  if (Boolean(o.isOffline || o.walkIn) && (!o.paymentMethod || o.paymentMethod === "Pending Selection")) {
                    updates.paymentMethod = "Cash";
                    updates.paymentStatus = "Paid";
                  }
                  updateOrder(o.id, updates);
                }}
                style={{ background: "#27ae60", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
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

  const toggleDeliveryDate = async (sub, dateStr) => {
    try {
      const currentDates = sub.deliveredDates || [];
      let newDates;
      if (currentDates.includes(dateStr)) {
        newDates = currentDates.filter(d => d !== dateStr);
      } else {
        newDates = [...currentDates, dateStr];
      }
      await updateSubscription(sub.id, { deliveredDates: newDates });
      setToastMsg(`Delivery status updated for ${dateStr}`);
      setTimeout(() => setToastMsg(""), 2000);
    } catch (err) {
      setToastMsg(`Error updating delivery status: ${err.message}`);
      setTimeout(() => setToastMsg(""), 3000);
    }
  };

  const generateDateRange = (startDateStr, endDateStr) => {
    const parseDate = (dStr) => {
      if (!dStr) return null;
      const parts = dStr.split("/");
      if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
      return new Date(dStr);
    };

    let start = parseDate(startDateStr);
    if (!start || isNaN(start)) {
      start = new Date();
      start.setDate(1);
    }

    let end = parseDate(endDateStr);
    if (!end || isNaN(end)) {
      end = new Date();
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    const dates = [];
    let current = new Date(start);
    let limit = 0;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    while (current <= end && limit < 60) {
      const day = String(current.getDate()).padStart(2, '0');
      const monthStr = months[current.getMonth()];
      const year = current.getFullYear();
      const formattedDate = `${day} ${monthStr} ${year}`;

      dates.push(formattedDate);
      current.setDate(current.getDate() + 1);
      limit++;
    }
    return dates;
  };

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

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{ background: "#09090b", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", color: "#ffffff", fontWeight: "bold" }}>Loading Dashboard...</div>;
  }

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", color: "#09090b", fontFamily: "var(--font-body)", overflowX: "hidden" }}>

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
          <aside className={`dashboard-sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}>
            <div className="sidebar-logo">
              <img src="/logo.png" alt="Chai Chaska Logo" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "50%" }} />
            </div>

            <div className="sidebar-menu">
              <button onClick={() => setActiveTab("dashboard")} className={`menu-icon-btn ${activeTab === "dashboard" ? "active" : ""}`}>
                <span className="btn-emoji">📊</span> Dashboard
              </button>
              <button onClick={() => setActiveTab("offline")} className={`menu-icon-btn ${activeTab === "offline" ? "active" : ""}`}>
                <span className="btn-emoji">🏪</span> Offline Orders
              </button>
              <button onClick={() => setActiveTab("queue")} className={`menu-icon-btn ${activeTab === "queue" ? "active" : ""}`}>
                <span className="btn-emoji">📥</span> Order Queue
              </button>
              <button onClick={() => setActiveTab("stock")} className={`menu-icon-btn ${activeTab === "stock" ? "active" : ""}`}>
                <span className="btn-emoji">📦</span> Inventory
              </button>
              <button onClick={() => setActiveTab("history")} className={`menu-icon-btn ${activeTab === "history" ? "active" : ""}`}>
                <span className="btn-emoji">📜</span> Order History
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

          {/* MODERN LUXURY MOBILE BOTTOM NAVBAR */}
          <nav className="brewmaster-mobile-bottom-bar" aria-label="Mobile Navigation">
            <button
              type="button"
              onClick={() => { setActiveTab("dashboard"); setIsMobileMoreDrawerOpen(false); }}
              className={`mob-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            >
              <div className="mob-nav-icon-wrap">
                <span className="mob-nav-emoji">📊</span>
              </div>
              <span className="mob-nav-label">Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("queue"); setIsMobileMoreDrawerOpen(false); }}
              className={`mob-nav-item ${activeTab === "queue" ? "active" : ""}`}
            >
              <div className="mob-nav-icon-wrap">
                <span className="mob-nav-emoji">📥</span>
                {unhandledNewOrdersCount > 0 && (
                  <span className="mob-nav-badge-pill">{unhandledNewOrdersCount}</span>
                )}
              </div>
              <span className="mob-nav-label">Orders</span>
            </button>

            {/* Center Floating + Button */}
            <div className="mob-nav-center-wrap">
              <button
                type="button"
                onClick={() => setIsMobileMoreDrawerOpen(!isMobileMoreDrawerOpen)}
                className={`mob-nav-center-btn ${isMobileMoreDrawerOpen ? "open" : ""}`}
                title="Brewmaster Shortcuts & Menu"
              >
                <span className="mob-nav-plus-icon">+</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setActiveTab("offline"); setIsMobileMoreDrawerOpen(false); }}
              className={`mob-nav-item ${activeTab === "offline" ? "active" : ""}`}
            >
              <div className="mob-nav-icon-wrap">
                <span className="mob-nav-emoji">🏪</span>
              </div>
              <span className="mob-nav-label">Shop / POS</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("profile"); setIsMobileMoreDrawerOpen(false); }}
              className={`mob-nav-item ${activeTab === "profile" ? "active" : ""}`}
            >
              <div className="mob-nav-icon-wrap">
                <span className="mob-nav-emoji">⚙️</span>
              </div>
              <span className="mob-nav-label">Profile</span>
            </button>
          </nav>

          {/* BOTTOM SLIDER / DRAWER (POPUP SHORTCUTS AS IN BREWMASTER SIDEBAR) */}
          <div
            className={`mob-drawer-backdrop ${isMobileMoreDrawerOpen ? "open" : ""}`}
            onClick={() => setIsMobileMoreDrawerOpen(false)}
          >
            <div
              className={`mob-drawer-sheet ${isMobileMoreDrawerOpen ? "open" : ""}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Drag Bar Indicator */}
              <div className="mob-drawer-drag-handle" />

              {/* Drawer Header */}
              <div className="mob-drawer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>☕</span>
                  <div>
                    <h3 className="mob-drawer-title">Brewmaster Menu</h3>
                    <p className="mob-drawer-sub">Quick action shortcuts & controls</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMoreDrawerOpen(false)}
                  className="mob-drawer-close-btn"
                >
                  ✕
                </button>
              </div>

              {/* Grid of all Brewmaster Sidebar Actions */}
              <div className="mob-drawer-grid">
                <button
                  type="button"
                  onClick={() => { setActiveTab("queue"); setIsMobileMoreDrawerOpen(false); }}
                  className={`mob-drawer-card ${activeTab === "queue" ? "active" : ""}`}
                >
                  <div className="mob-drawer-card-icon" style={{ background: '#fef3c7', color: '#d97706' }}>📥</div>
                  <div className="mob-drawer-card-info">
                    <strong>Live Queue</strong>
                    <span>Orders & tickets</span>
                  </div>
                  {unhandledNewOrdersCount > 0 && (
                    <span className="mob-drawer-card-badge">{unhandledNewOrdersCount} new</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setIsOfflineItemModalOpen(true); setIsMobileMoreDrawerOpen(false); }}
                  className="mob-drawer-card"
                >
                  <div className="mob-drawer-card-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>➕</div>
                  <div className="mob-drawer-card-info">
                    <strong>New Walk-in</strong>
                    <span>Quick POS billing</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("offline"); setIsMobileMoreDrawerOpen(false); }}
                  className={`mob-drawer-card ${activeTab === "offline" ? "active" : ""}`}
                >
                  <div className="mob-drawer-card-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>🏪</div>
                  <div className="mob-drawer-card-info">
                    <strong>Offline Counter</strong>
                    <span>Store sales record</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("dashboard"); setIsMobileMoreDrawerOpen(false); }}
                  className={`mob-drawer-card ${activeTab === "dashboard" ? "active" : ""}`}
                >
                  <div className="mob-drawer-card-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>📊</div>
                  <div className="mob-drawer-card-info">
                    <strong>Dashboard</strong>
                    <span>Metrics & charts</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setShowTodayStatsSidebar(true); setIsMobileMoreDrawerOpen(false); }}
                  className="mob-drawer-card"
                >
                  <div className="mob-drawer-card-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>📋</div>
                  <div className="mob-drawer-card-info">
                    <strong>Today's Tally</strong>
                    <span>Item & cup totals</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("stock"); setIsMobileMoreDrawerOpen(false); }}
                  className={`mob-drawer-card ${activeTab === "stock" ? "active" : ""}`}
                >
                  <div className="mob-drawer-card-icon" style={{ background: '#f1f5f9', color: '#475569' }}>📦</div>
                  <div className="mob-drawer-card-info">
                    <strong>Inventory</strong>
                    <span>Tea, milk, supplies</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("history"); setIsMobileMoreDrawerOpen(false); }}
                  className={`mob-drawer-card ${activeTab === "history" ? "active" : ""}`}
                >
                  <div className="mob-drawer-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>📜</div>
                  <div className="mob-drawer-card-info">
                    <strong>Order History</strong>
                    <span>Past dispatched logs</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("leave"); setIsMobileMoreDrawerOpen(false); }}
                  className={`mob-drawer-card ${activeTab === "leave" ? "active" : ""}`}
                >
                  <div className="mob-drawer-card-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>🚪</div>
                  <div className="mob-drawer-card-info">
                    <strong>Leave & Shift</strong>
                    <span>Shift management</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab("profile"); setIsMobileMoreDrawerOpen(false); }}
                  className={`mob-drawer-card ${activeTab === "profile" ? "active" : ""}`}
                >
                  <div className="mob-drawer-card-icon" style={{ background: '#f8fafc', color: '#0f172a' }}>⚙️</div>
                  <div className="mob-drawer-card-info">
                    <strong>Profile & Store</strong>
                    <span>Settings & status</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setIsMobileMoreDrawerOpen(false); handleLogout(); }}
                  className="mob-drawer-card logout"
                >
                  <div className="mob-drawer-card-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>🔌</div>
                  <div className="mob-drawer-card-info">
                    <strong>Disconnect</strong>
                    <span>Logout operator</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

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
              <div className="header-left-wrap" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  className="mobile-menu-btn"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  style={{ background: "transparent", border: "none", fontSize: "24px", cursor: "pointer", display: "none" }}
                >
                  ☰
                </button>
                <div>
                  <span className="welcome-label">Welcome!</span>
                  <h1 className="operator-title">{brewmasterName}</h1>
                </div>
              </div>

              <div className="header-search-box-wrap">
                <span className="search-icon-new">🔍</span>
                <input type="text" placeholder="Search Here" className="search-input-new" />
              </div>

              <div className="header-actions-wrap" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {/* Today's Orders / Tally Header Trigger Button */}
                <button
                  className="btn-today-orders-header"
                  onClick={() => setShowTodayStatsSidebar(true)}
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#ffffff",
                    border: "none",
                    padding: "9px 16px",
                    borderRadius: "20px",
                    fontWeight: "800",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    boxShadow: "0 2px 8px rgba(217, 119, 6, 0.35)",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span style={{ fontSize: "14px" }}>📊</span> Today's Orders & Tally
                </button>

                <button
                  className="btn-pending-requests"
                  onClick={() => setShowPendingSidebar(!showPendingSidebar)}
                  style={{
                    background: "#18181b",
                    color: "#ffffff",
                    border: "1px solid #27272a",
                    padding: "9px 16px",
                    borderRadius: "20px",
                    fontWeight: "bold",
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                  }}
                >
                  <span style={{ display: "inline-block" }}>📋</span> Pending ({pendingSidebarOrders.length})
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
                  src="/logo.png"
                  alt="Profile"
                  className="profile-avatar-new"
                  onClick={() => setActiveTab("profile")}
                  style={{ cursor: "pointer" }}
                />
              </div>
            </header>

            {/* TAB CONTENT: DASHBOARD (LIVE METRICS & REAL-TIME FILTERING) */}
            {activeTab === "dashboard" && (() => {
              // Dynamic Calculations based on active filteredOrders
              const validOrders = filteredOrders.filter(o => o.status !== "Cancelled" && o.status !== "Cancelled by User" && o.status !== "Refunded");
              const totalOrdersCount = validOrders.length;
              const deliveredOrdersCount = validOrders.filter(o => o.status === "Delivered" || o.status === "Completed").length;
              const receivedOrdersCount = validOrders.filter(o => o.status === "Received" || o.status === "Pending").length;
              const preparingOrdersCount = validOrders.filter(o => o.status === "Preparing").length;
              const deliveryOrdersCount = validOrders.filter(o => o.status === "Out for Delivery" || o.status === "Ready" || o.status === "Shipped").length;
              const offlineOrdersCount = validOrders.filter(o => Boolean(o.isOffline || o.walkIn)).length;
              const onlineOrdersCount = totalOrdersCount - offlineOrdersCount;
              const totalSalesVal = validOrders.reduce((acc, o) => acc + parseOrderPrice(o), 0);

              // Top items calculation matching filtered orders
              const itemCounts = {};
              validOrders.forEach(o => {
                if (Array.isArray(o.items) && o.items.length > 0) {
                  o.items.forEach(it => {
                    const name = it.name || it.item || "Chai";
                    const qty = parseInt(it.quantity || it.qty) || 1;
                    itemCounts[name] = (itemCounts[name] || 0) + qty;
                  });
                } else if (o.item) {
                  const match = o.item.match(/(.*?)\s*x\s*(\d+)/i);
                  const name = match ? match[1].trim() : o.item.trim();
                  const qty = match ? parseInt(match[2]) : 1;
                  itemCounts[name] = (itemCounts[name] || 0) + (qty || 1);
                }
              });
              const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);

              return (
                <div className="tab-body-wrapper dashboard-tab-body" style={{ minHeight: "100vh" }}>

                  {/* METRICS HEADER & TIME FILTER */}
                  <div className="dashboard-metrics-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#2c1b0d" }}>Dashboard Live Metrics</h2>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#777" }}>Live Firestore real-time data and order analytics.</p>
                    </div>
                    <div className="dashboard-time-filter-wrap" style={{ display: "flex", gap: "6px", alignItems: "center", background: "#ffffff", padding: "4px 8px", borderRadius: "10px", border: "1px solid #eaeaea", boxShadow: "0 2px 6px rgba(0,0,0,0.03)", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12px", color: "#888", fontWeight: "600", marginRight: "4px" }}>Filter:</span>
                      {[
                        { id: "All", label: "All Time" },
                        { id: "Daily", label: "Today" },
                        { id: "Weekly", label: "This Week" },
                        { id: "Monthly", label: "This Month" }
                      ].map(tf => (
                        <button
                          key={tf.id}
                          type="button"
                          onClick={() => setTimeFilter(tf.id)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: timeFilter === tf.id ? "#2c1b0d" : "transparent",
                            color: timeFilter === tf.id ? "#ffffff" : "#666",
                            fontWeight: timeFilter === tf.id ? "bold" : "normal",
                            fontSize: "12px",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {tf.label}
                        </button>
                      ))}
                      <div style={{ width: "1px", height: "20px", background: "#ddd", margin: "0 4px" }}></div>
                      <input
                        type="date"
                        value={(typeof timeFilter === 'string' && timeFilter.match(/^\d{4}-\d{2}-\d{2}$/)) ? timeFilter : ""}
                        onChange={(e) => setTimeFilter(e.target.value || "All")}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #ddd",
                          fontSize: "12px",
                          color: "#333",
                          cursor: "pointer",
                          outline: "none"
                        }}
                      />
                      {(typeof timeFilter === 'string' && timeFilter.match(/^\d{4}-\d{2}-\d{2}$/)) && (
                        <button
                          type="button"
                          onClick={() => setTimeFilter("All")}
                          style={{
                            border: "none",
                            background: "#fee2e2",
                            color: "#ef4444",
                            borderRadius: "50%",
                            width: "20px",
                            height: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            cursor: "pointer",
                            fontWeight: "bold",
                            padding: 0
                          }}
                          title="Clear date filter"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* TOP ROW: SUMMARY CARDS (SIDE-BY-SIDE RESPONSIVE GRID) */}
                  <div className="dashboard-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px", width: "100%", boxSizing: "border-box" }}>
                    {[
                      { label: "Total Orders", value: `${totalOrdersCount}`, icon: "🧾", color: "#e8f5e9", text: "#2e7d32" },
                      { label: "Pending Orders", value: `${receivedOrdersCount + preparingOrdersCount}`, icon: "⏳", color: "#fff3e0", text: "#ef6c00", modal: "pending" },
                      { label: "Offline Orders", value: `${offlineOrdersCount}`, icon: "🏪", color: "#fff3e0", text: "#ef6c00", modal: "offline" },
                      { label: "Online Orders", value: `${onlineOrdersCount}`, icon: "🌐", color: "#e3f2fd", text: "#1565c0" },
                      { label: "Shipping Orders", value: `${deliveryOrdersCount}`, icon: "🚚", color: "#e3f2fd", text: "#1565c0" },
                      { label: "Completed Orders", value: `${deliveredOrdersCount}`, icon: "✅", color: "#e8f5e9", text: "#2e7d32" },
                      { label: "Total Sales", value: `₹${totalSalesVal.toLocaleString()}`, icon: "💰", color: "#e8f5e9", text: "#2e7d32" }
                    ].map((card, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (card.modal === "pending") setActiveStatsModal("pending");
                          if (card.modal === "offline") setActiveStatsModal("offline");
                        }}
                        style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          padding: "16px",
                          border: "1px solid #eaeaea",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                          cursor: card.modal ? "pointer" : "default"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ background: card.color, width: "40px", height: "40px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{card.icon}</div>
                          <span style={{ fontSize: "14px", fontWeight: "600", color: "#555" }}>{card.label}</span>
                        </div>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#222" }}>{card.value}</div>
                      </div>
                    ))}
                  </div>


                  {/* LIVE FILTERED SALES REPORT TABLE */}
                  <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #eaeaea", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", marginBottom: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#2c1b0d" }}>
                          Sales & Orders Report: <span style={{ color: "#c2410c" }}>{timeFilter === "All" ? "All Time" : timeFilter === "Daily" ? "Today" : timeFilter === "Weekly" ? "This Week (Last 7 Days)" : timeFilter === "Monthly" ? "This Month" : new Date(timeFilter).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </h3>
                        <span style={{ fontSize: "12px", color: "#71717a" }}>Showing {validOrders.length} {validOrders.length === 1 ? "order" : "orders"} matching active filter</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ background: "#f4f4f5", color: "#09090b", padding: "6px 14px", borderRadius: "8px", fontWeight: "700", fontSize: "13px" }}>
                          🏪 {offlineOrdersCount} Offline • 🌐 {onlineOrdersCount} Online
                        </div>
                        <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px" }}>
                          Total: ₹{totalSalesVal.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                        <thead>
                          <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee", textAlign: "left" }}>
                            <th style={{ padding: "12px", fontSize: "13px", color: "#666", fontWeight: "700" }}>Order ID</th>
                            <th style={{ padding: "12px", fontSize: "13px", color: "#666", fontWeight: "700" }}>Items</th>
                            <th style={{ padding: "12px", fontSize: "13px", color: "#666", fontWeight: "700" }}>Date & Time</th>
                            <th style={{ padding: "12px", fontSize: "13px", color: "#666", fontWeight: "700" }}>Type</th>
                            <th style={{ padding: "12px", fontSize: "13px", color: "#666", fontWeight: "700" }}>Status</th>
                            <th style={{ padding: "12px", fontSize: "13px", color: "#666", fontWeight: "700", textAlign: "right" }}>Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validOrders.length > 0 ? validOrders.map((o) => {
                            const rawAmt = o.total || o.price || o.amount || 0;
                            const amt = typeof rawAmt === "string" ? parseFloat(rawAmt.replace(/[^\d\.]/g, "")) : parseFloat(rawAmt);
                            const amtStr = isNaN(amt) ? "0.00" : amt.toFixed(2);
                            const idStr = o.orderId || (o.id && o.id.startsWith("#") ? o.id : `#${o.id ? o.id.slice(-6).toUpperCase() : "LIVE"}`);
                            const itemName = o.item || (Array.isArray(o.items) ? o.items.map(it => `${it.name || it.item} x${it.quantity || 1}`).join(", ") : "Chai Selection");
                            const isOff = Boolean(o.isOffline || o.walkIn);
                            const dateDisplay = o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : "Today");

                            return (
                              <tr key={o.id} style={{ borderBottom: "1px solid #eee" }}>
                                <td style={{ padding: "12px", fontSize: "14px", fontWeight: "600", color: "#2c1b0d" }}>{idStr}</td>
                                <td style={{ padding: "12px", fontSize: "14px", color: "#444" }}>{itemName}</td>
                                <td style={{ padding: "12px", fontSize: "13px", color: "#666" }}>{dateDisplay}</td>
                                <td style={{ padding: "12px", fontSize: "13px" }}>
                                  <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", background: isOff ? "#09090b" : "#e2e8f0", color: isOff ? "#ffffff" : "#09090b" }}>
                                    {isOff ? "🏪 Offline / Counter" : "🌐 Online"}
                                  </span>
                                </td>
                                <td style={{ padding: "12px", fontSize: "13px" }}>
                                  <span style={{
                                    padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700",
                                    background: o.status === "Delivered" || o.status === "Completed" ? "#dcfce7" : o.status === "Preparing" ? "#dbeafe" : "#ffedd5",
                                    color: o.status === "Delivered" || o.status === "Completed" ? "#166534" : o.status === "Preparing" ? "#1e40af" : "#9a3412"
                                  }}>
                                    {o.status || "Received"}
                                  </span>
                                </td>
                                <td style={{ padding: "12px", fontSize: "14px", fontWeight: "700", color: "#2e7d32", textAlign: "right" }}>₹{amtStr}</td>
                              </tr>
                            );
                          }) : (
                            <tr>
                              <td colSpan="6" style={{ padding: "28px", textAlign: "center", color: "#888", fontSize: "14px" }}>
                                No sales/orders found for this selected filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* MIDDLE ROW: SPLIT COLUMNS (SIDE-BY-SIDE ON DESKTOP) */}
                  <div className="dashboard-split-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px", marginBottom: "24px", width: "100%", boxSizing: "border-box" }}>

                    {/* LEFT: High Demanding Products */}
                    <div style={{ background: "#ffffff", borderRadius: "12px", padding: "20px", border: "1px solid #eaeaea", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#222" }}>High Demanding Products</h3>
                        <span style={{ color: "#888", cursor: "pointer" }}>•••</span>
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #eaeaea", color: "#888", fontSize: "13px" }}>
                            <th style={{ paddingBottom: "10px" }}>Product</th>
                            <th style={{ paddingBottom: "10px" }}>Sales</th>
                            <th style={{ paddingBottom: "10px" }}>Trend</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedItems.slice(0, 5).map((item, i) => {
                            const name = item[0];
                            const qty = item[1];
                            const icon = name.toLowerCase().includes("chai") || name.toLowerCase().includes("tea") ? "☕" : name.toLowerCase().includes("coffee") ? "🍵" : "🥤";
                            const category = name.toLowerCase().includes("chai") || name.toLowerCase().includes("tea") ? "Chai" : name.toLowerCase().includes("coffee") ? "Coffee" : "Beverage";
                            return (
                              <tr key={i} style={{ borderBottom: i !== 4 ? "1px solid #f5f5f5" : "none" }}>
                                <td style={{ padding: "12px 0", display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div style={{ background: "#f8f9fa", width: "36px", height: "36px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{icon}</div>
                                  <div>
                                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{name.split(" x")[0]}</div>
                                    <div style={{ fontSize: "12px", color: "#888" }}>{category}</div>
                                  </div>
                                </td>
                                <td style={{ padding: "12px 0", fontSize: "14px", color: "#333", fontWeight: "500" }}>{qty} sold</td>
                                <td style={{ padding: "12px 0" }}>
                                  <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: "20px" }}>
                                    <div style={{ width: "4px", height: "40%", background: "#1565c0", borderRadius: "2px" }}></div>
                                    <div style={{ width: "4px", height: "60%", background: "#1565c0", borderRadius: "2px" }}></div>
                                    <div style={{ width: "4px", height: "100%", background: "#1565c0", borderRadius: "2px" }}></div>
                                    <div style={{ width: "4px", height: "80%", background: "#1565c0", borderRadius: "2px" }}></div>
                                    <div style={{ width: "4px", height: "50%", background: "#e0e0e0", borderRadius: "2px" }}></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {sortedItems.length === 0 && (
                            <tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No products sold yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* RIGHT: Pending Orders (Matching Admin with Channel instead of Amount) */}
                    <div style={{ background: "#ffffff", borderRadius: "12px", padding: "20px", border: "1px solid #eaeaea", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#222" }}>Pending Orders</h3>
                        <span style={{ color: "#8a583c", cursor: "pointer", fontSize: "12px", fontWeight: "600" }} onClick={() => setActiveTab("queue")}>View Queue →</span>
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #eaeaea", color: "#888" }}>
                              <th style={{ paddingBottom: "10px" }}>Order ID</th>
                              <th style={{ paddingBottom: "10px" }}>Customer Name</th>
                              <th style={{ paddingBottom: "10px" }}>Channel</th>
                              <th style={{ paddingBottom: "10px" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.filter(o => o.status === "Pending" || o.status === "Received" || o.status === "Preparing" || o.status === "Out for Delivery").slice(0, 8).map((o, i, arr) => {
                              const isOffline = Boolean(o.isOffline || o.walkIn);
                              return (
                                <tr key={o.id} style={{ borderBottom: i !== arr.length - 1 ? "1px solid #f5f5f5" : "none" }}>
                                  <td style={{ padding: "12px 0", fontWeight: "700", color: "#8a583c" }}>{o.orderId || o.id}</td>
                                  <td style={{ padding: "12px 0", color: "#444", fontWeight: "500" }}>{o.customer || (o.address?.firstName ? `${o.address.firstName} ${o.address.lastName || ''}`.trim() : (isOffline ? "Walk-in" : "Guest"))}</td>
                                  <td style={{ padding: "12px 0" }}>
                                    {isOffline ? (
                                      <span style={{ background: "#fff3e0", color: "#ef6c00", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                                        🏪 Counter Order
                                      </span>
                                    ) : (
                                      <span style={{ background: "#e3f2fd", color: "#1565c0", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                                        🏢 {o.office || "Desk Delivery"}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: "12px 0" }}>
                                    <span style={{
                                      padding: "4px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold",
                                      background: o.status === "Pending" || o.status === "Received" ? "#fff3e0" : o.status === "Preparing" ? "#e3f2fd" : "#e8f5e9",
                                      color: o.status === "Pending" || o.status === "Received" ? "#ef6c00" : o.status === "Preparing" ? "#1565c0" : "#2e7d32"
                                    }}>
                                      {o.status || "Received"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {orders.filter(o => o.status === "Pending" || o.status === "Received" || o.status === "Preparing" || o.status === "Out for Delivery").length === 0 && (
                              <tr>
                                <td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#999", fontStyle: "italic" }}>
                                  No pending orders right now.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ROW: INVENTORY ALERTS (MATCHING ADMIN) */}
                  <div style={{ background: "#ffffff", borderRadius: "12px", padding: "20px", border: "1px solid #eaeaea", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: 0, color: "#222" }}>Inventory Alerts</h3>
                      <span style={{ color: "#888", cursor: "pointer" }}>•••</span>
                    </div>
                    <div style={{ maxHeight: "350px", overflowY: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                        <thead style={{ position: "sticky", top: 0, background: "#f8f9fa", zIndex: 1 }}>
                          <tr style={{ color: "#555" }}>
                            <th style={{ padding: "12px", borderRadius: "6px 0 0 6px" }}>Product Name</th>
                            <th style={{ padding: "12px" }}>Current Stock</th>
                            <th style={{ padding: "12px" }}>Alert Status</th>
                            <th style={{ padding: "12px", borderRadius: "0 6px 6px 0", textAlign: "right" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stocks.filter(s => (parseFloat(s.qty) || 0) <= (s.minLimit || 10)).map((s, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                              <td style={{ padding: "12px", display: "flex", alignItems: "center", gap: "10px", color: "#333", fontWeight: "500" }}>
                                <div style={{ background: "#f8f9fa", width: "28px", height: "28px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>📦</div>
                                {s.name}
                              </td>
                              <td style={{ padding: "12px", color: "#555" }}>{s.qty} {s.unit || ""}</td>
                              <td style={{ padding: "12px" }}>
                                <span style={{ color: "#c62828", fontWeight: "600" }}>
                                  Low Stock
                                </span>
                              </td>
                              <td style={{ padding: "12px", textAlign: "right" }}>
                                <button onClick={() => setActiveTab("stock")} style={{ padding: "6px 12px", border: "1px solid #eaeaea", background: "#ffffff", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", color: "#555" }}>
                                  Reorder
                                </button>
                              </td>
                            </tr>
                          ))}
                          {stocks.filter(s => (parseFloat(s.qty) || 0) <= (s.minLimit || 10)).length === 0 && (
                            <tr>
                              <td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#888" }}>No low stock alerts!</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB: ORDER QUEUE */}
            {activeTab === "queue" && (() => {
              const activeQueueOrders = orders.filter(o => {
                if (o.priority === "Subscription" || o.status === "Cancelled" || o.status === "Cancelled by User" || o.status === "Refunded") return false;
                if (queueDateFilter && queueDateFilter !== "all" && queueDateFilter !== "All") {
                  return isOrderMatchingDateFilter(o, queueDateFilter);
                }
                return true;
              });
              const receivedCount = activeQueueOrders.filter(o => (o.status || "Received") === "Received").length;
              const prepCount = activeQueueOrders.filter(o => o.status === "Preparing" || o.status === "Pending").length;
              const outCount = activeQueueOrders.filter(o => o.status === "Out for Delivery" || o.status === "Shipped").length;
              const offlineQueueCount = activeQueueOrders.filter(o => o.isOffline || o.walkIn).length;
              const onlineQueueCount = activeQueueOrders.filter(o => !o.isOffline && !o.walkIn).length;
              const queueTotalValue = activeQueueOrders.reduce((sum, o) => sum + parseOrderPrice(o), 0);

              const uniqueLocations = Array.from(
                new Set(
                  activeQueueOrders
                    .map(o => o.office || (typeof o.address === "string" ? o.address : o.address?.city || o.address?.address1))
                    .filter(Boolean)
                )
              );

              const filteredQueueOrders = activeQueueOrders.filter(o => {
                // 1. Status Filter
                if (queueStatusFilter !== "all") {
                  const st = (o.status || "Received").toLowerCase();
                  const targetSt = queueStatusFilter.toLowerCase();
                  if (targetSt === "received") {
                    if (st !== "received" && st !== "pending") return false;
                  } else if (targetSt === "preparing") {
                    if (st !== "preparing") return false;
                  } else if (targetSt === "out for delivery") {
                    if (st !== "out for delivery" && st !== "ready" && st !== "shipped") return false;
                  } else if (targetSt === "delivered") {
                    if (st !== "delivered" && st !== "completed") return false;
                  } else if (targetSt === "cancelled") {
                    if (st !== "cancelled" && st !== "cancelled by user" && st !== "refunded") return false;
                  } else {
                    if (st !== targetSt) return false;
                  }
                }

                // 2. Channel Filter
                if (queueChannelFilter !== "all") {
                  const isOffline = o.isOffline || o.walkIn;
                  if (queueChannelFilter === "Counter" && !isOffline) return false;
                  if (queueChannelFilter === "Online" && isOffline) return false;
                }

                // 3. Location Filter
                if (queueLocationFilter !== "all") {
                  const loc = String(o.office || (typeof o.address === "string" ? o.address : o.address?.city || o.address?.address1 || "")).toLowerCase();
                  if (!loc.includes(queueLocationFilter.toLowerCase())) return false;
                }

                // 4. Search Filter
                if (queueSearchTerm && queueSearchTerm.trim() !== "") {
                  const term = queueSearchTerm.toLowerCase().trim();
                  const idStr = String(o.orderId || o.id || "").toLowerCase();
                  const custStr = String(o.customer || (o.address?.firstName ? `${o.address.firstName} ${o.address.lastName || ''}` : "")).toLowerCase();
                  const phoneStr = String(o.phone || o.mobile || o.address?.phone || "").toLowerCase();
                  const itemStr = String(o.item || (Array.isArray(o.items) ? o.items.map(it => it.name || it.item).join(" ") : "")).toLowerCase();
                  const offStr = String(o.office || (typeof o.address === "string" ? o.address : o.address?.address1 || "")).toLowerCase();
                  if (!idStr.includes(term) && !custStr.includes(term) && !phoneStr.includes(term) && !itemStr.includes(term) && !offStr.includes(term)) {
                    return false;
                  }
                }

                return true;
              }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

              const isAllSelected = filteredQueueOrders.length > 0 && filteredQueueOrders.every(o => selectedQueueItemIds.includes(o.id));
              const toggleSelectAll = () => {
                if (isAllSelected) {
                  setSelectedQueueItemIds([]);
                } else {
                  setSelectedQueueItemIds(filteredQueueOrders.map(o => o.id));
                }
              };

              const toggleSelectItem = (id, e) => {
                if (e) e.stopPropagation();
                setSelectedQueueItemIds(prev => 
                  prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                );
              };

              return (
                <div className="tab-body-wrapper" style={{ padding: "24px 28px" }}>
                  {/* Top Queue Stats Header (Carousel on Mobile) */}
                  <div className="queue-stats-carousel-wrapper">
                    {/* Stat Card 1: Total Orders */}
                    <div className="queue-stat-card">
                      <div className="queue-stat-icon-wrap">
                        <span style={{ fontSize: '18px' }}>👥</span>
                      </div>
                      <div className="queue-stat-content">
                        <div className="queue-stat-top-row">
                          <span className="queue-stat-title">Total Orders</span>
                          <span className="queue-stat-trend up">▲ 18.6%</span>
                        </div>
                        <div className="queue-stat-value">{activeQueueOrders.length}</div>
                        <span className="queue-stat-sub">Live Active Queue</span>
                      </div>
                    </div>

                    {/* Stat Card 2: Received / New */}
                    <div className="queue-stat-card">
                      <div className="queue-stat-icon-wrap">
                        <span style={{ fontSize: '18px' }}>📥</span>
                      </div>
                      <div className="queue-stat-content">
                        <div className="queue-stat-top-row">
                          <span className="queue-stat-title">Received / New</span>
                          <span className="queue-stat-trend up">▲ 12.4%</span>
                        </div>
                        <div className="queue-stat-value">{receivedCount}</div>
                        <span className="queue-stat-sub">Awaiting Prep</span>
                      </div>
                    </div>

                    {/* Stat Card 3: In Brewing / Prep */}
                    <div className="queue-stat-card">
                      <div className="queue-stat-icon-wrap">
                        <span style={{ fontSize: '18px' }}>🔥</span>
                      </div>
                      <div className="queue-stat-content">
                        <div className="queue-stat-top-row">
                          <span className="queue-stat-title">On Live Stove</span>
                          <span className="queue-stat-trend up">▲ 8.2%</span>
                        </div>
                        <div className="queue-stat-value">{prepCount}</div>
                        <span className="queue-stat-sub">In Brewing / Prep</span>
                      </div>
                    </div>

                    {/* Stat Card 4: Out for Delivery */}
                    <div className="queue-stat-card">
                      <div className="queue-stat-icon-wrap">
                        <span style={{ fontSize: '18px' }}>🏃</span>
                      </div>
                      <div className="queue-stat-content">
                        <div className="queue-stat-top-row">
                          <span className="queue-stat-title">Out for Delivery</span>
                          <span className="queue-stat-trend up">▲ 15.7%</span>
                        </div>
                        <div className="queue-stat-value">{outCount}</div>
                        <span className="queue-stat-sub">Delivering to Desk</span>
                      </div>
                    </div>

                    {/* Stat Card 5: Total Value */}
                    <div className="queue-stat-card">
                      <div className="queue-stat-icon-wrap">
                        <span style={{ fontSize: '18px' }}>💰</span>
                      </div>
                      <div className="queue-stat-content">
                        <div className="queue-stat-top-row">
                          <span className="queue-stat-title">Queue Value</span>
                          <span className="queue-stat-trend up">▲ Live</span>
                        </div>
                        <div className="queue-stat-value">₹{queueTotalValue.toLocaleString('en-IN')}</div>
                        <span className="queue-stat-sub">Active Total</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter & Action Controls Bar */}
                  <div className="queue-filter-card">
                    <div className="queue-filter-grid">
                      {/* 1. Search */}
                      <div className="queue-filter-col">
                        <label className="queue-filter-label">Search</label>
                        <div className="queue-input-wrapper">
                          <span className="queue-input-icon">🔍</span>
                          <input
                            type="text"
                            placeholder="Orders, customer, phone..."
                            value={queueSearchTerm}
                            onChange={(e) => setQueueSearchTerm(e.target.value)}
                            className="queue-search-input"
                          />
                          {queueSearchTerm && (
                            <button
                              type="button"
                              onClick={() => setQueueSearchTerm("")}
                              className="queue-clear-search-btn"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 2. Status */}
                      <div className="queue-filter-col">
                        <label className="queue-filter-label">Status</label>
                        <select
                          value={queueStatusFilter}
                          onChange={(e) => setQueueStatusFilter(e.target.value)}
                          className="queue-select-input"
                        >
                          <option value="all">All Status</option>
                          <option value="Received">Received</option>
                          <option value="Preparing">Preparing</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      {/* 3. Channel / Type */}
                      <div className="queue-filter-col">
                        <label className="queue-filter-label">Channel</label>
                        <select
                          value={queueChannelFilter}
                          onChange={(e) => setQueueChannelFilter(e.target.value)}
                          className="queue-select-input"
                        >
                          <option value="all">All Types</option>
                          <option value="Counter">Counter Walk-in</option>
                          <option value="Online">Online Desk</option>
                        </select>
                      </div>

                      {/* 4. Location */}
                      <div className="queue-filter-col">
                        <label className="queue-filter-label">Location</label>
                        <select
                          value={queueLocationFilter}
                          onChange={(e) => setQueueLocationFilter(e.target.value)}
                          className="queue-select-input"
                        >
                          <option value="all">All Locations</option>
                          {uniqueLocations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right-aligned Actions */}
                    <div className="queue-actions-group">
                      <div className="queue-date-picker-wrap" title="Filter Queue by Date">
                        <span className="queue-date-picker-icon">📅</span>
                        <input
                          type="date"
                          value={queueDateFilter === "all" || queueDateFilter === "All" ? "" : queueDateFilter}
                          onChange={(e) => setQueueDateFilter(e.target.value || "all")}
                          className="queue-calendar-input"
                          title="Pick date to filter orders"
                        />
                        {queueDateFilter !== "all" && queueDateFilter !== "All" && (
                          <button
                            type="button"
                            onClick={() => setQueueDateFilter("all")}
                            className="queue-clear-date-btn"
                            title="Clear date filter (Show all dates)"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsOfflineItemModalOpen(true)}
                        className="queue-add-btn"
                        title="Add in-store counter walk-in order"
                      >
                        <span style={{ fontSize: '15px', fontWeight: '900' }}>+</span> Add Order
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTodayStatsSidebar(true)}
                        className="queue-refresh-btn"
                        title="Today's Orders & Product Tally"
                      >
                        📊
                      </button>
                    </div>
                  </div>

                  {/* Modern Clean Orders Table Container */}
                  <div className="queue-table-card">
                    <div className="queue-table-scroll">
                      <table className="queue-modern-table">
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={toggleSelectAll}
                                className="queue-checkbox"
                                title="Select All"
                              />
                            </th>
                            <th>Customer & ID</th>
                            <th>Contact</th>
                            <th>Items Ordered</th>
                            <th style={{ textAlign: 'center' }}>Qty</th>
                            <th>Elapsed Time</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Location</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredQueueOrders.length === 0 ? (
                            <tr>
                              <td colSpan="10" style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                                <strong style={{ fontSize: '15px', color: '#1e293b' }}>No orders found matching filters</strong>
                                <p style={{ fontSize: '12px', margin: '4px 0 0', color: '#94a3b8' }}>Try resetting your search, status, or channel filters</p>
                              </td>
                            </tr>
                          ) : (
                            filteredQueueOrders.map((o) => {
                              const priceFormatted = formatOrderTotal(o);
                              const isOfflineOrder = Boolean(o.isOffline || o.walkIn);
                              const customerName = o.customer || (o.address?.firstName ? `${o.address.firstName} ${o.address.lastName || ''}`.trim() : (isOfflineOrder ? "Counter Guest" : "Customer"));
                              const orderIdFormatted = o.orderId || (o.id && o.id.length > 8 ? `#${o.id.slice(-6).toUpperCase()}` : o.id);
                              const phoneFormatted = o.phone || o.mobile || o.address?.phone || (isOfflineOrder ? "In-Store Walk-in" : "+91 98765 43210");
                              const locationFormatted = o.office || (typeof o.address === "string" ? o.address : o.address?.city || o.address?.address1 || (isOfflineOrder ? "Counter Pickup" : "Desk Delivery"));
                              const isSelected = selectedQueueItemIds.includes(o.id);

                              // Items calculation
                              const totalQty = Array.isArray(o.items) && o.items.length > 0
                                ? o.items.reduce((acc, it) => acc + (parseInt(it.quantity || it.qty) || 1), 0)
                                : (parseInt(o.quantity) || 1);
                              
                              const itemsSummary = Array.isArray(o.items) && o.items.length > 0
                                ? o.items.map(it => `${it.name || it.item} x${it.quantity || 1}`).join(", ")
                                : (o.item || "Chai Selection");

                              const firstItemName = Array.isArray(o.items) && o.items.length > 0 ? (o.items[0]?.name || o.items[0]?.item) : o.item;
                              const productMeta = getProductMeta(firstItemName, o.image || o.img);

                              // Status styles & pill dot
                              const currentStatus = o.status || "Received";
                              const getStatusPill = (st) => {
                                switch (st) {
                                  case "Preparing":
                                    return { bg: "#e0f2fe", text: "#0369a1", dot: "#0284c7", border: "#bae6fd" };
                                  case "Out for Delivery":
                                  case "Ready":
                                    return { bg: "#f3e8ff", text: "#7e22ce", dot: "#9333ea", border: "#e9d5ff" };
                                  case "Delivered":
                                    return { bg: "#dcfce7", text: "#15803d", dot: "#16a34a", border: "#bbf7d0" };
                                  case "Cancelled":
                                  case "Cancelled by User":
                                    return { bg: "#fee2e2", text: "#b91c1c", dot: "#dc2626", border: "#fecaca" };
                                  default:
                                    return { bg: "#fef3c7", text: "#92400e", dot: "#d97706", border: "#fde68a" };
                                }
                              };
                              const pill = getStatusPill(currentStatus);
                              const isNewOrderAwaitingPrep = (currentStatus === "Received" || currentStatus === "Pending");

                              return (
                                <tr
                                  key={o.id}
                                  className={`queue-table-row ${isSelected ? 'row-selected' : ''} ${isNewOrderAwaitingPrep ? 'new-order-received-glow' : ''}`}
                                  onClick={() => {
                                    setSelectedQueueOrder(o);
                                    setDeliveryTimeInput(o.allocatedTime || "");
                                    setQueueDeliveryPaymentMethod(o.paymentMethod || "Cash");
                                    setQueueDeliveryPaymentStatus(o.paymentStatus || (o.paymentMethod === "Pending Selection" ? "Pending" : "Paid"));
                                    setIsQueueSidebarOpen(true);
                                  }}
                                >
                                  {/* 1. Checkbox */}
                                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => toggleSelectItem(o.id, e)}
                                      className="queue-checkbox"
                                    />
                                  </td>

                                  {/* 2. Customer & ID */}
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <img
                                        src={productMeta.image}
                                        alt={customerName}
                                        className="queue-customer-avatar"
                                      />
                                      <div>
                                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                          {customerName}
                                          {isNewOrderAwaitingPrep && (
                                            <span className="new-order-badge-pulse">🔔 NEW ORDER</span>
                                          )}
                                          <span className={`queue-channel-pill ${isOfflineOrder ? 'counter' : 'online'}`}>
                                            {isOfflineOrder ? "🏪 Counter" : "🌐 Online"}
                                          </span>
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: '700', marginTop: '2px' }}>
                                          {orderIdFormatted}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* 3. Contact & Payment Info */}
                                  <td>
                                    <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '12.5px' }}>
                                      {phoneFormatted}
                                    </div>
                                    <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                      {(() => {
                                        const pm = o.paymentMethod || (isOfflineOrder ? "Cash" : "Online UPI");
                                        const ps = o.paymentStatus || (pm === "Corporate Due" || pm === "Pending Selection" ? "Pending" : "Paid");
                                        const isPending = ps === "Pending" || pm === "Corporate Due" || pm === "Pending Selection";
                                        
                                        let icon = "💵";
                                        let label = pm;
                                        if (pm.toLowerCase().includes("upi") || pm.toLowerCase().includes("online")) {
                                          icon = "📱";
                                          label = pm.includes("UPI") ? "UPI" : pm;
                                        } else if (pm.toLowerCase().includes("card") || pm.toLowerCase().includes("pos")) {
                                          icon = "💳";
                                          label = "Card";
                                        } else if (pm.toLowerCase().includes("due") || pm.toLowerCase().includes("pending")) {
                                          icon = "⏳";
                                          label = "Due";
                                        } else if (pm.toLowerCase().includes("cash")) {
                                          icon = "💵";
                                          label = "Cash";
                                        }

                                        return (
                                          <span
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                              fontSize: '11px',
                                              fontWeight: '600',
                                              padding: '2px 7px',
                                              borderRadius: '4px',
                                              background: isPending ? '#fef3c7' : '#ecfdf5',
                                              color: isPending ? '#b45309' : '#047857',
                                              border: `1px solid ${isPending ? '#fde68a' : '#a7f3d0'}`
                                            }}
                                            title={`Payment: ${pm} (${ps})`}
                                          >
                                            <span>{icon}</span>
                                            <span>{label}</span>
                                            <span style={{ fontSize: '9.5px', opacity: 0.85 }}>• {isPending ? 'Pending' : 'Paid'}</span>
                                          </span>
                                        );
                                      })()}
                                    </div>
                                  </td>

                                  {/* 4. Items Ordered */}
                                  <td>
                                    <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '12.5px', maxWidth: '240px', lineHeight: '1.35' }}>
                                      {itemsSummary}
                                    </div>
                                    {(o.sugar || o.milk) && (
                                      <div style={{ fontSize: '10.5px', color: '#8a583c', marginTop: '2px', fontWeight: '700' }}>
                                        {o.sugar ? `Sugar: ${o.sugar}` : ''} {o.milk ? `• Milk: ${o.milk}` : ''}
                                      </div>
                                    )}
                                  </td>

                                  {/* 5. Qty */}
                                  <td style={{ textAlign: 'center' }}>
                                    <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '13px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                                      {totalQty}
                                    </span>
                                  </td>

                                  {/* 6. Elapsed Time */}
                                  <td>
                                    <span className="queue-time-badge">
                                      ⏱️ {(() => {
                                        const diffMs = Date.now() - (o.createdAt || Date.now());
                                        const diffMins = Math.floor(diffMs / 60000);
                                        if (diffMins < 60) return `${diffMins}m ago`;
                                        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
                                        return new Date(o.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' });
                                      })()}
                                    </span>
                                  </td>

                                  {/* 7. Amount */}
                                  <td>
                                    <strong style={{ fontSize: '14.5px', color: '#15803d', fontWeight: '900' }}>
                                      {priceFormatted}
                                    </strong>
                                  </td>

                                  {/* 8. Direct Status Dropdown (Matches Image Pill) */}
                                  <td onClick={(e) => e.stopPropagation()}>
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                      <select
                                        value={currentStatus}
                                        onChange={(e) => updateOrderStatusDirectly(o, e.target.value, e)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="queue-status-dropdown"
                                        style={{
                                          background: pill.bg,
                                          color: pill.text,
                                          borderColor: pill.border
                                        }}
                                        title="Click to update order status directly"
                                      >
                                        <option value="Received">● Received</option>
                                        <option value="Preparing">● Preparing</option>
                                        <option value="Out for Delivery">● On Delivery</option>
                                        <option value="Delivered">● Delivered</option>
                                        <option value="Cancelled">● Cancelled</option>
                                      </select>
                                    </div>
                                  </td>

                                  {/* 9. Location */}
                                  <td>
                                    <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      📍 {locationFormatted}
                                    </div>
                                  </td>

                                  {/* 10. Actions */}
                                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                      <button
                                        type="button"
                                        onClick={(e) => handleOpenEditOrderModal(o, e)}
                                        className="queue-edit-btn"
                                        title="Add / Remove items or edit quantities in this order"
                                      >
                                        ✏️ Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedQueueOrder(o);
                                          setDeliveryTimeInput(o.allocatedTime || "");
                                          setQueueDeliveryPaymentMethod(o.paymentMethod || "Cash");
                                          setQueueDeliveryPaymentStatus(o.paymentStatus || (o.paymentMethod === "Pending Selection" ? "Pending" : "Paid"));
                                          setIsQueueSidebarOpen(true);
                                        }}
                                        className="queue-view-btn"
                                        title="View full order details sidebar"
                                      >
                                        ⋮
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* MOBILE ORDER CARDS VIEW (Visible only on mobile screen) */}
                  <div className="queue-mobile-cards-container">
                    {filteredQueueOrders.length === 0 ? (
                      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '32px 16px', textAlign: 'center', color: '#64748b', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '28px', marginBottom: '6px' }}>📭</div>
                        <strong style={{ fontSize: '14px', color: '#1e293b' }}>No orders found</strong>
                        <p style={{ fontSize: '12px', margin: '4px 0 0', color: '#94a3b8' }}>Try clearing your filters</p>
                      </div>
                    ) : (
                      filteredQueueOrders.map((o) => {
                        const priceFormatted = formatOrderTotal(o);
                        const isOfflineOrder = Boolean(o.isOffline || o.walkIn);
                        const customerName = o.customer || (o.address?.firstName ? `${o.address.firstName} ${o.address.lastName || ''}`.trim() : (isOfflineOrder ? "Counter Guest" : "Customer"));
                        const orderIdFormatted = o.orderId || (o.id && o.id.length > 8 ? `#${o.id.slice(-6).toUpperCase()}` : o.id);
                        const phoneFormatted = o.phone || o.mobile || o.address?.phone || (isOfflineOrder ? "In-Store Walk-in" : "+91 98765 43210");
                        const locationFormatted = o.office || (typeof o.address === "string" ? o.address : o.address?.city || o.address?.address1 || (isOfflineOrder ? "Counter Pickup" : "Desk Delivery"));
                        
                        const totalQty = Array.isArray(o.items) && o.items.length > 0
                          ? o.items.reduce((acc, it) => acc + (parseInt(it.quantity || it.qty) || 1), 0)
                          : (parseInt(o.quantity) || 1);
                        
                        const itemsSummary = Array.isArray(o.items) && o.items.length > 0
                          ? o.items.map(it => `${it.name || it.item} x${it.quantity || 1}`).join(", ")
                          : (o.item || "Chai Selection");

                        const firstItemName = Array.isArray(o.items) && o.items.length > 0 ? (o.items[0]?.name || o.items[0]?.item) : o.item;
                        const productMeta = getProductMeta(firstItemName, o.image || o.img);

                        const currentStatus = o.status || "Received";
                        const getStatusPill = (st) => {
                          switch (st) {
                            case "Preparing":
                              return { bg: "#e0f2fe", text: "#0369a1", dot: "#0284c7", border: "#bae6fd" };
                            case "Out for Delivery":
                            case "Ready":
                              return { bg: "#f3e8ff", text: "#7e22ce", dot: "#9333ea", border: "#e9d5ff" };
                            case "Delivered":
                              return { bg: "#dcfce7", text: "#15803d", dot: "#16a34a", border: "#bbf7d0" };
                            case "Cancelled":
                            case "Cancelled by User":
                              return { bg: "#fee2e2", text: "#b91c1c", dot: "#dc2626", border: "#fecaca" };
                            default:
                              return { bg: "#fef3c7", text: "#92400e", dot: "#d97706", border: "#fde68a" };
                          }
                        };
                        const pill = getStatusPill(currentStatus);
                        const isNewOrderAwaitingPrep = (currentStatus === "Received" || currentStatus === "Pending");

                        return (
                          <div
                            key={`mob-${o.id}`}
                            className={`queue-mobile-order-card ${isNewOrderAwaitingPrep ? 'new-order-received-glow' : ''}`}
                            onClick={() => {
                              setSelectedQueueOrder(o);
                              setDeliveryTimeInput(o.allocatedTime || "");
                              setQueueDeliveryPaymentMethod(o.paymentMethod || "Cash");
                              setQueueDeliveryPaymentStatus(o.paymentStatus || (o.paymentMethod === "Pending Selection" ? "Pending" : "Paid"));
                              setIsQueueSidebarOpen(true);
                            }}
                          >
                            {/* Header: Avatar, Name, ID, Price & Time */}
                            <div className="mob-card-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                <img
                                  src={productMeta.image}
                                  alt={customerName}
                                  className="mob-card-avatar"
                                />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customerName}</span>
                                    {isNewOrderAwaitingPrep && (
                                      <span className="new-order-badge-pulse">🔔 NEW ORDER</span>
                                    )}
                                    <span className={`queue-channel-pill ${isOfflineOrder ? 'counter' : 'online'}`}>
                                      {isOfflineOrder ? "🏪 Counter" : "🌐 Online"}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginTop: '1px' }}>
                                    {orderIdFormatted}
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '15px', color: '#16a34a', fontWeight: '900' }}>
                                  {priceFormatted}
                                </div>
                                <span className="queue-time-badge" style={{ fontSize: '10px', padding: '2px 5px' }}>
                                  ⏱️ {(() => {
                                    const diffMs = Date.now() - (o.createdAt || Date.now());
                                    const diffMins = Math.floor(diffMs / 60000);
                                    if (diffMins < 60) return `${diffMins}m ago`;
                                    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
                                    return new Date(o.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' });
                                  })()}
                                </span>
                              </div>
                            </div>

                            {/* Items summary */}
                            <div className="mob-card-items-box">
                              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#1e293b', lineHeight: '1.3' }}>
                                {itemsSummary}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                                <span>📍 {locationFormatted}</span>
                                <span style={{ fontWeight: '800', background: '#e2e8f0', color: '#1e293b', padding: '1px 6px', borderRadius: '4px' }}>
                                  Qty: {totalQty}
                                </span>
                              </div>
                              {phoneFormatted && phoneFormatted !== "In-Store Walk-in" && (
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                  📞 {phoneFormatted}
                                </div>
                              )}
                            </div>

                            {/* Footer Actions: Direct Status Select + Edit Button */}
                            <div className="mob-card-footer" onClick={(e) => e.stopPropagation()}>
                              <div style={{ flex: 1 }}>
                                <select
                                  value={currentStatus}
                                  onChange={(e) => updateOrderStatusDirectly(o, e.target.value, e)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="queue-status-dropdown"
                                  style={{
                                    background: pill.bg,
                                    color: pill.text,
                                    borderColor: pill.border,
                                    width: '100%',
                                    textAlign: 'center',
                                    padding: '7px 10px',
                                    fontSize: '12px'
                                  }}
                                  title="Change status"
                                >
                                  <option value="Received">● Received</option>
                                  <option value="Preparing">● Preparing</option>
                                  <option value="Out for Delivery">● On Delivery</option>
                                  <option value="Delivered">● Delivered</option>
                                  <option value="Cancelled">● Cancelled</option>
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditOrderModal(o, e)}
                                className="queue-edit-btn"
                                style={{ padding: '7px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                                title="Edit Items"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* SLIDING SIDEBAR FOR ORDER DETAILS (MODERN, WIDE & IMAGE-RICH) */}
                  <div className={`queue-sidebar-overlay ${isQueueSidebarOpen ? "open" : ""}`} onClick={() => setIsQueueSidebarOpen(false)}></div>
                  <div className={`queue-sidebar-panel ${isQueueSidebarOpen ? "open" : ""}`}>
                    {selectedQueueOrder && (() => {
                      const isOffline = Boolean(selectedQueueOrder.isOffline || selectedQueueOrder.walkIn);
                      const orderDisplayId = selectedQueueOrder.orderId || (selectedQueueOrder.id ? (typeof selectedQueueOrder.id === "string" ? selectedQueueOrder.id.slice(-6).toUpperCase() : selectedQueueOrder.id) : "N/A");

                      // Normalize items array
                      const itemsList = Array.isArray(selectedQueueOrder.items) && selectedQueueOrder.items.length > 0
                        ? selectedQueueOrder.items
                        : [
                          {
                            name: selectedQueueOrder.item || "Chai Selection",
                            quantity: selectedQueueOrder.quantity || 1,
                            price: selectedQueueOrder.price || selectedQueueOrder.amount || selectedQueueOrder.total,
                            sugar: selectedQueueOrder.sugar,
                            milk: selectedQueueOrder.milk,
                            image: selectedQueueOrder.image || selectedQueueOrder.img
                          }
                        ];

                      const getStatusColor = (st) => {
                        switch (st) {
                          case "Preparing": return { bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc", dot: "#0284c7" };
                          case "Out for Delivery":
                          case "Ready": return { bg: "#f3e8ff", text: "#7e22ce", border: "#d8b4fe", dot: "#9333ea" };
                          case "Delivered": return { bg: "#dcfce7", text: "#15803d", border: "#86efac", dot: "#16a34a" };
                          case "Cancelled":
                          case "Cancelled by User": return { bg: "#fee2e2", text: "#b91c1c", border: "#fca5a5", dot: "#dc2626" };
                          default: return { bg: "#fef3c7", text: "#92400e", border: "#fcd34d", dot: "#d97706" };
                        }
                      };

                      const statusStyle = getStatusColor(selectedQueueOrder.status || "Received");

                      const handleStatusChange = (newStatus) => {
                        const updates = { status: newStatus };
                        if (isOffline && newStatus === "Delivered" && (!selectedQueueOrder.paymentMethod || selectedQueueOrder.paymentMethod === "Pending Selection")) {
                          updates.paymentMethod = queueDeliveryPaymentMethod || "Cash";
                          updates.paymentStatus = queueDeliveryPaymentStatus || "Paid";
                        }
                        setSelectedQueueOrder({ ...selectedQueueOrder, ...updates });
                        updateOrder(selectedQueueOrder.id, updates);
                        setToastMsg(`Status updated to ${newStatus}! WhatsApp update auto-sent.`);
                        setTimeout(() => setToastMsg(""), 3000);
                      };

                      return (
                        <div className="queue-sidebar-content-modern">
                          {/* SIDEBAR HEADER */}
                          <div className="modern-sidebar-header">
                            <div className="sidebar-header-title-box">
                              <div className="sidebar-order-pill">
                                <span className="channel-indicator">{isOffline ? "🏪 COUNTER" : "🌐 APP"}</span>
                                <span className="order-num">#{orderDisplayId}</span>
                              </div>
                              <span
                                className="order-status-pill-badge"
                                style={{
                                  background: statusStyle.bg,
                                  color: statusStyle.text,
                                  borderColor: statusStyle.border
                                }}
                              >
                                <span className="status-live-dot" style={{ background: statusStyle.dot }}></span>
                                {selectedQueueOrder.status || "Received"}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="sidebar-modern-close-btn"
                              onClick={() => setIsQueueSidebarOpen(false)}
                              title="Close Sidebar"
                            >
                              ✕
                            </button>
                          </div>

                          {/* ORDER META & TIME BANNER */}
                          <div className="sidebar-meta-card">
                            <div className="sidebar-meta-row">
                              <div className="sidebar-meta-item">
                                <span className="meta-label">Customer</span>
                                <span className="meta-value-bold">{selectedQueueOrder.customer || (isOffline ? "Walk-in Customer" : "App User")}</span>
                              </div>
                              <div className="sidebar-meta-item text-right">
                                <span className="meta-label">Phone</span>
                                <span className="meta-value">{selectedQueueOrder.phone || "N/A"}</span>
                              </div>
                            </div>
                            <div className="sidebar-meta-divider"></div>
                            <div className="sidebar-meta-row">
                              <div className="sidebar-meta-item">
                                <span className="meta-label">Delivery Destination</span>
                                <span className="meta-value-accent">
                                  📍 {selectedQueueOrder.office || selectedQueueOrder.address || (isOffline ? "Counter Fast Pickup" : "Desk Delivery")}
                                </span>
                              </div>
                              <div className="sidebar-meta-item text-right">
                                <span className="meta-label">Ordered Time</span>
                                <span className="meta-value-sub">
                                  {selectedQueueOrder.createdAt ? new Date(selectedQueueOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recent"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ORDERED ITEMS LIST WITH PRODUCT IMAGES */}
                          <div className="sidebar-section-card">
                            <div className="sidebar-section-header">
                              <h3 className="sidebar-section-title">
                                <span>☕</span> Items to Brew & Prepare
                              </h3>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="items-count-badge">{itemsList.length} {itemsList.length === 1 ? 'Item' : 'Items'}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenEditOrderModal(selectedQueueOrder, e)}
                                  style={{
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    border: "1px solid #fcd34d",
                                    borderRadius: "6px",
                                    padding: "3px 8px",
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "3px"
                                  }}
                                  title="Add or remove items in this order"
                                >
                                  ✏️ Edit Items
                                </button>
                              </div>
                            </div>

                            <div className="sidebar-items-list">
                              {itemsList.map((item, idx) => {
                                const itemName = item.name || item.item || "Chai Selection";
                                const itemQty = item.quantity || item.qty || 1;
                                const itemImg = item.image || item.img || selectedQueueOrder.image || selectedQueueOrder.img || "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop";
                                const itemSugar = item.sugar || selectedQueueOrder.sugar;
                                const itemMilk = item.milk || selectedQueueOrder.milk;
                                const itemNotes = item.notes || item.customizations || item.addons;

                                return (
                                  <div key={idx} className="sidebar-item-row">
                                    <div className="sidebar-item-img-wrap">
                                      <img
                                        src={itemImg}
                                        alt={itemName}
                                        className="sidebar-item-img"
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop";
                                        }}
                                      />
                                      <span className="sidebar-item-qty-badge">x{itemQty}</span>
                                    </div>

                                    <div className="sidebar-item-info">
                                      <div className="sidebar-item-title-row">
                                        <span className="sidebar-item-name">{itemName}</span>
                                        {item.price && (
                                          <span className="sidebar-item-price">
                                            ₹{typeof item.price === "number" ? item.price * itemQty : item.price}
                                          </span>
                                        )}
                                      </div>

                                      {/* PREFERENCES PILLS */}
                                      <div className="sidebar-item-pills">
                                        {itemSugar && (
                                          <span className="item-pill sugar-pill">
                                            🍬 {itemSugar}
                                          </span>
                                        )}
                                        {itemMilk && (
                                          <span className="item-pill milk-pill">
                                            🥛 {itemMilk}
                                          </span>
                                        )}
                                        {itemNotes && (
                                          <span className="item-pill notes-pill">
                                            ✨ {itemNotes}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* STATUS UPDATE ACTION PANEL */}
                          <div className="sidebar-section-card status-action-card">
                            <div className="sidebar-section-header">
                              <div>
                                <h3 className="sidebar-section-title">
                                  <span>⚡</span> Update Order Status
                                </h3>
                                <p className="sidebar-section-sub">Auto-triggers WhatsApp notifications & Tax Invoice PDF on delivery</p>
                              </div>
                              <span className="auto-whatsapp-tag">
                                💬 Auto WhatsApp
                              </span>
                            </div>

                            <div className="status-quick-grid">
                              {[
                                { key: "Received", label: "Received", icon: "📥", activeBg: "#fef3c7", activeColor: "#92400e" },
                                { key: "Preparing", label: "Brewing 🔥", icon: "🔥", activeBg: "#e0f2fe", activeColor: "#0369a1" },
                                { key: "Out for Delivery", label: "Out for Delivery", icon: "🏃", activeBg: "#f3e8ff", activeColor: "#7e22ce" },
                                { key: "Delivered", label: "Delivered", icon: "☕", activeBg: "#dcfce7", activeColor: "#15803d" },
                                { key: "Cancelled", label: "Cancelled", icon: "❌", activeBg: "#fee2e2", activeColor: "#b91c1c" }
                              ].map((st) => {
                                const isCurrent = (selectedQueueOrder.status || "Received") === st.key;
                                return (
                                  <button
                                    key={st.key}
                                    type="button"
                                    onClick={() => handleStatusChange(st.key)}
                                    className={`status-chip-btn ${isCurrent ? 'active' : ''}`}
                                    style={{
                                      borderColor: isCurrent ? st.activeColor : '#e2e8f0',
                                      background: isCurrent ? st.activeBg : '#ffffff',
                                      color: isCurrent ? st.activeColor : '#475569'
                                    }}
                                  >
                                    <span>{st.icon}</span> {st.label}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="sidebar-select-wrapper" style={{ marginTop: "12px" }}>
                              <select
                                className="sidebar-select modern"
                                value={selectedQueueOrder.status || "Received"}
                                onChange={(e) => handleStatusChange(e.target.value)}
                              >
                                <option value="Received">📥 Received (Pending)</option>
                                <option value="Preparing">🔥 Preparing / Brewing</option>
                                <option value="Out for Delivery">🏃 Out for Delivery / Ready</option>
                                <option value="Delivered">☕ Delivered / Served</option>
                                <option value="Cancelled">❌ Cancelled</option>
                              </select>
                            </div>
                          </div>

                          {/* PAYMENT SETTLEMENT CARD (OFFLINE vs ONLINE) */}
                          {!isOffline ? (
                            <div className="sidebar-section-card online-settled-card">
                              <div className="online-settled-flex">
                                <div className="online-settled-icon">🌐</div>
                                <div className="online-settled-text">
                                  <div className="online-settled-title">Online App Checkout</div>
                                  <div className="online-settled-desc">Payment settled through App / UPI gateway. No manual counter cash collection needed.</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="sidebar-section-card offline-settlement-card">
                              <div className="sidebar-section-header">
                                <div>
                                  <h3 className="sidebar-section-title">
                                    <span>🏪</span> Counter Settlement Method
                                  </h3>
                                  <p className="sidebar-section-sub">Collect payment at POS counter</p>
                                </div>
                                <span className={`payment-due-badge ${(selectedQueueOrder.paymentStatus || queueDeliveryPaymentStatus) === "Paid" ? "paid" : "pending"}`}>
                                  {((selectedQueueOrder.paymentStatus || queueDeliveryPaymentStatus) === "Pending" || (selectedQueueOrder.paymentMethod || queueDeliveryPaymentMethod) === "Corporate Due" || (selectedQueueOrder.paymentMethod || queueDeliveryPaymentMethod) === "Pending Selection") ? "⏳ Due / Pending" : "✅ Paid"}
                                </span>
                              </div>

                              <div className="payment-methods-grid">
                                {[
                                  { id: "Cash", label: "💵 Cash", status: "Paid" },
                                  { id: "Online UPI", label: "📱 Online UPI", status: "Paid" },
                                  { id: "Corporate Due", label: "⏳ Pending / Due", status: "Pending" },
                                  { id: "Card", label: "💳 Card / POS", status: "Paid" }
                                ].map((pm) => {
                                  const isSelected = (selectedQueueOrder.paymentMethod || queueDeliveryPaymentMethod) === pm.id;
                                  return (
                                    <button
                                      key={pm.id}
                                      type="button"
                                      onClick={() => {
                                        setQueueDeliveryPaymentMethod(pm.id);
                                        setQueueDeliveryPaymentStatus(pm.status);
                                        setSelectedQueueOrder(prev => prev ? { ...prev, paymentMethod: pm.id, paymentStatus: pm.status } : null);
                                        updateOrder(selectedQueueOrder.id, {
                                          paymentMethod: pm.id,
                                          paymentStatus: pm.status
                                        });
                                        setToastMsg(`Offline payment marked as ${pm.id}!`);
                                        setTimeout(() => setToastMsg(""), 2000);
                                      }}
                                      className={`payment-method-chip ${isSelected ? "selected" : ""}`}
                                    >
                                      {pm.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* PREPARATION & DELIVERY WINDOW */}
                          <div className="sidebar-section-card">
                            <h3 className="sidebar-section-title">
                              <span>⏱️</span> Preparation & Delivery Window
                            </h3>
                            <div className="quick-time-buttons">
                              {["10 mins", "15 mins", "20 mins", "30 mins"].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  className="quick-time-pill"
                                  onClick={() => setDeliveryTimeInput(t)}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                            <div className="delivery-time-input-row">
                              <input
                                type="text"
                                className="sidebar-input modern"
                                value={deliveryTimeInput}
                                onChange={(e) => setDeliveryTimeInput(e.target.value)}
                                placeholder="e.g. 15 mins"
                              />
                              <button
                                type="button"
                                className={`sidebar-save-btn modern ${saveAnimation ? "saved" : ""}`}
                                onClick={() => {
                                  const updatedStatus = selectedQueueOrder.status || "Received";
                                  const updates = {
                                    allocatedTime: deliveryTimeInput,
                                    status: updatedStatus
                                  };

                                  if (isOffline) {
                                    const paymentMethodToSave = queueDeliveryPaymentMethod || selectedQueueOrder.paymentMethod || "Cash";
                                    const paymentStatusToSave = queueDeliveryPaymentStatus || selectedQueueOrder.paymentStatus || (paymentMethodToSave === "Corporate Due" ? "Pending" : "Paid");
                                    updates.paymentMethod = paymentMethodToSave;
                                    updates.paymentStatus = paymentStatusToSave;
                                  }

                                  updateOrder(selectedQueueOrder.id, updates);

                                  if (selectedQueueOrder.userId || selectedQueueOrder.userId === undefined) {
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

                                  setToastMsg("Order details updated successfully!");
                                  setSaveAnimation(true);
                                  setTimeout(() => {
                                    setToastMsg("");
                                    setSaveAnimation(false);
                                  }, 2000);
                                }}
                              >
                                {saveAnimation ? (
                                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                      <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z" />
                                    </svg>
                                    Saved!
                                  </span>
                                ) : "Save Time"}
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </div>

                </div>
              );
            })()}

            {/* OTHER OPERATIONAL TABS */}
            {activeTab === "stock" && (() => {
              const categories = ["All", "Tea", "Milk", "Coffee", "Shake", "Water", "Maggi", "Snacks", "Toast", "Biscuit", "Namkeen", "Disposable", "Cold Drink"];
              const filteredInventory = stocks.filter(s => inventoryCategoryFilter === "All" || s.category === inventoryCategoryFilter);

              return (
                <div className="tab-body-wrapper stock-tab-body" style={{ position: "relative" }}>
                  {toastMsg && (
                    <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                      <span>🚨</span> {toastMsg}
                    </div>
                  )}

                  <div style={{ maxWidth: "1000px", margin: "0 auto", width: "100%" }}>

                    {/* Stock Header Controls */}
                    <div className="stock-header-controls" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
                      <div className="stock-categories-scroll" style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px", maxWidth: "100%", WebkitOverflowScrolling: "touch" }}>
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setInventoryCategoryFilter(cat)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "20px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              border: "none",
                              cursor: "pointer",
                              background: inventoryCategoryFilter === cat ? "#2c1b0d" : "#f0f0f0",
                              color: inventoryCategoryFilter === cat ? "#fff" : "#555",
                              transition: "all 0.2s",
                              whiteSpace: "nowrap",
                              flexShrink: 0
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="stock-actions-wrap" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <div className="stock-date-picker-wrap" style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8f9fa", padding: "6px 12px", borderRadius: "8px", border: "1px solid #eaeaea" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#555", whiteSpace: "nowrap" }}>📅 Select Date:</span>
                          <input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={inventorySelectedDate}
                            onChange={(e) => setInventorySelectedDate(e.target.value)}
                            style={{ border: "none", background: "transparent", fontSize: "12px", fontWeight: "bold", color: "#2c1b0d", outline: "none", cursor: "pointer" }}
                          />
                        </div>
                        <button
                          onClick={() => setIsAddInventoryModalOpen(true)}
                          className="stock-upload-btn"
                          style={{
                            background: "#27ae60",
                            color: "#fff",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            whiteSpace: "nowrap"
                          }}
                        >
                          <span className="btn-emoji">➕</span> Upload New Inventory
                        </button>
                      </div>
                    </div>

                    {/* Desktop Stock Table View */}
                    <div className="stock-table-card desktop-only-view" style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.05)", overflowX: "auto", marginBottom: "30px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
                        <thead>
                          <tr style={{ background: "#fbf9f6", color: "#555", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                            <th style={{ padding: "12px 16px" }}>Category</th>
                            <th style={{ padding: "12px 16px" }}>Item Name</th>
                            <th style={{ padding: "12px 16px" }}>Quantity Left</th>
                            <th style={{ padding: "12px 16px" }}>Min Threshold</th>
                            <th style={{ padding: "12px 16px", textAlign: "center" }}>Status</th>
                            <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInventory.map((item, idx) => {
                            const qty = parseFloat(item.qty) || 0;
                            const limit = item.minLimit || 10;
                            const isLow = qty <= limit;
                            return (
                              <tr key={item.id || idx} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                                <td style={{ padding: "12px 16px", fontWeight: "bold", color: "#666" }}>{item.category}</td>
                                <td style={{ padding: "12px 16px", fontWeight: "bold", color: "#2c1b0d" }}>{item.name}</td>
                                <td style={{ padding: "12px 16px", fontWeight: "bold" }}>
                                  <span>{qty} <span style={{ fontSize: "10px", color: "#888" }}>{item.unit}</span></span>
                                </td>
                                <td style={{ padding: "12px 16px" }}>
                                  {editingStockIdx === item.id ? (
                                    <input
                                      type="number"
                                      value={editStockMinLimit}
                                      onChange={(e) => setEditStockMinLimit(e.target.value)}
                                      style={{ width: "60px", padding: "4px", fontSize: "11px" }}
                                    />
                                  ) : (
                                    <span>{limit} <span style={{ fontSize: "10px", color: "#888" }}>{item.unit}</span></span>
                                  )}
                                </td>
                                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                  <span style={{ background: isLow ? "#fce8e6" : "#e8f6ef", color: isLow ? "#e74c3c" : "#27ae60", padding: "4px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: "bold" }}>
                                    {isLow ? "Low Stock Alert" : "Healthy"}
                                  </span>
                                </td>
                                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                  {loggingUsageIdx === item.id ? (
                                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                                      <input
                                        type="number"
                                        placeholder={`Amount (${item.unit})`}
                                        value={usageAmount}
                                        onChange={(e) => setUsageAmount(e.target.value)}
                                        style={{ width: "80px", padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #ccc" }}
                                      />
                                      <button
                                        onClick={async () => {
                                          const amount = parseFloat(usageAmount);
                                          if (!amount || amount <= 0) return alert("Enter valid usage amount");
                                          if (amount > qty) return alert("Amount exceeds current stock");

                                          const newQty = qty - amount;
                                          const dailyUsage = item.dailyUsage || [];
                                          dailyUsage.push({ date: inventorySelectedDate, used: amount });

                                          await updateStockItem(item.id, { qty: newQty, dailyUsage });
                                          setLoggingUsageIdx(null);
                                          setUsageAmount("");
                                          setToastMsg(`Logged usage for ${item.name} on ${inventorySelectedDate}!`);
                                          setTimeout(() => setToastMsg(""), 3000);
                                        }}
                                        style={{ background: "#27ae60", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setLoggingUsageIdx(null)}
                                        style={{ background: "#95a5a6", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : restockingIdx === item.id ? (
                                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                                      <input
                                        type="number"
                                        placeholder={`Add (${item.unit})`}
                                        value={restockAmount}
                                        onChange={(e) => setRestockAmount(e.target.value)}
                                        style={{ width: "80px", padding: "4px", fontSize: "11px", borderRadius: "4px", border: "1px solid #ccc" }}
                                      />
                                      <button
                                        onClick={async () => {
                                          const amount = parseFloat(restockAmount);
                                          if (!amount || amount <= 0) return alert("Enter valid upload amount");

                                          const newQty = qty + amount;
                                          const uploadHistory = item.uploadHistory || [];
                                          uploadHistory.push({ date: inventorySelectedDate, added: amount });

                                          await updateStockItem(item.id, { qty: newQty, uploadHistory });
                                          setRestockingIdx(null);
                                          setRestockAmount("");
                                          setToastMsg(`Restocked ${amount} ${item.unit} for ${item.name} on ${inventorySelectedDate}!`);
                                          setTimeout(() => setToastMsg(""), 3000);
                                        }}
                                        style={{ background: "#1565c0", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setRestockingIdx(null)}
                                        style={{ background: "#95a5a6", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                      <button
                                        onClick={() => {
                                          setEditingStockIdx(item.id);
                                          setEditStockMinLimit(limit);
                                        }}
                                        style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "4px 12px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                      >
                                        Edit Limit
                                      </button>
                                      <button
                                        onClick={() => {
                                          setRestockingIdx(item.id);
                                          setRestockAmount("");
                                        }}
                                        style={{ background: "#e3f2fd", color: "#1565c0", border: "1px solid #1565c0", padding: "4px 12px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                      >
                                        + Restock
                                      </button>
                                      <button
                                        onClick={() => {
                                          setLoggingUsageIdx(item.id);
                                          setUsageAmount("");
                                        }}
                                        style={{ background: "#e8f6ef", color: "#27ae60", border: "1px solid #27ae60", padding: "4px 12px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                      >
                                        Log Usage
                                      </button>
                                    </div>
                                  )}
                                  {editingStockIdx === item.id && (
                                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "6px" }}>
                                      <button
                                        onClick={async () => {
                                          await updateStockItem(item.id, { minLimit: parseFloat(editStockMinLimit) || 10 });
                                          setEditingStockIdx(null);
                                          setToastMsg(`Updated limits for ${item.name}!`);
                                          setTimeout(() => setToastMsg(""), 3000);
                                        }}
                                        style={{ background: "#27ae60", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                      >
                                        Save Limit
                                      </button>
                                      <button
                                        onClick={() => setEditingStockIdx(null)}
                                        style={{ background: "#95a5a6", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredInventory.length === 0 && (
                            <tr>
                              <td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#888", fontStyle: "italic" }}>
                                No inventory items found for this category.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stock Cards List View */}
                    <div className="stock-mobile-cards-container mobile-only-view" style={{ display: "none", flexDirection: "column", gap: "10px", marginBottom: "30px" }}>
                      {filteredInventory.map((item, idx) => {
                        const qty = parseFloat(item.qty) || 0;
                        const limit = item.minLimit || 10;
                        const isLow = qty <= limit;
                        return (
                          <div key={item.id || idx} className="stock-mobile-card" style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "14px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <div>
                                <span style={{ fontSize: "10px", fontWeight: "800", color: "#8a583c", background: "rgba(138,88,60,0.1)", padding: "2px 8px", borderRadius: "6px", display: "inline-block", marginBottom: "4px" }}>
                                  {item.category}
                                </span>
                                <strong style={{ fontSize: "14.5px", color: "#09090b", display: "block" }}>{item.name}</strong>
                              </div>
                              <span style={{ background: isLow ? "#fce8e6" : "#e8f6ef", color: isLow ? "#e74c3c" : "#27ae60", padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "850", border: isLow ? "1px solid #fca5a5" : "1px solid #86efac" }}>
                                {isLow ? "⚠️ Low Stock" : "✓ Healthy"}
                              </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "#f8fafc", padding: "10px", borderRadius: "10px", marginBottom: "12px" }}>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>Quantity Left</span>
                                <strong style={{ fontSize: "15px", color: isLow ? "#dc2626" : "#0f172a" }}>
                                  {qty} <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b" }}>{item.unit}</span>
                                </strong>
                              </div>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#64748b", display: "block" }}>Min Threshold</span>
                                {editingStockIdx === item.id ? (
                                  <input
                                    type="number"
                                    value={editStockMinLimit}
                                    onChange={(e) => setEditStockMinLimit(e.target.value)}
                                    style={{ width: "70px", padding: "4px 8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1", marginTop: "2px" }}
                                  />
                                ) : (
                                  <strong style={{ fontSize: "15px", color: "#475569" }}>
                                    {limit} <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b" }}>{item.unit}</span>
                                  </strong>
                                )}
                              </div>
                            </div>

                            {/* Mobile Inline Actions Forms */}
                            {loggingUsageIdx === item.id ? (
                              <div style={{ background: "#f0fdf4", padding: "10px", borderRadius: "10px", border: "1px solid #bbf7d0", marginBottom: "6px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "800", color: "#166534", display: "block", marginBottom: "6px" }}>📉 Log Used Quantity</span>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <input
                                    type="number"
                                    placeholder={`Used (${item.unit})`}
                                    value={usageAmount}
                                    onChange={(e) => setUsageAmount(e.target.value)}
                                    style={{ flex: 1, padding: "8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #86efac", outline: "none" }}
                                  />
                                  <button
                                    onClick={async () => {
                                      const amount = parseFloat(usageAmount);
                                      if (!amount || amount <= 0) return alert("Enter valid usage amount");
                                      if (amount > qty) return alert("Amount exceeds current stock");

                                      const newQty = qty - amount;
                                      const dailyUsage = item.dailyUsage || [];
                                      dailyUsage.push({ date: inventorySelectedDate, used: amount });

                                      await updateStockItem(item.id, { qty: newQty, dailyUsage });
                                      setLoggingUsageIdx(null);
                                      setUsageAmount("");
                                      setToastMsg(`Logged usage for ${item.name}!`);
                                      setTimeout(() => setToastMsg(""), 3000);
                                    }}
                                    style={{ background: "#16a34a", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setLoggingUsageIdx(null)}
                                    style={{ background: "#94a3b8", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : restockingIdx === item.id ? (
                              <div style={{ background: "#eff6ff", padding: "10px", borderRadius: "10px", border: "1px solid #bfdbfe", marginBottom: "6px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "800", color: "#1e40af", display: "block", marginBottom: "6px" }}>📦 Add Stock Quantity</span>
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <input
                                    type="number"
                                    placeholder={`Add (${item.unit})`}
                                    value={restockAmount}
                                    onChange={(e) => setRestockAmount(e.target.value)}
                                    style={{ flex: 1, padding: "8px", fontSize: "12px", borderRadius: "6px", border: "1px solid #93c5fd", outline: "none" }}
                                  />
                                  <button
                                    onClick={async () => {
                                      const amount = parseFloat(restockAmount);
                                      if (!amount || amount <= 0) return alert("Enter valid upload amount");

                                      const newQty = qty + amount;
                                      const uploadHistory = item.uploadHistory || [];
                                      uploadHistory.push({ date: inventorySelectedDate, added: amount });

                                      await updateStockItem(item.id, { qty: newQty, uploadHistory });
                                      setRestockingIdx(null);
                                      setRestockAmount("");
                                      setToastMsg(`Restocked ${amount} ${item.unit} for ${item.name}!`);
                                      setTimeout(() => setToastMsg(""), 3000);
                                    }}
                                    style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setRestockingIdx(null)}
                                    style={{ background: "#94a3b8", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ) : editingStockIdx === item.id ? (
                              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginBottom: "6px" }}>
                                <button
                                  onClick={async () => {
                                    await updateStockItem(item.id, { minLimit: parseFloat(editStockMinLimit) || 10 });
                                    setEditingStockIdx(null);
                                    setToastMsg(`Updated limits for ${item.name}!`);
                                    setTimeout(() => setToastMsg(""), 3000);
                                  }}
                                  style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", padding: "8px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                                >
                                  Save Limit
                                </button>
                                <button
                                  onClick={() => setEditingStockIdx(null)}
                                  style={{ background: "#94a3b8", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
                                <button
                                  onClick={() => {
                                    setEditingStockIdx(item.id);
                                    setEditStockMinLimit(limit);
                                  }}
                                  style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", padding: "7px 4px", borderRadius: "8px", fontSize: "10.5px", cursor: "pointer", fontWeight: "800", textAlign: "center" }}
                                >
                                  ✏️ Limit
                                </button>
                                <button
                                  onClick={() => {
                                    setRestockingIdx(item.id);
                                    setRestockAmount("");
                                  }}
                                  style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "7px 4px", borderRadius: "8px", fontSize: "10.5px", cursor: "pointer", fontWeight: "800", textAlign: "center" }}
                                >
                                  ➕ Restock
                                </button>
                                <button
                                  onClick={() => {
                                    setLoggingUsageIdx(item.id);
                                    setUsageAmount("");
                                  }}
                                  style={{ background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", padding: "7px 4px", borderRadius: "8px", fontSize: "10.5px", cursor: "pointer", fontWeight: "800", textAlign: "center" }}
                                >
                                  📉 Usage
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {filteredInventory.length === 0 && (
                        <div style={{ padding: "30px 14px", textAlign: "center", color: "#64748b", background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", fontStyle: "italic" }}>
                          No inventory items found for this category.
                        </div>
                      )}
                    </div>

                    {/* Add Inventory Modal */}
                    {isAddInventoryModalOpen && (
                      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, padding: "12px" }}>
                        <div className="stock-modal-card" style={{ background: "#fff", padding: "24px", borderRadius: "20px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", boxSizing: "border-box" }}>
                          <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#2c1b0d", fontSize: "18px", fontWeight: "900" }}>Upload New Inventory</h3>

                          <div style={{ marginBottom: "12px" }}>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#52525b", marginBottom: "4px" }}>Category</label>
                            <select
                              value={newInventoryItem.category}
                              onChange={(e) => setNewInventoryItem({ ...newInventoryItem, category: e.target.value })}
                              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #e4e4e7", fontSize: "13px", boxSizing: "border-box" }}
                            >
                              {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>

                          <div style={{ marginBottom: "12px" }}>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#52525b", marginBottom: "4px" }}>Item Name</label>
                            <input
                              type="text"
                              value={newInventoryItem.name}
                              onChange={(e) => setNewInventoryItem({ ...newInventoryItem, name: e.target.value })}
                              placeholder="e.g. Tea Leaves"
                              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #e4e4e7", fontSize: "13px", boxSizing: "border-box" }}
                            />
                          </div>

                          <div style={{ marginBottom: "12px" }}>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#52525b", marginBottom: "4px" }}>Unit (e.g. kg, Litre, Pcs)</label>
                            <input
                              type="text"
                              value={newInventoryItem.unit}
                              onChange={(e) => setNewInventoryItem({ ...newInventoryItem, unit: e.target.value })}
                              placeholder="e.g. kg"
                              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #e4e4e7", fontSize: "13px", boxSizing: "border-box" }}
                            />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#52525b", marginBottom: "4px" }}>Initial Qty</label>
                              <input
                                type="number"
                                value={newInventoryItem.qty}
                                onChange={(e) => setNewInventoryItem({ ...newInventoryItem, qty: e.target.value })}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #e4e4e7", fontSize: "13px", boxSizing: "border-box" }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#52525b", marginBottom: "4px" }}>Min Alert Limit</label>
                              <input
                                type="number"
                                value={newInventoryItem.minLimit}
                                onChange={(e) => setNewInventoryItem({ ...newInventoryItem, minLimit: e.target.value })}
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1.5px solid #e4e4e7", fontSize: "13px", boxSizing: "border-box" }}
                              />
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button
                              onClick={() => setIsAddInventoryModalOpen(false)}
                              style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #e4e4e7", background: "#f4f4f5", color: "#52525b", cursor: "pointer", fontWeight: "800", fontSize: "12.5px" }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                if (!newInventoryItem.name) return alert("Item name is required!");
                                await addStockItem({
                                  ...newInventoryItem,
                                  qty: parseFloat(newInventoryItem.qty) || 0,
                                  minLimit: parseFloat(newInventoryItem.minLimit) || 10,
                                  dailyUsage: [],
                                  uploadHistory: [{ date: new Date().toISOString().split('T')[0], added: parseFloat(newInventoryItem.qty) || 0 }]
                                });
                                setIsAddInventoryModalOpen(false);
                                setNewInventoryItem({ category: "Tea", name: "", unit: "kg", qty: 0, minLimit: 10 });
                                setToastMsg("Inventory added!");
                                setTimeout(() => setToastMsg(""), 3000);
                              }}
                              style={{ padding: "10px 18px", borderRadius: "8px", border: "none", background: "#2c1b0d", color: "#fff", cursor: "pointer", fontWeight: "800", fontSize: "12.5px" }}
                            >
                              Add Item
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

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
              const preparingCount = orders.filter(o => o.status === "Preparing" || o.status === "Ready" || o.status === "Received" || o.status === "Pending").length;
              const cancelledCount = orders.filter(o => o.status === "Cancelled" || o.status === "Refunded").length;
              const offlineCount = historyOrders.filter(h => h.isOffline).length;
              const onlineCount = historyOrders.filter(h => !h.isOffline).length;

              const filteredHistory = historyOrders.filter((h) => {
                // Type Filter: all, offline, online
                if (historyTypeFilter === "offline" && !h.isOffline) return false;
                if (historyTypeFilter === "online" && h.isOffline) return false;

                // Search Filter
                if (historySearchTerm && historySearchTerm.trim() !== "") {
                  const term = historySearchTerm.toLowerCase().trim();
                  const matchId = (h.id || "").toLowerCase().includes(term);
                  const matchCustomer = (h.customer || "").toLowerCase().includes(term);
                  const matchItems = (h.items || "").toLowerCase().includes(term);
                  const matchOffice = (h.office || "").toLowerCase().includes(term);
                  if (!matchId && !matchCustomer && !matchItems && !matchOffice) return false;
                }

                // Date Filter
                if (!isOrderMatchingDateFilter(h.rawOrder || h, historyDateFilter)) return false;

                return true;
              });

              return (
                <div className="tab-body-wrapper history-tab-body">

                  {/* KITCHEN DISPATCH & PRODUCTION SLIP MODAL (ZERO MONEY) */}
                  {activeInvoice && (() => {
                    const cleanId = String(activeInvoice.id || "").replace("#", "");

                    return (
                      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, overflowY: "auto", padding: "12px" }}>
                        <style>{`
                          @media print {
                            @page {
                              size: auto;
                              margin: 0mm;
                            }
                            body *:not(#printable-invoice-card):not(:has(#printable-invoice-card)):not(#printable-invoice-card *) {
                              display: none !important;
                            }
                            body *:has(#printable-invoice-card) {
                              margin: 0 !important;
                              padding: 0 !important;
                              border: none !important;
                              background: transparent !important;
                              height: auto !important;
                              min-height: 0 !important;
                              overflow: visible !important;
                              position: static !important;
                            }
                            #printable-invoice-card {
                              position: absolute !important;
                              left: 0 !important;
                              top: 0 !important;
                              width: 100% !important;
                              max-width: 100% !important;
                              border: none !important;
                              box-shadow: none !important;
                              padding: 24px !important;
                              margin: 0 !important;
                            }
                            .no-print {
                              display: none !important;
                            }
                          }
                        `}</style>
                        <div style={{ width: "100%", maxWidth: "720px", margin: "0 auto" }}>

                          {/* Close & Print Controls */}
                          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => setActiveInvoice(null)}
                              style={{ padding: "9px 18px", background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "10px", fontWeight: "800", cursor: "pointer", fontSize: "13px", color: "#09090b", display: "flex", alignItems: "center", gap: "6px" }}
                            >
                              <span>←</span> Back to Order History
                            </button>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              style={{ padding: "9px 22px", background: "#09090b", color: "#ffffff", border: "none", borderRadius: "10px", fontWeight: "800", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
                            >
                              <span>🖨️</span> Print Slip
                            </button>
                          </div>

                          {/* Printable Kitchen Slip Card */}
                          <div id="printable-invoice-card" className="printable-slip-card" style={{ background: "#ffffff", padding: "30px 24px", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", border: "1px solid #e4e4e7", color: "#09090b", fontFamily: "system-ui, -apple-system, sans-serif" }}>

                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #09090b", paddingBottom: "16px", marginBottom: "20px", gap: "10px", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <img src="/logo.png" alt="Chai Chaska Logo" style={{ width: "46px", height: "46px", objectFit: "cover", borderRadius: "10px", border: "1px solid #e4e4e7" }} />
                                <div>
                                  <strong style={{ fontSize: "20px", color: "#09090b", letterSpacing: "0.5px", display: "block" }}>CHAI CHASKA</strong>
                                  <span style={{ fontSize: "11px", color: "#71717a", fontWeight: "600" }}>Kitchen & Dispatch Slip</span>
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: "10px", fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase", display: "block", color: "#71717a" }}>PRODUCTION SLIP</span>
                                <strong style={{ fontSize: "18px", color: "#09090b" }}>#{cleanId}</strong>
                              </div>
                            </div>

                            {/* Order Details Grid */}
                            <div className="slip-details-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1.5fr", gap: "12px", background: "#f8fafc", padding: "14px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                              <div>
                                <span style={{ fontSize: "10px", color: "#71717a", display: "block", textTransform: "uppercase", fontWeight: "800", marginBottom: "4px" }}>Order Channel</span>
                                <span style={{ fontSize: "11.5px", fontWeight: "850", padding: "3px 8px", borderRadius: "6px", background: activeInvoice.isOffline ? "#09090b" : "#e2e8f0", color: activeInvoice.isOffline ? "#ffffff" : "#09090b", display: "inline-block" }}>
                                  {activeInvoice.isOffline ? "🏪 Offline Counter" : "🏢 Online Desk"}
                                </span>
                              </div>
                              <div>
                                <span style={{ fontSize: "10px", color: "#71717a", display: "block", textTransform: "uppercase", fontWeight: "800", marginBottom: "4px" }}>Payment Method</span>
                                <strong style={{ fontSize: "12px", color: "#09090b", display: "block" }}>
                                  {activeInvoice.paymentMethod === "Cash" ? "💵 Cash" : activeInvoice.paymentMethod === "Card" ? "💳 Card" : activeInvoice.paymentMethod === "Corporate Due" ? "🏢 Due" : `📱 ${activeInvoice.paymentMethod || "Online UPI"}`}
                                </strong>
                                <span style={{ fontSize: "10px", color: "#16a34a", fontWeight: "750" }}>{activeInvoice.paymentStatus || "Paid"}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: "10px", color: "#71717a", display: "block", textTransform: "uppercase", fontWeight: "800", marginBottom: "4px" }}>Date & Time</span>
                                <strong style={{ fontSize: "12px", color: "#09090b" }}>
                                  {activeInvoice.createdAt ? new Date(activeInvoice.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : activeInvoice.date}
                                </strong>
                              </div>
                              <div>
                                <span style={{ fontSize: "10px", color: "#71717a", display: "block", textTransform: "uppercase", fontWeight: "800", marginBottom: "4px" }}>Customer / Location</span>
                                <strong style={{ fontSize: "12.5px", color: "#09090b", display: "block" }}>{activeInvoice.customer}</strong>
                                <span style={{ fontSize: "11px", color: "#52525b" }}>📍 {activeInvoice.office}</span>
                              </div>
                            </div>

                            {/* Itemized Kitchen Prep List */}
                            <div style={{ marginBottom: "20px", overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ background: "#09090b", color: "#ffffff", fontSize: "11px", textTransform: "uppercase" }}>
                                    <th style={{ padding: "8px 12px", textAlign: "left", borderRadius: "8px 0 0 8px" }}>Item Description</th>
                                    <th style={{ padding: "8px 12px", textAlign: "left" }}>Recipe</th>
                                    <th style={{ padding: "8px 12px", textAlign: "center", borderRadius: "0 8px 8px 0" }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ borderBottom: "1px solid #e4e4e7", fontSize: "12.5px" }}>
                                    <td style={{ padding: "12px" }}>
                                      <strong style={{ fontSize: "13px", color: "#09090b", display: "block" }}>{activeInvoice.items}</strong>
                                    </td>
                                    <td style={{ padding: "12px", fontSize: "12px", color: "#52525b" }}>
                                      {activeInvoice.customization || "Standard Kitchen Recipe"}
                                    </td>
                                    <td style={{ padding: "12px", textAlign: "center" }}>
                                      <span style={{ fontSize: "10.5px", fontWeight: "850", padding: "4px 8px", borderRadius: "6px", background: activeInvoice.status === "Delivered" || activeInvoice.status === "Completed" ? "#f4f4f5" : "#09090b", color: activeInvoice.status === "Delivered" || activeInvoice.status === "Completed" ? "#09090b" : "#ffffff", border: "1px solid #e4e4e7" }}>
                                        {activeInvoice.status}
                                      </span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Dispatch Confirmation Box */}
                            <div className="slip-dispatch-box" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px", background: "#fcfcfd", border: "1px solid #e4e4e7", padding: "14px 16px", borderRadius: "12px", marginBottom: "20px" }}>
                              <div>
                                <span style={{ fontSize: "10.5px", fontWeight: "900", color: "#09090b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Kitchen Quality Standards</span>
                                <p style={{ fontSize: "11px", color: "#71717a", margin: 0, lineHeight: 1.4 }}>
                                  Freshly boiled milk & steeped whole tea leaves. Served at optimal temperature.
                                </p>
                              </div>
                              <div style={{ textAlign: "right", borderLeft: "1px solid #e4e4e7", paddingLeft: "14px" }}>
                                <span style={{ fontSize: "10px", fontWeight: "800", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Brewmaster Sign</span>
                                <strong style={{ fontSize: "13px", color: "#09090b", display: "block" }}>Master Tea Sommelier</strong>
                                <span style={{ fontSize: "10px", color: "#a1a1aa" }}>Verified & Dispatched</span>
                              </div>
                            </div>

                            {/* Footer info */}
                            <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#a1a1aa", flexWrap: "wrap", gap: "6px" }}>
                              <span>🏢 Chai Chaska Central Corporate Hub</span>
                              <span>📞 Kitchen Dispatch Unit</span>
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Header Title & Description */}
                  <div className="history-header-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <h3 className="section-title" style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "#09090b" }}>Order History & Logs</h3>
                      <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#71717a" }}>
                        Operational logs of offline counter orders and online desk deliveries
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTodayStatsSidebar(true)}
                      className="history-tally-btn"
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        color: "#ffffff",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "10px",
                        fontSize: "12.5px",
                        fontWeight: "800",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 8px rgba(217, 119, 6, 0.3)",
                        transition: "all 0.15s ease",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <span style={{ fontSize: "14px" }}>📊</span> Today's Orders Tally
                    </button>
                  </div>

                  {/* Top Stats Cards Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }} className="dashboard-stats-grid history-stats-grid">
                    <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Total Orders</span>
                      <strong style={{ fontSize: "22px", fontWeight: "900", color: "#09090b" }}>{historyOrders.length}</strong>
                      <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block", marginTop: "2px" }}>All channels</span>
                    </div>

                    <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Completed</span>
                      <strong style={{ fontSize: "22px", fontWeight: "900", color: "#09090b" }}>{completedCount}</strong>
                      <span style={{ fontSize: "10px", color: "#16a34a", fontWeight: "750", display: "block", marginTop: "2px" }}>● Fulfilled</span>
                    </div>

                    <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>🏪 Offline</span>
                      <strong style={{ fontSize: "22px", fontWeight: "900", color: "#09090b" }}>{offlineCount}</strong>
                      <span style={{ fontSize: "10px", color: "#71717a", display: "block", marginTop: "2px" }}>Counter</span>
                    </div>

                    <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>🏢 Online</span>
                      <strong style={{ fontSize: "22px", fontWeight: "900", color: "#09090b" }}>{onlineCount}</strong>
                      <span style={{ fontSize: "10px", color: "#71717a", display: "block", marginTop: "2px" }}>Desk delivery</span>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="history-filter-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px", background: "#ffffff", padding: "12px 14px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>

                    {/* Order Channel Tabs */}
                    <div className="history-channel-pills" style={{ display: "flex", background: "#f4f4f5", padding: "4px", borderRadius: "10px", gap: "4px", overflowX: "auto", maxWidth: "100%" }}>
                      <button
                        type="button"
                        onClick={() => setHistoryTypeFilter("all")}
                        style={{
                          padding: "6px 12px",
                          border: "none",
                          background: historyTypeFilter === "all" ? "#09090b" : "transparent",
                          color: historyTypeFilter === "all" ? "#ffffff" : "#52525b",
                          borderRadius: "7px",
                          fontSize: "11.5px",
                          fontWeight: "800",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          whiteSpace: "nowrap"
                        }}
                      >
                        ☕ All ({historyOrders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTypeFilter("offline")}
                        style={{
                          padding: "6px 12px",
                          border: "none",
                          background: historyTypeFilter === "offline" ? "#09090b" : "transparent",
                          color: historyTypeFilter === "offline" ? "#ffffff" : "#52525b",
                          borderRadius: "7px",
                          fontSize: "11.5px",
                          fontWeight: "800",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          whiteSpace: "nowrap"
                        }}
                      >
                        🏪 Offline ({offlineCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTypeFilter("online")}
                        style={{
                          padding: "6px 12px",
                          border: "none",
                          background: historyTypeFilter === "online" ? "#09090b" : "transparent",
                          color: historyTypeFilter === "online" ? "#ffffff" : "#52525b",
                          borderRadius: "7px",
                          fontSize: "11.5px",
                          fontWeight: "800",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          whiteSpace: "nowrap"
                        }}
                      >
                        🏢 Online ({onlineCount})
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div className="history-search-box" style={{ flexGrow: 1, maxWidth: "300px", minWidth: "180px", position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Search ID, customer, item..."
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px 8px 32px",
                          borderRadius: "8px",
                          border: "1.5px solid #e4e4e7",
                          fontSize: "12px",
                          background: "#f8fafc",
                          color: "#09090b",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                      <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#a1a1aa" }}>🔍</span>
                      {historySearchTerm && (
                        <button
                          type="button"
                          onClick={() => setHistorySearchTerm("")}
                          style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#71717a", cursor: "pointer", fontSize: "12px" }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Date Filters */}
                    <div className="history-date-filters" style={{ display: "flex", background: "#f4f4f5", padding: "4px", borderRadius: "10px", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
                      {[
                        { key: "all", label: "All" },
                        { key: "today", label: "Today" },
                        { key: "7days", label: "7D" }
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setHistoryDateFilter(item.key)}
                          style={{
                            padding: "6px 10px",
                            border: "none",
                            background: historyDateFilter === item.key ? "#09090b" : "transparent",
                            color: historyDateFilter === item.key ? "#ffffff" : "#52525b",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "800",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Format Layout Toggle */}
                    <div className="history-view-toggle" style={{ display: "flex", background: "#f4f4f5", padding: "4px", borderRadius: "10px", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode("list")}
                        style={{
                          padding: "6px 10px",
                          border: "none",
                          background: historyViewMode === "list" ? "#09090b" : "transparent",
                          color: historyViewMode === "list" ? "#ffffff" : "#52525b",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "800",
                          cursor: "pointer"
                        }}
                      >
                        📋 List
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode("grid")}
                        style={{
                          padding: "6px 10px",
                          border: "none",
                          background: historyViewMode === "grid" ? "#09090b" : "transparent",
                          color: historyViewMode === "grid" ? "#ffffff" : "#52525b",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: "800",
                          cursor: "pointer"
                        }}
                      >
                        📱 Grid
                      </button>
                    </div>

                  </div>

                  {/* Toast Message Overlay */}
                  {toastMsg && (
                    <div style={{ position: "fixed", top: "24px", right: "24px", background: "#09090b", color: "#ffffff", padding: "14px 22px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)", zIndex: 9999, fontWeight: "800", display: "flex", gap: "10px", alignItems: "center", border: "1px solid #27272a" }}>
                      <span>🖨️</span> {toastMsg}
                    </div>
                  )}

                  {/* Render Empty State or Data */}
                  {filteredHistory.length === 0 ? (
                    <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "48px 20px", textAlign: "center" }}>
                      <span style={{ fontSize: "36px", display: "block", marginBottom: "10px" }}>📜</span>
                      <strong style={{ fontSize: "15px", color: "#09090b", display: "block", marginBottom: "4px" }}>No orders matching the current filter</strong>
                      <p style={{ fontSize: "12px", color: "#71717a", margin: "0 auto 14px", maxWidth: "380px" }}>
                        Try switching the channel filter or adjusting the date range to see logged orders.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryTypeFilter("all");
                          setHistoryDateFilter("all");
                          setHistorySearchTerm("");
                        }}
                        style={{ background: "#09090b", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : (
                    /* ORDERS DISPLAY: GRID OR LIST */
                    <div className="history-orders-container">
                      {historyViewMode === "grid" ? (
                        <div className="history-orders-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
                          {filteredHistory.map((h, i) => (
                            <div key={i} className="history-order-card" style={{ background: "#ffffff", padding: "16px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px" }}>
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", gap: "6px", flexWrap: "wrap" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: "11px", fontWeight: "900", color: "#ffffff", background: "#09090b", padding: "2px 6px", borderRadius: "4px" }}>
                                      {h.id}
                                    </span>
                                    <span style={{
                                      fontSize: "10px",
                                      fontWeight: "800",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      background: h.isOffline ? "#09090b" : "#f4f4f5",
                                      color: h.isOffline ? "#ffffff" : "#09090b",
                                      border: "1px solid #e4e4e7"
                                    }}>
                                      {h.isOffline ? "🏪 Offline" : "🏢 Online"}
                                    </span>
                                    <span style={{
                                      fontSize: "10px",
                                      fontWeight: "750",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      background: "#f8fafc",
                                      color: "#52525b",
                                      border: "1px solid #e2e8f0"
                                    }}>
                                      {h.paymentMethod === "Cash" ? "💵 Cash" : h.paymentMethod === "Card" ? "💳 Card" : h.paymentMethod === "Corporate Due" ? "🏢 Due" : `📱 ${h.paymentMethod || "UPI"}`}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: "10.5px", color: "#71717a", fontWeight: "600" }}>{h.date}</span>
                                </div>

                                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                                  <img
                                    src={h.image || "/logo.png"}
                                    alt={h.items}
                                    style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", border: "1px solid #e4e4e7", flexShrink: 0 }}
                                  />
                                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                                    <strong style={{ fontSize: "13.5px", color: "#09090b", display: "block", marginBottom: "2px" }}>👤 {h.customer}</strong>
                                    <p style={{ fontSize: "12px", color: "#27272a", fontWeight: "700", margin: "0 0 2px 0" }}>{h.items}</p>
                                    <span style={{ fontSize: "10.5px", color: "#71717a", display: "block" }}>⚙️ {h.customization}</span>
                                    <span style={{ fontSize: "10.5px", color: "#71717a", display: "block" }}>📍 {h.office}</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                                <span style={{
                                  fontSize: "10.5px",
                                  fontWeight: "850",
                                  padding: "3px 8px",
                                  borderRadius: "5px",
                                  background: h.status === "Delivered" || h.status === "Completed" ? "#f4f4f5" : "#09090b",
                                  color: h.status === "Delivered" || h.status === "Completed" ? "#09090b" : "#ffffff",
                                  border: "1px solid #e4e4e7"
                                }}>
                                  {h.status}
                                </span>

                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    type="button"
                                    onClick={() => setActiveInvoice(h)}
                                    style={{ background: "#ffffff", border: "1.5px solid #e4e4e7", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer", color: "#09090b" }}
                                  >
                                    🖨️ Slip
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setToastMsg(`🔄 Re-opened order ${h.id} as active brewing request!`);
                                      setTimeout(() => setToastMsg(""), 3000);
                                    }}
                                    style={{ background: "#09090b", color: "#ffffff", border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "800" }}
                                  >
                                    Re-open
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="history-table-wrapper" style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #e2e8f0", overflowX: "auto", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "600px" }}>
                            <thead>
                              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", fontSize: "10.5px", textTransform: "uppercase", color: "#52525b", letterSpacing: "0.5px" }}>
                                <th style={{ padding: "12px 16px" }}>Order ID & Channel</th>
                                <th style={{ padding: "12px 16px" }}>Payment</th>
                                <th style={{ padding: "12px 16px" }}>Customer</th>
                                <th style={{ padding: "12px 16px" }}>Items & Customization</th>
                                <th style={{ padding: "12px 16px" }}>Destination / Desk</th>
                                <th style={{ padding: "12px 16px" }}>Date & Time</th>
                                <th style={{ padding: "12px 16px" }}>Status</th>
                                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredHistory.map((h, i) => (
                                <tr key={i} style={{ borderBottom: i === filteredHistory.length - 1 ? "none" : "1px solid #f1f5f9", fontSize: "12.5px" }}>
                                  <td style={{ padding: "12px 16px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                      <strong style={{ color: "#09090b", fontSize: "12px" }}>{h.id}</strong>
                                      <span style={{
                                        fontSize: "9.5px",
                                        fontWeight: "800",
                                        padding: "1px 5px",
                                        borderRadius: "4px",
                                        background: h.isOffline ? "#09090b" : "#f4f4f5",
                                        color: h.isOffline ? "#ffffff" : "#09090b",
                                        border: "1px solid #e4e4e7",
                                        width: "fit-content"
                                      }}>
                                        {h.isOffline ? "🏪 Offline" : "🏢 Online"}
                                      </span>
                                    </div>
                                  </td>

                                  <td style={{ padding: "12px 16px" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                      <span style={{
                                        fontSize: "10px",
                                        fontWeight: "800",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        background: "#f4f4f5",
                                        color: "#09090b",
                                        border: "1px solid #e4e4e7",
                                        width: "fit-content"
                                      }}>
                                        {h.paymentMethod === "Cash" ? "💵 Cash" : h.paymentMethod === "Card" ? "💳 Card" : h.paymentMethod === "Corporate Due" ? "🏢 Due" : `📱 ${h.paymentMethod || "UPI"}`}
                                      </span>
                                      <span style={{ fontSize: "10px", color: h.paymentStatus === "Paid" ? "#16a34a" : "#ca8a04", fontWeight: "750" }}>
                                        ● {h.paymentStatus || "Paid"}
                                      </span>
                                    </div>
                                  </td>

                                  <td style={{ padding: "12px 16px" }}>
                                    <strong style={{ color: "#09090b", display: "block" }}>{h.customer}</strong>
                                    <span style={{ fontSize: "10.5px", color: "#71717a" }}>{h.isOffline ? "Counter" : "Corporate"}</span>
                                  </td>

                                  <td style={{ padding: "12px 16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                      <img
                                        src={h.image || "/logo.png"}
                                        alt={h.items}
                                        style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", border: "1px solid #e4e4e7", flexShrink: 0 }}
                                      />
                                      <div>
                                        <span style={{ fontWeight: "750", color: "#09090b", display: "block" }}>{h.items}</span>
                                        <span style={{ fontSize: "10px", color: "#71717a" }}>{h.customization}</span>
                                      </div>
                                    </div>
                                  </td>

                                  <td style={{ padding: "12px 16px", color: "#52525b" }}>
                                    <span>📍 {h.office}</span>
                                  </td>

                                  <td style={{ padding: "12px 16px", color: "#71717a", fontSize: "11px" }}>
                                    <span>{h.date}</span>
                                  </td>

                                  <td style={{ padding: "12px 16px" }}>
                                    <span style={{
                                      fontSize: "10.5px",
                                      fontWeight: "850",
                                      padding: "3px 8px",
                                      borderRadius: "5px",
                                      background: h.status === "Delivered" || h.status === "Completed" ? "#f4f4f5" : "#09090b",
                                      color: h.status === "Delivered" || h.status === "Completed" ? "#09090b" : "#ffffff",
                                      border: "1px solid #e4e4e7"
                                    }}>
                                      {h.status}
                                    </span>
                                  </td>

                                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                      <button
                                        type="button"
                                        onClick={() => setActiveInvoice(h)}
                                        style={{ background: "#ffffff", border: "1.5px solid #e4e4e7", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "800", cursor: "pointer", color: "#09090b" }}
                                      >
                                        🖨️ Slip
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setToastMsg(`🔄 Re-opened order ${h.id} as active brewing request!`);
                                          setTimeout(() => setToastMsg(""), 3000);
                                        }}
                                        style={{ background: "#09090b", color: "#ffffff", border: "none", padding: "5px 10px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "800" }}
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
                  )}

                </div>
              );
            })()}

            {activeTab === "subs" && (() => {
              const activeSubs = [];

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
                                  <span style={{ color: "#888" }}>Start:</span> <strong style={{ color: "#2c1b0d" }}>{sub.startDate}</strong>
                                </div>
                                <div style={{ fontSize: "11.5px", color: "#555", fontWeight: "500" }}>
                                  <span style={{ color: "#888" }}>End:</span> <strong style={{ color: "#2c1b0d" }}>{sub.endDate || "Ongoing"}</strong>
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

                            <div suppressHydrationWarning style={{ marginTop: "16px", padding: "12px", background: "#fcfaf7", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)" }}>
                              <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "8px", textTransform: "uppercase", fontWeight: "bold" }}>📅 Delivery Tracker</span>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {generateDateRange(sub.startDate, sub.endDate || sub.expiryDate).map((dateStr, idx) => {
                                  const isDelivered = (sub.deliveredDates || []).includes(dateStr);
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      suppressHydrationWarning
                                      onClick={() => toggleDeliveryDate(sub, dateStr)}
                                      style={{
                                        background: isDelivered ? "#27ae60" : "#fff",
                                        color: isDelivered ? "#fff" : "#555",
                                        border: isDelivered ? "1px solid #27ae60" : "1px solid #ddd",
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        fontSize: "10px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                      }}
                                    >
                                      {isDelivered ? `✓ ${dateStr.substring(0, 6)}` : dateStr.substring(0, 6)}
                                    </button>
                                  );
                                })}
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

            {activeTab === "leave" && (() => {
              const diffDays = (() => {
                if (leaveStart && leaveEnd) {
                  const s = new Date(leaveStart);
                  const e = new Date(leaveEnd);
                  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
                  return diff > 0 ? diff : 1;
                }
                return 1;
              })();

              const activeBm = selectedBmDetails || brewmasters.find(b => b.employeeId === selectedEmployeeId) || (brewmasters.length > 0 ? brewmasters[0] : {
                employeeId: "BM-001",
                name: brewmasterName || "Head Brewmaster",
                role: "Head Brewmaster",
                phone: brewmasterContact || "+91 96676 23123",
                status: "Active"
              });

              return (
                <div className="tab-body-wrapper leave-tab-body" style={{ padding: "0 0 40px 0" }}>
                  {/* Top Header */}
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "22px", background: "#ffffff", padding: "20px 24px", borderRadius: "20px", border: "1px solid rgba(44,27,13,0.06)", boxShadow: "0 4px 16px rgba(44,27,13,0.02)" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "850", color: "#09090b", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>🏖️</span> Brewmaster Leave & Holiday Application
                      </h2>
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#71717a" }}>
                        Select your Employee ID to auto-fill your profile details, choose holiday dates, and submit for Admin approval.
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span style={{
                        background: "#f4f4f5",
                        color: "#09090b",
                        border: "1px solid #e4e4e7",
                        padding: "8px 16px",
                        borderRadius: "10px",
                        fontWeight: "800",
                        fontSize: "12.5px"
                      }}>
                        🏢 Operating Hours: {workingHours || "8:00 AM - 6:00 PM"}
                      </span>
                    </div>
                  </div>

                  <div className="leave-two-col-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>

                    {/* Left Column: Apply Leave Form */}
                    <div>
                      <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid #e4e4e7", boxShadow: "0 4px 16px rgba(0,0,0,0.02)", marginBottom: "24px" }}>
                        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: "900", color: "#09090b", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>📝</span> Submit Leave / Holiday Request
                        </h3>

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newLeaveReason.trim() || !leaveStart || !leaveEnd) {
                              setToastMsg("❌ Please fill all leave details!");
                              setTimeout(() => setToastMsg(""), 3000);
                              return;
                            }

                            const empIdToUse = selectedEmployeeId || (activeBm?.employeeId) || "BM-001";
                            const bmNameToUse = (activeBm?.name) || brewmasterName || "Brewmaster";
                            const bmPhoneToUse = (activeBm?.phone) || brewmasterContact || "";

                            try {
                              await addLeaveRequest({
                                employeeId: empIdToUse,
                                brewmasterName: bmNameToUse,
                                phone: bmPhoneToUse,
                                start: leaveStart,
                                end: leaveEnd,
                                days: diffDays,
                                leaveType: selectedLeaveType,
                                reason: newLeaveReason.trim(),
                                status: "Pending Approval"
                              });

                              setNewLeaveReason("");
                              setToastMsg(`🌱 Leave request for ${bmNameToUse} (${empIdToUse}) submitted to Admin!`);
                              setTimeout(() => setToastMsg(""), 4000);
                            } catch (err) {
                              setToastMsg("❌ Error applying leave: " + err.message);
                              setTimeout(() => setToastMsg(""), 3500);
                            }
                          }}
                          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
                        >
                          {/* 1. SELECT EMPLOYEE ID */}
                          <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1.5px solid #e2e8f0" }}>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#0f172a", marginBottom: "6px" }}>
                              🆔 Select Your Brewmaster Employee ID <span style={{ color: "#e11d48" }}>*</span>
                            </label>

                            <select
                              value={selectedEmployeeId || (activeBm?.employeeId || "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSelectedEmployeeId(val);
                                const found = brewmasters.find(b => b.employeeId === val);
                                setSelectedBmDetails(found || null);
                              }}
                              style={{
                                width: "100%",
                                padding: "11px 14px",
                                borderRadius: "10px",
                                border: "1.5px solid #cbd5e1",
                                background: "#ffffff",
                                fontSize: "13.5px",
                                fontWeight: "800",
                                color: "#09090b",
                                outline: "none",
                                cursor: "pointer",
                                boxSizing: "border-box"
                              }}
                            >
                              {brewmasters.length === 0 ? (
                                <option value="BM-001">BM-001 - Head Brewmaster (Default)</option>
                              ) : (
                                brewmasters.map(bm => (
                                  <option key={bm.id} value={bm.employeeId}>
                                    {bm.employeeId} — {bm.name} ({bm.role || "Brewmaster"})
                                  </option>
                                ))
                              )}
                            </select>

                            {/* Auto-filled details preview badge */}
                            {activeBm && (
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", background: "#ffffff", padding: "10px 14px", borderRadius: "10px", border: "1px solid #86efac" }}>
                                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#09090b", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "bold" }}>
                                  👨‍🍳
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <strong style={{ fontSize: "13.5px", color: "#09090b" }}>{activeBm.name}</strong>
                                    <span style={{ fontSize: "11px", fontWeight: "850", background: "#f4f4f5", padding: "1px 6px", borderRadius: "4px" }}>
                                      {activeBm.employeeId}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                                    {activeBm.role || "Brewmaster"} • {activeBm.phone || "No phone"} • Hours: {workingHours || "8:00 AM - 6:00 PM"}
                                  </span>
                                </div>
                                <span style={{ fontSize: "10.5px", fontWeight: "800", color: "#16a34a", background: "#ecfdf5", padding: "3px 8px", borderRadius: "6px" }}>
                                  ✓ Verified
                                </span>
                              </div>
                            )}
                          </div>

                          {/* 2. LEAVE TYPE SELECTOR */}
                          <div>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#52525b", marginBottom: "6px" }}>
                              Leave / Holiday Category
                            </label>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {["Casual Leave", "Sick Leave", "Emergency Leave", "Festival / Holiday", "Personal Vacation"].map(type => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setSelectedLeaveType(type)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "8px",
                                    border: selectedLeaveType === type ? "1.5px solid #09090b" : "1px solid #e4e4e7",
                                    background: selectedLeaveType === type ? "#09090b" : "#ffffff",
                                    color: selectedLeaveType === type ? "#ffffff" : "#52525b",
                                    fontWeight: "800",
                                    fontSize: "11.5px",
                                    cursor: "pointer"
                                  }}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 3. LEAVE DATES ROW */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div>
                              <label style={{ display: "block", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#52525b", marginBottom: "4px" }}>
                                Start Date <span style={{ color: "#e11d48" }}>*</span>
                              </label>
                              <input
                                type="date"
                                value={leaveStart}
                                onChange={(e) => setLeaveStart(e.target.value)}
                                required
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "13px", fontWeight: "600", boxSizing: "border-box", outline: "none" }}
                              />
                            </div>

                            <div>
                              <label style={{ display: "block", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#52525b", marginBottom: "4px" }}>
                                End Date <span style={{ color: "#e11d48" }}>*</span>
                              </label>
                              <input
                                type="date"
                                value={leaveEnd}
                                onChange={(e) => setLeaveEnd(e.target.value)}
                                required
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "13px", fontWeight: "600", boxSizing: "border-box", outline: "none" }}
                              />
                            </div>
                          </div>

                          {/* DURATION BADGE */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f4f4f5", padding: "8px 12px", borderRadius: "8px" }}>
                            <span style={{ fontSize: "12px", color: "#52525b", fontWeight: "600" }}>Total Leave Duration:</span>
                            <span style={{ fontSize: "13px", fontWeight: "900", color: "#09090b" }}>
                              {diffDays} {diffDays === 1 ? "Day" : "Days"} ({selectedLeaveType})
                            </span>
                          </div>

                          {/* 4. REASON */}
                          <div>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#52525b", marginBottom: "4px" }}>
                              Reason for Leave <span style={{ color: "#e11d48" }}>*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Family function, Medical checkup, Festive holiday"
                              value={newLeaveReason}
                              onChange={(e) => setNewLeaveReason(e.target.value)}
                              required
                              style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1px solid #e4e4e7", fontSize: "13px", boxSizing: "border-box", outline: "none" }}
                            />
                          </div>

                          {/* SUBMIT BUTTON */}
                          <button
                            type="submit"
                            style={{
                              width: "100%",
                              background: "#09090b",
                              color: "#ffffff",
                              border: "none",
                              padding: "13px",
                              borderRadius: "10px",
                              fontWeight: "900",
                              fontSize: "13.5px",
                              cursor: "pointer",
                              letterSpacing: "0.5px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                            }}
                          >
                            SUBMIT LEAVE REQUEST ({diffDays} DAYS) 🚀
                          </button>
                        </form>
                      </div>

                      {/* Applied Leaves Log Table */}
                      <h3 className="section-title" style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "900", color: "#09090b" }}>
                        📋 My Leave Applications & Real-Time Status ({leaveRequests.length})
                      </h3>

                      {/* Desktop Table */}
                      <div className="leave-table-card desktop-only-view" style={{ background: "#ffffff", borderRadius: "18px", border: "1px solid #e4e4e7", overflowX: "auto", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
                          <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: "800", textTransform: "uppercase", fontSize: "11px" }}>
                              <th style={{ padding: "12px 16px" }}>Staff & ID</th>
                              <th style={{ padding: "12px 16px" }}>Leave Dates & Type</th>
                              <th style={{ padding: "12px 16px" }}>Reason</th>
                              <th style={{ padding: "12px 16px", textAlign: "right" }}>Live Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaveRequests.map((req, i) => {
                              const isApproved = req.status === "Approved";
                              const isRejected = req.status === "Rejected";
                              const isPending = !isApproved && !isRejected;

                              return (
                                <tr key={req.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "12px 16px" }}>
                                    <strong style={{ fontSize: "13px", color: "#09090b", display: "block" }}>
                                      {req.brewmasterName || "Brewmaster"}
                                    </strong>
                                    <span style={{ fontSize: "11px", fontWeight: "850", color: "#09090b", background: "#f4f4f5", padding: "1px 6px", borderRadius: "4px" }}>
                                      {req.employeeId || "BM-001"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "12px 16px" }}>
                                    <div style={{ fontWeight: "750", color: "#09090b" }}>
                                      📅 {req.start} to {req.end}
                                    </div>
                                    <span style={{ fontSize: "11px", color: "#71717a" }}>
                                      {req.leaveType || "Casual Leave"} ({req.days || 1} {req.days === 1 ? "day" : "days"})
                                    </span>
                                  </td>
                                  <td style={{ padding: "12px 16px", color: "#334155", maxWidth: "180px" }}>
                                    "{req.reason}"
                                  </td>
                                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-end" }}>
                                      <span style={{
                                        fontSize: "10.5px",
                                        padding: "4px 10px",
                                        borderRadius: "6px",
                                        fontWeight: "850",
                                        background: isApproved ? "#ecfdf5" : isRejected ? "#fef2f2" : "#fffbeb",
                                        color: isApproved ? "#065f46" : isRejected ? "#991b1b" : "#b45309",
                                        border: isApproved ? "1px solid #a7f3d0" : isRejected ? "1px solid #fecaca" : "1px solid #fde68a"
                                      }}>
                                        {isApproved ? "✅ APPROVED" : isRejected ? "❌ REJECTED" : "⏳ PENDING"}
                                      </span>
                                      {req.adminReason && (
                                        <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                                          Admin Note: {req.adminReason}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {leaveRequests.length === 0 && (
                              <tr>
                                <td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "#888", fontStyle: "italic" }}>
                                  No leave requests recorded yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Leave Cards */}
                      <div className="leave-mobile-cards-container mobile-only-view" style={{ display: "none", flexDirection: "column", gap: "10px" }}>
                        {leaveRequests.map((req, i) => (
                          <div key={req.id || i} style={{ background: "#ffffff", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <div>
                                <strong style={{ fontSize: "13px", color: "#09090b" }}>{req.brewmasterName || "Brewmaster"}</strong>
                                <span style={{ fontSize: "10.5px", fontWeight: "800", background: "#f4f4f5", padding: "1px 6px", borderRadius: "4px", marginLeft: "6px" }}>
                                  {req.employeeId || "BM-001"}
                                </span>
                              </div>
                              <span style={{
                                fontSize: "10px",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: "850",
                                background: req.status === "Approved" ? "#ecfdf5" : req.status === "Rejected" ? "#fef2f2" : "#fffbeb",
                                color: req.status === "Approved" ? "#065f46" : req.status === "Rejected" ? "#991b1b" : "#b45309"
                              }}>
                                {req.status || "Pending"}
                              </span>
                            </div>
                            <div style={{ fontSize: "12px", color: "#09090b", fontWeight: "700", marginBottom: "4px" }}>
                              📅 {req.start} to {req.end} ({req.leaveType || "Leave"})
                            </div>
                            <p style={{ fontSize: "12px", color: "#52525b", margin: 0 }}>"{req.reason}"</p>
                            {req.adminReason && (
                              <span style={{ display: "block", marginTop: "4px", fontSize: "10.5px", color: "#d97706", fontWeight: "700" }}>
                                Note: {req.adminReason}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* Right Column: Shift Timing & Guidelines */}
                    <div>
                      <h3 className="section-title" style={{ margin: "0 0 14px 0", fontSize: "16px", fontWeight: "900", color: "#09090b" }}>
                        ⏰ Station Shift & Leave Policy
                      </h3>
                      <div style={{ background: "#ffffff", padding: "22px", borderRadius: "18px", border: "1px solid #e4e4e7", boxShadow: "0 4px 16px rgba(0,0,0,0.02)", marginBottom: "20px" }}>
                        <div style={{ marginBottom: "16px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#71717a", display: "block" }}>Station Operating Hours</span>
                          <div style={{ fontSize: "18px", fontWeight: "900", color: "#09090b", marginTop: "4px" }}>
                            {workingHours || "07:00 AM - 11:00 PM"}
                          </div>
                        </div>

                        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <span style={{ fontSize: "16px" }}>📌</span>
                            <span style={{ fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
                              Submit planned leaves at least <strong>24 hours in advance</strong> so the station manager can adjust brewing batches.
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <span style={{ fontSize: "16px" }}>⚡</span>
                            <span style={{ fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
                              Emergency leaves are immediately marked for review upon submission.
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <span style={{ fontSize: "16px" }}>✅</span>
                            <span style={{ fontSize: "12px", color: "#334155", lineHeight: 1.4 }}>
                              Once the building admin approves, the live status updates on this screen automatically.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Active Brewmaster Card */}
                      {activeBm && (
                        <div style={{ background: "linear-gradient(135deg, #09090b 0%, #27272a 100%)", color: "#ffffff", padding: "22px", borderRadius: "18px", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                          <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#a1a1aa", display: "block", marginBottom: "4px" }}>
                            My Brewmaster Profile
                          </span>
                          <h4 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "900", color: "#ffffff" }}>
                            {activeBm.name}
                          </h4>
                          <span style={{ fontSize: "12.5px", color: "#e4e4e7", fontWeight: "700", display: "block" }}>
                            🆔 Employee ID: {activeBm.employeeId}
                          </span>
                          <span style={{ fontSize: "11.5px", color: "#a1a1aa", display: "block", marginTop: "2px" }}>
                            Role: {activeBm.role || "Head Brewmaster"} • Hours: {workingHours || "8:00 AM - 6:00 PM"}
                          </span>
                          {activeBm.address && (
                            <div style={{ marginTop: "12px", background: "rgba(255,255,255,0.08)", padding: "8px 12px", borderRadius: "8px", fontSize: "11px", color: "#d4d4d8" }}>
                              🏠 Address: {activeBm.address}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })()}

            {activeTab === "profile" && (
              <div className="tab-body-wrapper profile-tab-body">
                <div className="dashboard-double-row-grid profile-two-col-grid" style={{ marginBottom: "24px" }}>

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
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (newPassword !== confirmPassword) {
                          setPasswordMessage("Error: Passwords do not match!");
                          return;
                        }
                        try {
                          await updatePassword(auth.currentUser, newPassword);
                          setPasswordMessage("Password updated successfully!");
                          setNewPassword("");
                          setConfirmPassword("");
                        } catch (err) {
                          setPasswordMessage("Error: " + err.message);
                        }
                      }}
                      style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.04)", marginTop: "24px" }}
                    >
                      <h4 style={{ fontSize: "14px", margin: "0 0 16px", color: "#2c1b0d" }}>Change Access Password</h4>
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Current Password (Optional if recently logged in)</label>
                        <input
                          type="password"
                          placeholder="Current password"
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
                          setToastMsg("✅ Kitchen Station configuration updated!");
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

            {/* TAB: OFFLINE & WALK-IN ORDERS (AUTOMATIC PRICE CALCULATION & PAST DATE ORDERS) */}
            {activeTab === "offline" && (() => {
              const calculatedTotal = offlineOrderForm.items.reduce((sum, it) => sum + (it.priceNum || 40) * it.qty, 0);
              const totalItemsCount = offlineOrderForm.items.reduce((acc, item) => acc + item.qty, 0);
              const todayIso = new Date().toLocaleDateString('en-CA');
              const isPastOrder = offlineOrderForm.orderDate && offlineOrderForm.orderDate < todayIso;

              return (
                <div className="tab-body-wrapper" style={{ padding: "28px 32px" }}>
                  <div style={{ marginBottom: "20px" }}>
                    <h3 className="section-title" style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "#09090b" }}>Offline & Counter Walk-in Orders</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#71717a" }}>Create immediate counter sales or record past offline orders with manual date selection to automatically sync sales, tally & reports</p>
                  </div>

                  {/* TOP ROW: 2 COLUMNS (LEFT: Date, Customer & Payment, RIGHT: Kitchen Prep Items) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "24px", marginBottom: "24px" }} className="dashboard-double-row-grid">
                    {/* Left Column: Date, Customer & Destination */}
                    <div style={{ background: "#ffffff", padding: "22px", borderRadius: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: "18px" }}>

                      {/* DATE & TIME SELECTION SECTION */}
                      <div style={{ background: isPastOrder ? "#fffbeb" : "#f8fafc", padding: "16px", borderRadius: "14px", border: isPastOrder ? "1.5px solid #fcd34d" : "1.5px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "850", color: isPastOrder ? "#92400e" : "#09090b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                            📅 Order Date & Time {isPastOrder ? "(Past Date Entry)" : "(Current Date)"}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: "800", padding: "3px 8px", borderRadius: "6px", background: isPastOrder ? "#fef3c7" : "#dcfce7", color: isPastOrder ? "#b45309" : "#166534" }}>
                            {isPastOrder ? "🗓️ Past Record" : "🟢 Live Order"}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>Order Date</label>
                            <input
                              type="date"
                              value={offlineOrderForm.orderDate || todayIso}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                const isPast = newDate && newDate < todayIso;
                                setOfflineOrderForm({
                                  ...offlineOrderForm,
                                  orderDate: newDate,
                                  status: isPast ? "Delivered" : (offlineOrderForm.status || "Delivered")
                                });
                              }}
                              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", background: "#ffffff", fontSize: "13px", color: "#09090b", fontWeight: "600", outline: "none", boxSizing: "border-box" }}
                            />
                          </div>

                          <div>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>Order Time</label>
                            <input
                              type="time"
                              value={offlineOrderForm.orderTime || "12:00"}
                              onChange={(e) => setOfflineOrderForm({ ...offlineOrderForm, orderTime: e.target.value })}
                              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #cbd5e1", background: "#ffffff", fontSize: "13px", color: "#09090b", fontWeight: "600", outline: "none", boxSizing: "border-box" }}
                            />
                          </div>
                        </div>

                        {/* Quick Date Shortcuts */}
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: "#71717a", fontWeight: "700" }}>Quick Pick:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setOfflineOrderForm({ ...offlineOrderForm, orderDate: todayIso, orderTime: new Date().toTimeString().slice(0, 5), status: "Received" });
                            }}
                            style={{ background: (!offlineOrderForm.orderDate || offlineOrderForm.orderDate === todayIso) ? "#09090b" : "#ffffff", color: (!offlineOrderForm.orderDate || offlineOrderForm.orderDate === todayIso) ? "#ffffff" : "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "3px 10px", fontSize: "11.5px", fontWeight: "700", cursor: "pointer" }}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const y = new Date();
                              y.setDate(y.getDate() - 1);
                              const yIso = y.toLocaleDateString('en-CA');
                              setOfflineOrderForm({ ...offlineOrderForm, orderDate: yIso, status: "Delivered" });
                            }}
                            style={{ background: (offlineOrderForm.orderDate === (() => { const y = new Date(); y.setDate(y.getDate() - 1); return y.toLocaleDateString('en-CA'); })()) ? "#09090b" : "#ffffff", color: (offlineOrderForm.orderDate === (() => { const y = new Date(); y.setDate(y.getDate() - 1); return y.toLocaleDateString('en-CA'); })()) ? "#ffffff" : "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "3px 10px", fontSize: "11.5px", fontWeight: "700", cursor: "pointer" }}
                          >
                            Yesterday
                          </button>
                        </div>
                      </div>

                      {/* CUSTOMER & DESTINATION */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <label style={{ fontSize: "11.5px", fontWeight: "800", color: "#52525b", textTransform: "uppercase" }}>
                            Customer Details <span style={{ color: "#e11d48" }}>*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setOfflineOrderForm({ ...offlineOrderForm, customerName: "Counter Walk-in Guest", walkIn: true, address: "Walk-in Counter" })}
                            style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", color: "#475569", fontWeight: "700", cursor: "pointer" }}
                          >
                            + Fast Guest Name
                          </button>
                        </div>

                        {/* Customer Name */}
                        <div style={{ marginBottom: "12px" }}>
                          <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "4px" }}>
                            Customer Name <span style={{ color: "#e11d48" }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={offlineOrderForm.customerName}
                            onChange={e => setOfflineOrderForm({ ...offlineOrderForm, customerName: e.target.value })}
                            style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e4e4e7", background: "#f8fafc", fontSize: "13.5px", color: "#09090b", outline: "none", boxSizing: "border-box" }}
                            placeholder="e.g. Rahul Sharma"
                          />
                        </div>

                        {/* Mobile Number (REQUIRED +91 PREFIX) */}
                        <div style={{ marginBottom: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <label style={{ fontSize: "11px", fontWeight: "800", color: "#09090b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                              📱 Mobile Number <span style={{ color: "#e11d48" }}>* (Required)</span>
                            </label>
                            <span style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: "700" }}>💬 Auto WhatsApp Msg</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "10px 12px",
                              background: "#f1f5f9",
                              border: (!offlineOrderForm.phone || offlineOrderForm.phone.replace(/\D/g, '').length < 10) ? "1.5px solid #fca5a5" : "1.5px solid #86efac",
                              borderRight: "none",
                              borderRadius: "10px 0 0 10px",
                              fontSize: "13.5px",
                              fontWeight: "800",
                              color: "#0f172a",
                              userSelect: "none"
                            }}>
                              🇮🇳 +91
                            </span>
                            <input
                              type="tel"
                              value={offlineOrderForm.phone}
                              onChange={e => {
                                let raw = e.target.value.replace(/\D/g, '');
                                if (raw.startsWith('91') && raw.length > 10) {
                                  raw = raw.slice(2);
                                } else if (raw.startsWith('0') && raw.length > 10) {
                                  raw = raw.slice(1);
                                }
                                setOfflineOrderForm({ ...offlineOrderForm, phone: raw.slice(0, 10) });
                              }}
                              style={{
                                flex: 1,
                                padding: "10px 14px",
                                borderRadius: "0 10px 10px 0",
                                border: (!offlineOrderForm.phone || offlineOrderForm.phone.replace(/\D/g, '').length < 10) ? "1.5px solid #fca5a5" : "1.5px solid #86efac",
                                background: (!offlineOrderForm.phone || offlineOrderForm.phone.replace(/\D/g, '').length < 10) ? "#fff5f5" : "#f0fdf4",
                                fontSize: "14px",
                                color: "#09090b",
                                fontWeight: "700",
                                letterSpacing: "0.5px",
                                outline: "none",
                                boxSizing: "border-box"
                              }}
                              placeholder="Enter 10-digit mobile (e.g. 9876543210)"
                            />
                          </div>
                          <span style={{ fontSize: "11px", color: "#71717a", display: "block", marginTop: "4px" }}>
                            An instant WhatsApp confirmation message with order details will be sent to +91 {offlineOrderForm.phone || "XXXXXXXXXX"} upon placing.
                          </span>
                        </div>

                        {/* Walk-in vs Delivery Toggle */}
                        <div style={{ marginBottom: "12px", background: "#f8fafc", padding: "10px 12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12.5px", cursor: "pointer", fontWeight: "750", color: "#09090b" }}>
                            <input
                              type="checkbox"
                              checked={offlineOrderForm.walkIn}
                              onChange={e => setOfflineOrderForm({ ...offlineOrderForm, walkIn: e.target.checked, address: e.target.checked ? "Walk-in Counter" : "" })}
                              style={{ width: "16px", height: "16px", accentColor: "#000000" }}
                            />
                            Walk-in / Counter Pickup (Direct Counter Handover)
                          </label>
                        </div>

                        {!offlineOrderForm.walkIn && (
                          <div style={{ marginBottom: "12px" }}>
                            <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#52525b", textTransform: "uppercase", marginBottom: "4px" }}>Desk / Office Location</label>
                            <input
                              type="text"
                              value={offlineOrderForm.address}
                              onChange={e => setOfflineOrderForm({ ...offlineOrderForm, address: e.target.value })}
                              style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #e4e4e7", background: "#f8fafc", fontSize: "13px", color: "#09090b", outline: "none", boxSizing: "border-box" }}
                              placeholder="e.g. Floor 2, Cabin 204"
                            />
                          </div>
                        )}
                      </div>

                      {/* STATUS & SETTLEMENT */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#52525b", textTransform: "uppercase", marginBottom: "4px" }}>Order Status</label>
                          <select
                            value={offlineOrderForm.status || (isPastOrder ? "Delivered" : "Received")}
                            onChange={(e) => setOfflineOrderForm({ ...offlineOrderForm, status: e.target.value })}
                            style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #e4e4e7", background: "#f8fafc", fontSize: "12.5px", color: "#09090b", fontWeight: "700", outline: "none" }}
                          >
                            <option value="Received">📥 Received (Kitchen Queue)</option>
                            <option value="Preparing">🫖 Preparing (Brewing)</option>
                            <option value="Delivered">✅ Delivered (Completed)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: "11px", fontWeight: "800", color: "#52525b", textTransform: "uppercase", marginBottom: "4px" }}>Payment Method</label>
                          <select
                            value={offlineOrderForm.paymentMethod || "Cash"}
                            onChange={(e) => setOfflineOrderForm({ ...offlineOrderForm, paymentMethod: e.target.value })}
                            style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1.5px solid #e4e4e7", background: "#f8fafc", fontSize: "12.5px", color: "#09090b", fontWeight: "700", outline: "none" }}
                          >
                            <option value="Cash">💵 Cash</option>
                            <option value="UPI / QR">📱 UPI / QR</option>
                            <option value="Card">💳 Card / POS</option>
                            <option value="Corporate Bill">🏢 Corporate Account</option>
                          </select>
                        </div>
                      </div>

                      {/* Automatic Price Box */}
                      <div style={{ padding: "14px 16px", borderRadius: "12px", background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11.5px", color: "#15803d", fontWeight: "bold", textTransform: "uppercase" }}>⚡ Auto-Calculated Price</span>
                          <span style={{ fontSize: "11px", color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                            {totalItemsCount} {totalItemsCount === 1 ? "Item" : "Items"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: "13px", color: "#166534", fontWeight: "600" }}>Total Order Value:</span>
                          <strong style={{ fontSize: "22px", color: "#15803d", fontWeight: "900" }}>
                            ₹{calculatedTotal}
                          </strong>
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Kitchen Prep Items */}
                    <div style={{ background: "#ffffff", padding: "22px", borderRadius: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "850", color: "#09090b" }}>Order Products & Chai</h4>
                            <span style={{ fontSize: "12px", color: "#71717a" }}>Selected Chai & Snacks</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsOfflineItemModalOpen(true)}
                            style={{ background: "#000000", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "800", fontSize: "12.5px" }}
                          >
                            + Select Products
                          </button>
                        </div>

                        <div style={{ maxHeight: "250px", minHeight: "160px", overflowY: "auto", border: "1px solid #f1f5f9", borderRadius: "12px", padding: "12px", marginBottom: "16px", background: "#fafafa" }}>
                          {offlineOrderForm.items.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#71717a", fontSize: "13px", padding: "45px 0" }}>
                              No items selected yet. Click "+ Select Products" to add items and calculate price automatically.
                            </div>
                          ) : (
                            offlineOrderForm.items.map((item, idx) => {
                              const unitPrice = item.priceNum || 40;
                              const lineTotal = unitPrice * item.qty;
                              return (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", marginBottom: "8px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <img src={getProductMeta(item.name, item.image, item.category).image} alt={item.name} style={{ width: "38px", height: "38px", borderRadius: "8px", objectFit: "cover" }} />
                                    <div>
                                      <strong style={{ display: "block", fontSize: "13.5px", color: "#09090b" }}>{item.name}</strong>
                                      <span style={{ color: "#166534", fontSize: "12px", fontWeight: "bold" }}>
                                        ₹{unitPrice} × {item.qty} = ₹{lineTotal}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "12px", background: "#f4f4f5", padding: "3px 8px", borderRadius: "6px", fontWeight: "800", color: "#09090b" }}>{item.qty}x</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = offlineOrderForm.items.filter((_, i) => i !== idx);
                                        const newTotal = updated.reduce((s, it) => s + (it.priceNum || 40) * it.qty, 0);
                                        setOfflineOrderForm({ ...offlineOrderForm, items: updated, totalPrice: String(newTotal) });
                                      }}
                                      style={{ background: "#f4f4f5", color: "#e11d48", border: "1px solid #e4e4e7", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}
                                    >✕</button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "12px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                          <div>
                            <span style={{ fontSize: "13px", fontWeight: "800", color: "#09090b", display: "block" }}>Total Order Summary:</span>
                            <span style={{ fontSize: "11.5px", color: "#71717a" }}>{totalItemsCount} items selected • {offlineOrderForm.orderDate || todayIso}</span>
                          </div>
                          <span style={{ background: "#16a34a", color: "#ffffff", padding: "6px 16px", borderRadius: "8px", fontWeight: "900", fontSize: "16px" }}>
                            ₹{calculatedTotal}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!offlineOrderForm.customerName || !offlineOrderForm.customerName.trim()) {
                              setToastMsg("❌ Please enter customer name!");
                              setTimeout(() => setToastMsg(""), 3000);
                              return;
                            }

                            const cleanPhoneDigits = String(offlineOrderForm.phone || "").replace(/\D/g, "");
                            if (!cleanPhoneDigits || cleanPhoneDigits.length < 10) {
                              setToastMsg("❌ Mobile number is required (at least 10 digits) to place order & send WhatsApp!");
                              setTimeout(() => setToastMsg(""), 4000);
                              return;
                            }

                            if (offlineOrderForm.items.length === 0) {
                              setToastMsg("❌ Please select at least one product!");
                              setTimeout(() => setToastMsg(""), 3000);
                              return;
                            }

                            const orderDateVal = offlineOrderForm.orderDate || todayIso;
                            const orderTimeVal = offlineOrderForm.orderTime || new Date().toTimeString().slice(0, 5);
                            const parsedDate = new Date(`${orderDateVal}T${orderTimeVal}:00`);
                            const createdAtTimestamp = !isNaN(parsedDate.getTime()) ? parsedDate.getTime() : Date.now();
                            const formattedDate = new Date(createdAtTimestamp).toLocaleDateString('en-GB');
                            const isPast = orderDateVal < todayIso;
                            const finalStatus = offlineOrderForm.status || (isPast ? "Delivered" : "Received");
                            const tenDigitNumber = cleanPhoneDigits.slice(-10);
                            const customerPhoneFormatted = `+91${tenDigitNumber}`;

                            const orderData = {
                              customer: offlineOrderForm.customerName.trim(),
                              phone: customerPhoneFormatted,
                              mobile: customerPhoneFormatted,
                              address: offlineOrderForm.address || (offlineOrderForm.walkIn ? "Counter Walk-in" : "Direct Pickup"),
                              office: offlineOrderForm.address || (offlineOrderForm.walkIn ? "Counter Walk-in" : "Direct Pickup"),
                              walkIn: Boolean(offlineOrderForm.walkIn),
                              isOffline: true,
                              offlineAdded: true,
                              paymentStatus: offlineOrderForm.paymentStatus || "Paid",
                              paymentMethod: offlineOrderForm.paymentMethod || "Cash",
                              status: finalStatus,
                              total: `₹${calculatedTotal}`,
                              priceNum: calculatedTotal,
                              createdAt: createdAtTimestamp,
                              date: formattedDate,
                              item: offlineOrderForm.items.map(i => `${i.name} x${i.qty}`).join(", "),
                              items: offlineOrderForm.items.map(i => {
                                const m = getProductMeta(i.name, i.image, i.category);
                                return { name: i.name, quantity: i.qty, price: i.priceNum || 40, image: m.image, category: m.category };
                              }),
                              img: getProductMeta(offlineOrderForm.items[0]?.name, offlineOrderForm.items[0]?.image, offlineOrderForm.items[0]?.category).image
                            };

                            try {
                              const createdOrderId = await createOrder(orderData);
                              const assignedId = typeof createdOrderId === 'string' ? createdOrderId : (createdOrderId?.id || `ORD-${Date.now().toString().slice(-6)}`);

                              setToastMsg(`✅ Offline Order #${assignedId} placed (₹${calculatedTotal}) & WhatsApp sent to ${customerPhoneFormatted}!`);
                              setOfflineOrderForm({
                                customerName: "",
                                address: "",
                                phone: "",
                                walkIn: true,
                                orderDate: todayIso,
                                orderTime: new Date().toTimeString().slice(0, 5),
                                status: "Received",
                                paymentMethod: "Cash",
                                paymentStatus: "Paid",
                                items: []
                              });
                              setTimeout(() => setToastMsg(""), 4500);
                            } catch (e) {
                              setToastMsg("❌ Error creating order: " + e.message);
                              setTimeout(() => setToastMsg(""), 3000);
                            }
                          }}
                          style={{ background: "#000000", color: "#ffffff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "900", cursor: "pointer", width: "100%", fontSize: "14px", letterSpacing: "0.5px" }}
                        >
                          SAVE OFFLINE ORDER (₹{calculatedTotal}) ☕
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* MODAL: SELECT CHAI & PRODUCTS FOR OFFLINE COUNTER (AUTO PRICE) */}
            {isOfflineItemModalOpen && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.6)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 9999,
                  backdropFilter: "blur(4px)"
                }}
                onClick={() => setIsOfflineItemModalOpen(false)}
              >
                <div
                  className="pos-modal-card"
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: "100%",
                    maxWidth: "700px",
                    maxHeight: "88vh",
                    padding: "24px 28px",
                    borderRadius: "20px",
                    border: "1px solid #e4e4e7",
                    background: "#ffffff",
                    boxShadow: "0 25px 60px -15px rgba(0,0,0,0.3)",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "900", color: "#09090b" }}>Select Products (Price Auto-Added)</h3>
                      <span style={{ fontSize: "12px", color: "#71717a" }}>Tap items to add into order with automatic price calculation</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOfflineItemModalOpen(false)}
                      style={{
                        background: "#f4f4f5",
                        border: "none",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                        color: "#52525b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="pos-modal-product-grid" style={{ maxHeight: "440px", overflowY: "auto", display: "grid", gap: "12px", paddingRight: "10px" }}>
                    {productsList.length === 0 ? <p style={{ color: "#71717a" }}>Loading menu items...</p> : productsList.map(prod => {
                      const prodPrice = typeof prod.price === "number" ? prod.price : parseFloat(String(prod.price || prod.basePrice || 40).replace(/[^\d.]/g, "")) || 40;
                      const existing = offlineOrderForm.items.find(i => i.id === prod.id);

                      return (
                        <div key={prod.id} style={{ display: "flex", gap: "12px", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "12px", alignItems: "center", background: existing ? "#f0fdf4" : "#ffffff", borderColor: existing ? "#86efac" : "#e2e8f0", transition: "all 0.2s ease" }}>
                          <img src={getProductMeta(prod.name, prod.image || prod.imagePath || prod.img, prod.category).image} alt={prod.name} style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "10px", border: "1px solid #e4e4e7" }} />
                          <div style={{ flexGrow: 1, minWidth: 0 }}>
                            <strong style={{ display: "block", fontSize: "13.5px", color: "#09090b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prod.name}</strong>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "900", color: "#16a34a" }}>₹{prodPrice}</span>
                              <span style={{ fontSize: "11px", color: "#71717a" }}>• {getProductMeta(prod.name, prod.image, prod.category).category}</span>
                            </div>
                          </div>
                          {existing ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ffffff", borderRadius: "8px", padding: "4px", border: "1px solid #86efac" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  let updated;
                                  if (existing.qty > 1) {
                                    updated = offlineOrderForm.items.map(i => i.id === prod.id ? { ...i, qty: i.qty - 1 } : i);
                                  } else {
                                    updated = offlineOrderForm.items.filter(i => i.id !== prod.id);
                                  }
                                  const newSum = updated.reduce((s, it) => s + (it.priceNum || 40) * it.qty, 0);
                                  setOfflineOrderForm({ ...offlineOrderForm, items: updated, totalPrice: String(newSum) });
                                }}
                                style={{ background: "#000000", color: "#fff", border: "none", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: "13px", fontWeight: "900", width: "20px", textAlign: "center", color: "#09090b" }}>{existing.qty}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = offlineOrderForm.items.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i);
                                  const newSum = updated.reduce((s, it) => s + (it.priceNum || 40) * it.qty, 0);
                                  setOfflineOrderForm({ ...offlineOrderForm, items: updated, totalPrice: String(newSum) });
                                }}
                                style={{ background: "#000000", color: "#fff", border: "none", width: "24px", height: "24px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const m = getProductMeta(prod.name, prod.image || prod.imagePath || prod.img, prod.category);
                                const updated = [...offlineOrderForm.items, { id: prod.id, name: prod.name, priceNum: prodPrice, image: m.image, category: m.category, qty: 1 }];
                                const newSum = updated.reduce((s, it) => s + (it.priceNum || 40) * it.qty, 0);
                                setOfflineOrderForm({ ...offlineOrderForm, items: updated, totalPrice: String(newSum) });
                              }}
                              style={{ background: "#000000", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                            >
                              + Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                    <div style={{ fontSize: "13px", color: "#09090b", flexGrow: 1, paddingRight: "20px" }}>
                      {offlineOrderForm.items.length > 0 ? (
                        <span>
                          <strong>Selected: </strong>
                          {offlineOrderForm.items.map(i => `${i.qty}x ${i.name} (₹${(i.priceNum || 40) * i.qty})`).join(", ")}
                          <strong style={{ marginLeft: "8px", color: "#16a34a" }}>• Total: ₹{offlineOrderForm.items.reduce((s, it) => s + (it.priceNum || 40) * it.qty, 0)}</strong>
                        </span>
                      ) : (
                        <span style={{ color: "#71717a" }}>No items selected yet. Tap '+ Add' to select.</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOfflineItemModalOpen(false);
                      }}
                      style={{ background: "#000000", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap", fontSize: "13px" }}
                    >
                      Done ✓
                    </button>
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
                      <img src={getProductMeta(o.item || (Array.isArray(o.items) && o.items[0]?.name), o.img || o.image).image} alt={o.item} className="sidebar-product-img" />

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

          {/* SLIDE-IN RIGHT SIDEBAR: TODAY'S ORDERS & PRODUCT DELIVERY TALLY */}
          <div
            className={`today-stats-drawer-overlay ${showTodayStatsSidebar ? "open" : ""}`}
            onClick={() => setShowTodayStatsSidebar(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
              zIndex: 99998,
              opacity: showTodayStatsSidebar ? 1 : 0,
              pointerEvents: showTodayStatsSidebar ? "auto" : "none",
              transition: "opacity 0.25s ease-in-out"
            }}
          />

          <aside
            className="today-stats-drawer-panel"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              maxWidth: "480px",
              background: "#ffffff",
              boxShadow: "-10px 0 30px rgba(0,0,0,0.2)",
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              transform: showTodayStatsSidebar ? "translateX(0)" : "translateX(100%)",
              transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              overflow: "hidden"
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: "20px 22px",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              background: "linear-gradient(135deg, #18181b, #09090b)",
              color: "#ffffff"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "18px" }}>📊</span>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "900", color: "#ffffff" }}>
                    Daily Product & Orders Tally
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: "12px", color: "#a1a1aa" }}>
                  Total orders, quantity delivered vs preparing, and product item breakdown
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowTodayStatsSidebar(false)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: "bold",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s ease"
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px", background: "#fcfcfc" }}>

              {/* 1. Date Filter Controls */}
              <div style={{ background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "12px", padding: "14px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#18181b", display: "block", marginBottom: "8px" }}>
                  📅 Select Date to View Stats
                </span>

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {[
                    { id: "today", label: "Today" },
                    { id: "yesterday", label: "Yesterday" },
                    { id: "7days", label: "Last 7 Days" },
                    { id: "all", label: "All Time" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTallyDateFilter(tab.id)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        fontWeight: "750",
                        cursor: "pointer",
                        border: tallyDateFilter === tab.id ? "1px solid #d97706" : "1px solid #e4e4e7",
                        background: tallyDateFilter === tab.id ? "#fffbeb" : "#ffffff",
                        color: tallyDateFilter === tab.id ? "#b45309" : "#52525b"
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11.5px", color: "#71717a", fontWeight: "600" }}>Or Custom Date:</span>
                  <input
                    type="date"
                    value={customTallyDate}
                    onChange={(e) => {
                      setCustomTallyDate(e.target.value);
                      setTallyDateFilter(e.target.value);
                    }}
                    style={{
                      padding: "5px 10px",
                      border: "1px solid #d4d4d8",
                      borderRadius: "6px",
                      fontSize: "12px",
                      outline: "none",
                      background: "#fafafa",
                      cursor: "pointer",
                      flex: 1
                    }}
                  />
                </div>
              </div>

              {/* 2. Key Metrics Summary Grid (Order Counts & Fulfillment Metrics - Zero Revenue) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* Total Orders Card */}
                <div style={{ background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#71717a", textTransform: "uppercase" }}>📦 Total Orders</span>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#09090b", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.totalOrders}
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#52525b" }}>
                    🌐 {dailyStatsAndProductTally.onlineOrdersCount} Online • 🏪 {dailyStatsAndProductTally.offlineOrdersCount} Offline
                  </span>
                </div>

                {/* Delivered Orders Card */}
                <div style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", border: "1px solid #a7f3d0", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#047857", textTransform: "uppercase" }}>✅ Delivered Orders</span>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#065f46", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.deliveredOrdersCount} <span style={{ fontSize: "12px", fontWeight: "700", color: "#047857" }}>orders</span>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#047857", fontWeight: "600" }}>
                    Fulfilled & served successfully
                  </span>
                </div>

                {/* In Prep / Active Orders Card */}
                <div style={{ background: "linear-gradient(135deg, #fff7ed, #ffedd5)", border: "1px solid #fed7aa", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#c2410c", textTransform: "uppercase" }}>🫖 In Prep / Active</span>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#9a3412", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.preparingOrdersCount + dailyStatsAndProductTally.receivedOrdersCount} <span style={{ fontSize: "12px", fontWeight: "700", color: "#c2410c" }}>orders</span>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#c2410c" }}>
                    📥 {dailyStatsAndProductTally.receivedOrdersCount} Received • 🫖 {dailyStatsAndProductTally.preparingOrdersCount} In Prep
                  </span>
                </div>

                {/* Total Cups / Items Delivered Card */}
                <div style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "12px 14px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "750", color: "#1d4ed8", textTransform: "uppercase" }}>☕ Total Cups Delivered</span>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#1e40af", margin: "4px 0 2px" }}>
                    {dailyStatsAndProductTally.totalUnitsDelivered} <span style={{ fontSize: "12px", fontWeight: "600", color: "#1d4ed8" }}>/ {dailyStatsAndProductTally.totalUnitsOrdered} total</span>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#1d4ed8" }}>
                    ⏳ {dailyStatsAndProductTally.totalUnitsPreparing} cups in queue
                  </span>
                </div>
              </div>

              {/* 3. Product-by-Product Delivery Breakdown */}
              <div style={{ background: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "12px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "900", color: "#09090b" }}>
                      🍵 Product Delivery Breakdown
                    </h4>
                    <span style={{ fontSize: "11px", color: "#71717a" }}>
                      {dailyStatsAndProductTally.productList.length} products ordered on this date
                    </span>
                  </div>

                  {/* Search Product Filter */}
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={tallySearchTerm}
                    onChange={(e) => setTallySearchTerm(e.target.value)}
                    style={{
                      padding: "4px 10px",
                      border: "1px solid #e4e4e7",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      outline: "none",
                      width: "140px",
                      background: "#fafafa"
                    }}
                  />
                </div>

                {/* List of Products */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {dailyStatsAndProductTally.productList.length === 0 ? (
                    <div style={{ padding: "32px 16px", textAlign: "center", color: "#71717a" }}>
                      <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>🫖</span>
                      <strong style={{ fontSize: "13px", color: "#18181b", display: "block" }}>No products ordered on this date</strong>
                      <span style={{ fontSize: "11.5px" }}>Select another date above to view product sales and deliveries.</span>
                    </div>
                  ) : (
                    dailyStatsAndProductTally.productList
                      .filter(p => !tallySearchTerm || p.name.toLowerCase().includes(tallySearchTerm.toLowerCase()))
                      .map((p, idx) => {
                        const deliveredPct = p.totalQty > 0 ? Math.round((p.deliveredQty / p.totalQty) * 100) : 0;
                        return (
                          <div
                            key={idx}
                            style={{
                              border: "1px solid #f0f0f0",
                              borderRadius: "10px",
                              padding: "10px 12px",
                              background: "#fafafa",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <img
                                src={p.image || "/logo.png"}
                                alt={p.name}
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "8px",
                                  objectFit: "cover",
                                  border: "1px solid #e4e4e7",
                                  flexShrink: 0
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <strong style={{ fontSize: "13px", color: "#09090b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {p.name}
                                  </strong>
                                  <span style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    color: p.deliveredQty === p.totalQty ? "#16a34a" : "#d97706",
                                    background: p.deliveredQty === p.totalQty ? "#ecfdf5" : "#fffbeb",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    border: p.deliveredQty === p.totalQty ? "1px solid #a7f3d0" : "1px solid #fde68a",
                                    whiteSpace: "nowrap"
                                  }}>
                                    {p.deliveredQty}/{p.totalQty} Delivered
                                  </span>
                                </div>
                                <span style={{ fontSize: "10.5px", color: "#71717a" }}>
                                  Category: {getProductMeta(p.name, p.image, p.category).category}
                                </span>
                              </div>
                            </div>

                            {/* Metrics Row: Total Ordered, Delivered, In Prep */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                              <span style={{
                                fontSize: "11px",
                                fontWeight: "750",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: "#f4f4f5",
                                color: "#18181b",
                                border: "1px solid #e4e4e7"
                              }}>
                                📦 Total: <strong>{p.totalQty}</strong>
                              </span>

                              <span style={{
                                fontSize: "11px",
                                fontWeight: "750",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: "#ecfdf5",
                                color: "#065f46",
                                border: "1px solid #a7f3d0"
                              }}>
                                ✅ Delivered: <strong>{p.deliveredQty}</strong>
                              </span>

                              <span style={{
                                fontSize: "11px",
                                fontWeight: "750",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                background: (p.preparingQty + p.receivedQty) > 0 ? "#fff7ed" : "#f4f4f5",
                                color: (p.preparingQty + p.receivedQty) > 0 ? "#9a3412" : "#71717a",
                                border: "1px solid #fed7aa"
                              }}>
                                ⏳ In Prep: <strong>{p.preparingQty + p.receivedQty}</strong>
                              </span>
                            </div>

                            {/* Delivery Progress Bar */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ flex: 1, height: "6px", background: "#e4e4e7", borderRadius: "3px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${deliveredPct}%`,
                                    background: deliveredPct === 100 ? "#16a34a" : "linear-gradient(90deg, #f59e0b, #10b981)",
                                    borderRadius: "3px",
                                    transition: "width 0.3s ease"
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: "10px", fontWeight: "800", color: "#52525b", minWidth: "30px", textAlign: "right" }}>
                                {deliveredPct}%
                              </span>
                            </div>

                          </div>
                        );
                      })
                  )}
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div style={{ padding: "14px 20px", borderTop: "1px solid #e4e4e7", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#71717a", fontWeight: "600" }}>
                Active Date: <strong style={{ color: "#09090b" }}>{tallyDateFilter === "today" ? "Today" : tallyDateFilter === "yesterday" ? "Yesterday" : tallyDateFilter === "7days" ? "Last 7 Days" : tallyDateFilter}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowTodayStatsSidebar(false)}
                style={{
                  padding: "7px 16px",
                  background: "#18181b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "750",
                  cursor: "pointer"
                }}
              >
                Close Drawer
              </button>
            </div>
          </aside>

        </div>
      )}

      {/* HIGH-IMPACT BLACK & WHITE ALERT POPUP (RINGS UNTIL CONFIRMED) */}
      {incomingOrder && (
        <div className="bw-alert-overlay">
          <div className="bw-alert-modal">

            {/* Top Indicator Bar */}
            <div className="bw-alert-top-badge">
              <div className="bw-pulsing-circle">
                <span className="bw-pulsing-dot" />
              </div>
              <span className="bw-badge-label">🚨 LIVE ORDER RECEIVED • RINGTONE RINGING</span>
              <button
                type="button"
                onClick={stopAlertRinging}
                className="bw-mute-pill-btn"
                title="Silence Ringtone"
              >
                🔇 Silence
              </button>
            </div>

            {/* Header */}
            <div className="bw-modal-header">
              <h2 className="bw-modal-title">Fresh Chai Order Incoming!</h2>
              <p className="bw-modal-subtitle">
                A customer desk delivery order has arrived. Keep brewing hot and fresh. Tap confirm to acknowledge and start brewing.
              </p>
            </div>

            {/* Core Details Box */}
            <div className="bw-order-summary-box">
              <div className="bw-order-id-bar">
                <span className="bw-order-id">
                  ORDER #{incomingOrder.id ? (typeof incomingOrder.id === "string" ? incomingOrder.id.slice(-6).toUpperCase() : incomingOrder.id) : "LIVE"}
                </span>
                <span className="bw-payment-badge">
                  📦 {incomingOrder.walkIn ? "Counter Pickup" : "Desk Runner Service"}
                </span>
              </div>

              <div className="bw-order-details-grid">
                {/* Desk / Recipient */}
                <div className="bw-info-block">
                  <span className="bw-info-label">📍 DESK DELIVERY DESTINATION</span>
                  <strong className="bw-info-value">{incomingOrder.customer || incomingOrder.customerName || "Corporate Client"}</strong>
                  <span className="bw-info-sub">
                    {incomingOrder.office ? `Office: ${incomingOrder.office}` : ""}
                    {incomingOrder.floor ? ` • Floor: ${incomingOrder.floor}` : ""}
                  </span>
                  {incomingOrder.phone && (
                    <span className="bw-info-phone">📞 {incomingOrder.phone}</span>
                  )}
                </div>

                {/* Fulfillment & Kitchen Priority */}
                <div className="bw-info-block right">
                  <span className="bw-info-label">⚡ FULFILLMENT MODE</span>
                  <strong className="bw-info-price" style={{ fontSize: "16px", letterSpacing: "0", color: "#09090b" }}>
                    {incomingOrder.walkIn ? "Counter Pickup" : "Desk Delivery"}
                  </strong>
                  <span className="bw-info-sub">{incomingOrder.priority || "Hot Chai Delivery"}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="bw-items-container">
                <span className="bw-items-heading">ORDER ITEMS & CUSTOMIZATION</span>
                {Array.isArray(incomingOrder.items) && incomingOrder.items.length > 0 ? (
                  <div className="bw-items-scroll">
                    {incomingOrder.items.map((it, idx) => (
                      <div key={idx} className="bw-item-row">
                        <div className="bw-item-left">
                          <span className="bw-item-qty">{it.quantity || 1}x</span>
                          <span className="bw-item-name">{it.name || it.item || "Chai Selection"}</span>
                        </div>
                        <span className="bw-item-custom">
                          {it.sugar || incomingOrder.sugar || "Regular Sugar"} • {it.milk || incomingOrder.milk || "Standard Milk"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bw-item-row">
                    <div className="bw-item-left">
                      <span className="bw-item-qty">1x</span>
                      <span className="bw-item-name">{incomingOrder.item || "Fresh Kadak Chai"}</span>
                    </div>
                    <span className="bw-item-custom">
                      {incomingOrder.sugar || "Regular Sugar"} • {incomingOrder.milk || "Standard Milk"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bw-modal-actions">
              <button
                type="button"
                onClick={rejectOrderAlert}
                className="bw-btn-reject"
              >
                ✕ Decline / Dismiss
              </button>
              <button
                type="button"
                onClick={acceptOrderAlert}
                className="bw-btn-confirm"
              >
                ✓ Seen & Confirm Order (Start Brewing)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATS MODALS */}
      {activeStatsModal === "offline" && (() => {
        const offlineOrders = orders.filter(o => o.isOffline === true);
        return (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, backdropFilter: "blur(4px)", padding: "16px" }}>
            <div style={{ background: "#fff", padding: "28px", borderRadius: "20px", width: "1100px", maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f2eee9", paddingBottom: "14px", flexShrink: 0 }}>
                <div>
                  <h3 style={{ margin: 0, color: "#2c1b0d", fontSize: "20px", fontWeight: "800" }}>🏪 Offline & Counter Orders ({offlineOrders.length})</h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#777" }}>Direct orders placed at the tea shop counter.</p>
                </div>
                <button
                  onClick={() => setActiveStatsModal(null)}
                  style={{ background: "#f1eee9", border: "none", width: "36px", height: "36px", borderRadius: "50%", fontSize: "18px", cursor: "pointer", color: "#555", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ✕
                </button>
              </div>

              <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", paddingRight: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f8f9fa", zIndex: 1 }}>
                    <tr style={{ color: "#09090b", borderBottom: "2px solid #e4e4e7" }}>
                      <th style={{ padding: "14px" }}>Order ID</th>
                      <th style={{ padding: "14px" }}>Customer</th>
                      <th style={{ padding: "14px" }}>Items to Prepare</th>
                      <th style={{ padding: "14px" }}>Date</th>
                      <th style={{ padding: "14px" }}>Counter Type</th>
                      <th style={{ padding: "14px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offlineOrders.map((o, i) => (
                      <tr key={o.id || i} style={{ borderBottom: "1px solid #f4f4f5" }}>
                        <td style={{ padding: "14px", fontWeight: "900", color: "#09090b" }}>{o.orderId || o.id}</td>
                        <td style={{ padding: "14px", fontWeight: "bold", color: "#09090b" }}>{o.customer || "Walk-in Guest"}</td>
                        <td style={{ padding: "14px" }}>
                          <span style={{ display: "block", fontWeight: "600", color: "#09090b" }}>{o.item || "Chai Selection"}</span>
                          <span style={{ fontSize: "12px", color: "#71717a" }}>{o.customization || (o.walkIn ? "Counter Pickup" : "In-store")}</span>
                        </td>
                        <td style={{ padding: "14px", color: "#71717a" }}>{o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "-")}</td>
                        <td style={{ padding: "14px" }}>
                          <span style={{ fontSize: "11.5px", background: "#f4f4f5", color: "#09090b", padding: "4px 8px", borderRadius: "6px", fontWeight: "750", border: "1px solid #e4e4e7" }}>
                            {o.walkIn ? "Walk-in Counter" : "Takeaway / Dine"}
                          </span>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span style={{ fontSize: "11px", background: o.status === "Delivered" || o.status === "Completed" ? "#f4f4f5" : "#000000", color: o.status === "Delivered" || o.status === "Completed" ? "#09090b" : "#ffffff", padding: "6px 12px", borderRadius: "8px", fontWeight: "800", border: "1px solid #e4e4e7" }}>
                            {o.status || "Received"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {offlineOrders.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: "center", padding: "60px", color: "#888", fontSize: "15px" }}>No offline orders found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f2eee9", paddingTop: "14px" }}>
                <button
                  onClick={() => setActiveStatsModal(null)}
                  style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {activeStatsModal === "pending" && (() => {
        const allPendingOrders = orders.filter(isOrderPendingPayment);
        const filteredPending = allPendingOrders.filter(o => {
          if (!pendingSearchTerm) return true;
          const term = pendingSearchTerm.toLowerCase();
          const id = (o.orderId || o.id || "").toLowerCase();
          const cust = (o.customer || o.address?.firstName || "").toLowerCase();
          const ph = (o.phone || o.address?.phone || "").toLowerCase();
          return id.includes(term) || cust.includes(term) || ph.includes(term);
        });

        const totalPendingSum = allPendingOrders.reduce((acc, o) => {
          const rawVal = o.total || o.price || o.amount || 0;
          const val = typeof rawVal === "string" ? parseFloat(rawVal.replace(/[^\d\.]/g, "")) : parseFloat(rawVal);
          return acc + (isNaN(val) ? 0 : val);
        }, 0);

        const groupedByCustomer = allPendingOrders.reduce((acc, o) => {
          const custName = o.customer || (o.address?.firstName ? `${o.address.firstName} ${o.address.lastName || ''}`.trim() : "Walk-in Customer");
          if (!acc[custName]) {
            acc[custName] = {
              customer: custName,
              phone: o.phone || o.address?.phone || "N/A",
              totalAmount: 0,
              count: 0,
              orders: [],
              lastDate: o.createdAt || 0
            };
          }
          const rawVal = o.total || o.price || o.amount || 0;
          const val = typeof rawVal === "string" ? parseFloat(rawVal.replace(/[^\d\.]/g, "")) : parseFloat(rawVal);
          acc[custName].totalAmount += (isNaN(val) ? 0 : val);
          acc[custName].count += 1;
          acc[custName].orders.push(o);
          acc[custName].lastDate = Math.max(acc[custName].lastDate, o.createdAt || 0);
          return acc;
        }, {});
        const customerList = Object.values(groupedByCustomer).sort((a, b) => b.totalAmount - a.totalAmount);

        return (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, backdropFilter: "blur(4px)", padding: "16px" }}>
            <div style={{ background: "#ffffff", borderRadius: "20px", width: "1250px", maxWidth: "98vw", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden" }}>

              {/* MODAL HEADER */}
              <div style={{ padding: "20px 28px", borderBottom: "1px solid #f0ebe4", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fcfaf8" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "24px" }}>⏳</span>
                    <h3 style={{ margin: 0, color: "#2c1b0d", fontSize: "20px", fontWeight: "800" }}>Pending Amount & Payment Details</h3>
                  </div>
                  <p style={{ margin: "4px 0 0 34px", fontSize: "13px", color: "#777" }}>
                    Real-time database tracking of unpaid, COD, and pending orders.
                  </p>
                </div>
                <button
                  onClick={() => setActiveStatsModal(null)}
                  style={{ background: "#f1eee9", border: "none", width: "36px", height: "36px", borderRadius: "50%", fontSize: "18px", cursor: "pointer", color: "#555", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                >
                  ✕
                </button>
              </div>

              {/* SUMMARY STATS & CONTROLS BAR */}
              <div style={{ padding: "16px 28px", background: "#fff", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                  <div style={{ background: "#f4f4f5", padding: "8px 16px", borderRadius: "10px", border: "1px solid #e4e4e7" }}>
                    <span style={{ fontSize: "11px", color: "#71717a", fontWeight: "bold", textTransform: "uppercase" }}>Pending Queue Orders</span>
                    <div style={{ fontSize: "20px", fontWeight: "900", color: "#09090b" }}>{allPendingOrders.length}</div>
                  </div>
                  <div style={{ background: "#f4f4f5", padding: "8px 16px", borderRadius: "10px", border: "1px solid #e4e4e7" }}>
                    <span style={{ fontSize: "11px", color: "#71717a", fontWeight: "bold", textTransform: "uppercase" }}>Unique Customers</span>
                    <div style={{ fontSize: "20px", fontWeight: "900", color: "#09090b" }}>{customerList.length}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  {/* SEARCH INPUT */}
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search order ID or name..."
                      value={pendingSearchTerm}
                      onChange={(e) => setPendingSearchTerm(e.target.value)}
                      style={{ padding: "8px 14px 8px 30px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "13px", width: "220px" }}
                    />
                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#888" }}>🔍</span>
                  </div>

                  {/* TAB TOGGLE */}
                  <div style={{ display: "flex", background: "#eee", borderRadius: "8px", padding: "3px" }}>
                    <button
                      onClick={() => setPendingModalView("orders")}
                      style={{
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        background: pendingModalView === "orders" ? "#ffffff" : "transparent",
                        color: pendingModalView === "orders" ? "#2c1b0d" : "#777",
                        boxShadow: pendingModalView === "orders" ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
                      }}
                    >
                      All Orders ({filteredPending.length})
                    </button>
                    <button
                      onClick={() => setPendingModalView("customers")}
                      style={{
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        background: pendingModalView === "customers" ? "#ffffff" : "transparent",
                        color: pendingModalView === "customers" ? "#2c1b0d" : "#777",
                        boxShadow: pendingModalView === "customers" ? "0 2px 4px rgba(0,0,0,0.1)" : "none"
                      }}
                    >
                      By Customer ({customerList.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* MODAL BODY */}
              <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "16px 28px" }}>
                {pendingModalView === "orders" ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#f8f9fa", zIndex: 1 }}>
                      <tr style={{ color: "#71717a", borderBottom: "2px solid #e4e4e7" }}>
                        <th style={{ padding: "12px 14px" }}>Order ID</th>
                        <th style={{ padding: "12px 14px" }}>Customer & Phone</th>
                        <th style={{ padding: "12px 14px" }}>Items</th>
                        <th style={{ padding: "12px 14px" }}>Date</th>
                        <th style={{ padding: "12px 14px" }}>Fulfillment Mode</th>
                        <th style={{ padding: "12px 14px" }}>Payment Status</th>
                        <th style={{ padding: "12px 14px" }}>Order Status</th>
                        <th style={{ padding: "12px 14px", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPending.map((o, idx) => {
                        const custName = o.customer || (o.address?.firstName ? `${o.address.firstName} ${o.address.lastName || ''}`.trim() : "Walk-in");
                        const phoneNum = o.phone || o.address?.phone || "";
                        const orderDate = o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "N/A");

                        return (
                          <tr key={o.id || idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: "14px", fontWeight: "800", color: "#09090b" }}>
                              {o.orderId || o.id}
                            </td>
                            <td style={{ padding: "14px" }}>
                              <div style={{ fontWeight: "700", color: "#09090b" }}>{custName}</div>
                              {phoneNum ? (
                                <div style={{ fontSize: "11px", color: "#71717a", marginTop: "2px" }}>
                                  📞 {phoneNum}
                                </div>
                              ) : null}
                            </td>
                            <td style={{ padding: "14px", maxWidth: "240px" }}>
                              <span style={{ display: "block", fontWeight: "600", color: "#09090b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={o.item}>
                                {o.item || "Chai Selection"}
                              </span>
                              {o.office || o.address ? (
                                <span style={{ fontSize: "11px", color: "#71717a" }}>📍 {typeof o.address === "string" ? o.address : (o.office || "Delivery")}</span>
                              ) : null}
                            </td>
                            <td style={{ padding: "14px", color: "#71717a", fontSize: "12px" }}>{orderDate}</td>
                            <td style={{ padding: "14px", fontWeight: "750", color: "#09090b", fontSize: "12.5px" }}>
                              {o.walkIn ? "Counter Pickup" : "Desk Delivery"}
                            </td>
                            <td style={{ padding: "14px" }}>
                              <span style={{ fontSize: "11px", background: "#f4f4f5", color: "#09090b", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold", border: "1px solid #e4e4e7" }}>
                                {o.paymentMethod || "Cash on Delivery"}
                              </span>
                            </td>
                            <td style={{ padding: "14px" }}>
                              <span style={{
                                fontSize: "11px",
                                background: o.status === "Delivered" ? "#f4f4f5" : o.status === "Preparing" ? "#000000" : "#18181b",
                                color: o.status === "Delivered" ? "#09090b" : "#ffffff",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontWeight: "bold"
                              }}>
                                {o.status || "Received"}
                              </span>
                            </td>
                            <td style={{ padding: "14px", textAlign: "right" }}>
                              <button
                                onClick={async () => {
                                  if (confirm(`Confirm and acknowledge order ${o.orderId || o.id}?`)) {
                                    await updateOrder(o.id, { paymentStatus: "Paid", status: "Preparing" });
                                    setToastMsg(`✅ Order ${o.orderId || o.id} confirmed for brewing!`);
                                    setTimeout(() => setToastMsg(""), 3500);
                                  }
                                }}
                                style={{
                                  background: "#000000",
                                  color: "#fff",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  cursor: "pointer"
                                }}
                              >
                                ✓ Confirm Brew
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredPending.length === 0 && (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center", padding: "60px", color: "#71717a", fontSize: "14px" }}>
                            🎉 No pending requests found! All orders are brewing or fulfilled.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#f8f9fa", zIndex: 1 }}>
                      <tr style={{ color: "#71717a", borderBottom: "2px solid #e4e4e7" }}>
                        <th style={{ padding: "14px" }}>Customer Name</th>
                        <th style={{ padding: "14px" }}>Phone</th>
                        <th style={{ padding: "14px" }}># Pending Orders</th>
                        <th style={{ padding: "14px" }}>Order IDs</th>
                        <th style={{ padding: "14px" }}>Queue Status</th>
                        <th style={{ padding: "14px", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerList.map((c, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                          <td style={{ padding: "14px", fontWeight: "700", color: "#09090b" }}>{c.customer}</td>
                          <td style={{ padding: "14px", color: "#71717a" }}>{c.phone}</td>
                          <td style={{ padding: "14px", fontWeight: "600", color: "#52525b" }}>{c.count} order(s)</td>
                          <td style={{ padding: "14px" }}>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {c.orders.map(ord => (
                                <span key={ord.id} style={{ fontSize: "11px", background: "#f4f4f5", color: "#09090b", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e4e4e7" }}>
                                  {ord.orderId || ord.id}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "14px", fontWeight: "800", color: "#09090b", fontSize: "14px" }}>
                            {c.count} Active Orders
                          </td>
                          <td style={{ padding: "14px", textAlign: "right" }}>
                            <button
                              onClick={async () => {
                                if (confirm(`Acknowledge ALL ${c.count} orders for ${c.customer}?`)) {
                                  for (const ord of c.orders) {
                                    await updateOrder(ord.id, { paymentStatus: "Paid", status: "Preparing" });
                                  }
                                  setToastMsg(`✅ All orders for ${c.customer} acknowledged!`);
                                  setTimeout(() => setToastMsg(""), 3500);
                                }
                              }}
                              style={{
                                background: "#000000",
                                color: "#fff",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "bold",
                                cursor: "pointer"
                              }}
                            >
                              ✓ Confirm All ({c.count})
                            </button>
                          </td>
                        </tr>
                      ))}
                      {customerList.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", padding: "60px", color: "#999", fontSize: "14px" }}>
                            No customers with pending payments.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div style={{ padding: "14px 28px", borderTop: "1px solid #f0ebe4", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fcfaf8" }}>
                <span style={{ fontSize: "12px", color: "#888" }}>
                  Showing live real-time sync with database. Marking as paid updates live everywhere.
                </span>
                <button
                  onClick={() => setActiveStatsModal(null)}
                  style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* EDIT ORDER MODAL (POPUP TO ADD/REMOVE ITEMS & SYNC WHATSAPP) */}
      <EditOrderModal
        isOpen={isEditOrderModalOpen}
        order={editingOrder}
        onClose={() => setIsEditOrderModalOpen(false)}
        onSaveSuccess={(upd) => {
          if (upd) {
            setOrders(prev => prev.map(o => (o.id === upd.id || o.orderId === upd.orderId) ? { ...o, ...upd } : o));
            if (selectedQueueOrder && (selectedQueueOrder.id === upd.id || selectedQueueOrder.orderId === upd.orderId)) {
              setSelectedQueueOrder(prev => ({ ...prev, ...upd }));
            }
          }
        }}
        productsList={productsList}
      />

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
          border: 1px solid #e4e4e7;
          width: 100%;
          max-width: 420px;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.08);
          box-sizing: border-box;
        }

        .brewmaster-badge {
          background: #000000;
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
          color: #09090b;
          margin-bottom: 8px;
        }

        .login-card p {
          font-size: 13px;
          color: #71717a;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .login-error-alert {
          background: #18181b;
          color: #f43f5e;
          border: 1px solid #27272a;
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
          color: #52525b;
          text-transform: uppercase;
        }

        .login-input {
          background: #f4f4f5;
          border: 1.5px solid #e4e4e7;
          border-radius: 8px;
          padding: 12px;
          color: #09090b;
          outline: none;
          font-size: 14px;
        }

        .login-input:focus {
          border-color: #09090b;
          background: #ffffff;
        }

        .btn-authenticate {
          background: #000000;
          color: #ffffff;
          border: none;
          padding: 14px;
          border-radius: 8px;
          font-weight: 800;
          width: 100%;
          cursor: pointer;
          margin-top: 10px;
          transition: transform 0.2s, background 0.2s;
        }

        .btn-authenticate:hover {
          background: #18181b;
          transform: scale(1.01);
        }

        /* 3-Column Layout with Fixed Sidebar */
        .dashboard-wrapper {
          display: flex;
          min-height: 100vh;
          overflow-x: hidden;
          width: 100%;
          max-width: 100vw;
        }

        .dashboard-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 260px;
          background: #09090b;
          color: #ffffff;
          border-right: 1px solid #27272a;
          padding: 32px 20px;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: 4px 0 30px rgba(0,0,0,0.15);
          box-sizing: border-box;
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
          color: #a1a1aa;
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

        .menu-icon-btn:hover {
          background: #18181b;
          color: #ffffff;
        }

        .menu-icon-btn.active {
          background: #ffffff;
          color: #000000;
          font-weight: 850;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        }

        .sidebar-bottom {
          margin-top: auto;
          width: 100%;
        }

        .menu-icon-btn.logout {
          color: #f43f5e;
          border: 1px solid rgba(244, 63, 94, 0.2);
        }

        .menu-icon-btn.logout:hover {
          background: rgba(244, 63, 94, 0.1);
        }

        /* Container main - Desktop Responsive */
        .dashboard-container {
          margin-left: 260px;
          margin-right: 0;
          flex-grow: 1;
          padding: 0;
          box-sizing: border-box;
          width: calc(100% - 260px);
          min-width: 0;
          background: #f8fafc;
        }

        /* Fixed Right Sidebar for Pending Queue (Detailed cards style) */
        .dashboard-right-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 380px;
          max-width: 90vw;
          background: #ffffff;
          border-left: 1px solid #e2e8f0;
          padding: 32px 22px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: -4px 0 30px rgba(0,0,0,0.06);
        }

        .right-sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 16px;
        }

        .right-sidebar-header h3 {
          font-size: 16px;
          font-weight: 850;
          color: #09090b;
          margin: 0;
        }

        .pending-badge-count {
          background: #000000;
          color: #ffffff;
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
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.02);
        }

        .sidebar-card-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 6px;
        }

        .sidebar-order-id {
          font-size: 12.5px;
          color: #09090b;
          font-weight: 800;
        }

        .sidebar-order-date {
          font-size: 11px;
          color: #71717a;
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
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
        }

        .sidebar-product-details {
          flex-grow: 1;
          min-width: 0;
        }

        .sidebar-product-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #09090b;
          margin: 0 0 4px;
        }

        .sidebar-customer-name {
          font-size: 11.5px;
          color: #71717a;
          display: block;
          margin-bottom: 4px;
        }

        .sidebar-office-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          color: #09090b;
          background: #f4f4f5;
          border: 1px solid #e4e4e7;
          padding: 2px 6px;
          border-radius: 4px;
          margin-bottom: 6px;
        }

        .sidebar-extra-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 10px;
          color: #71717a;
          margin-bottom: 8px;
        }

        .sidebar-total-amount {
          font-size: 13px;
          color: #09090b;
          font-weight: 900;
          display: block;
        }

        .sidebar-card-actions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
          border-top: 1px dashed #e2e8f0;
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
          transition: all 0.2s;
        }

        .sidebar-action-btn.accept {
          background: #000000;
          color: #ffffff;
        }

        .sidebar-action-btn.accept:hover {
          background: #27272a;
        }

        .sidebar-action-btn.reject {
          background: #f4f4f5;
          color: #71717a;
          border: 1px solid #e4e4e7;
        }

        .sidebar-action-btn.reject:hover {
          background: #e4e4e7;
          color: #09090b;
        }

        .empty-sidebar-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 100%;
          color: #71717a;
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
          color: #71717a;
          display: block;
          margin-bottom: 2px;
        }

        .operator-title {
          font-size: 24px;
          font-weight: 900;
          color: #09090b;
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
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 14px 12px 42px;
          color: #09090b;
          outline: none;
          font-size: 13.5px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.01);
        }

        .search-input-new:focus {
          border-color: #09090b;
        }

        .alert-bell-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.01);
          transition: all 0.2s;
        }

        .alert-bell-btn:hover {
          background: #f4f4f5;
          border-color: #d4d4d8;
        }

        .profile-avatar-new {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid #e2e8f0;
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
          color: #09090b;
          margin: 0 0 4px;
        }

        .sales-order-subheader p {
          font-size: 12px;
          color: #71717a;
          margin: 0;
        }

        .subheader-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .btn-export-data {
          background: #000000;
          border: 1px solid #000000;
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-export-data:hover {
          background: #27272a;
        }

        .filter-pill-group {
          background: #f1f5f9;
          padding: 4px;
          border-radius: 8px;
          display: flex;
          gap: 2px;
        }

        .filter-pill-btn {
          border: none;
          background: transparent;
          color: #71717a;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .filter-pill-btn.active {
          background: #000000;
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
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.01);
        }

        .stats-card-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12.5px;
          color: #71717a;
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
          background: #f4f4f5;
          color: #09090b;
        }

        .stats-icon-circle.red-bg { background: #f4f4f5; color: #09090b; }
        .stats-icon-circle.yellow-bg { background: #f4f4f5; color: #09090b; }
        .stats-icon-circle.green-bg { background: #f4f4f5; color: #09090b; }

        .stats-card-item h3 {
          font-size: 20px;
          font-weight: 900;
          color: #09090b;
          margin: 0 0 6px;
        }

        .stats-percent-tag {
          font-size: 11px;
          font-weight: 700;
        }

        .stats-percent-tag.green { color: #09090b; }
        .stats-percent-tag.red { color: #71717a; }

        /* Double row grids */
        .dashboard-double-row-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 28px;
        }

        .dashboard-large-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }

        .card-header-new {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 10px;
        }

        .card-header-new h3 {
          font-size: 15px;
          font-weight: 850;
          color: #09090b;
          margin: 0;
        }

        .payout-status-badge {
          background: #f4f4f5;
          border: 1px solid #e4e4e7;
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
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.01);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .queue-card-detailed-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.05);
        }

        .queue-card-detailed-item.high-priority-pulse {
          border-left: 5px solid #000000;
          background: #ffffff;
        }

        .queue-card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
        }

        .queue-card-id {
          font-size: 13px;
          font-weight: 800;
          color: #09090b;
        }

        .priority-badge-pill {
          font-size: 9px;
          font-weight: 900;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .priority-badge-pill.high {
          background: #000000;
          color: #ffffff;
        }

        .priority-badge-pill.normal {
          background: #f4f4f5;
          color: #09090b;
          border: 1px solid #e4e4e7;
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
          border: 1px solid #e2e8f0;
        }

        .queue-card-text-details h4 {
          font-size: 15px;
          font-weight: 850;
          color: #09090b;
          margin: 0 0 6px;
        }

        .queue-customer-lbl, .queue-office-lbl {
          display: block;
          font-size: 12px;
          color: #71717a;
          margin-bottom: 4px;
        }

        .queue-customization-specs {
          display: flex;
          gap: 8px;
          font-size: 10.5px;
          color: #71717a;
          margin-top: 6px;
        }

        .queue-card-action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px dashed #e2e8f0;
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
          transition: all 0.2s;
        }

        .btn-action-fill.accept { background: #000000; }
        .btn-action-fill.accept:hover { background: #27272a; }
        .btn-action-fill.dispatch { background: #18181b; }
        .btn-action-fill.dispatch:hover { background: #27272a; }
        .btn-action-fill.complete { background: #09090b; }
        .btn-action-fill.complete:hover { background: #27272a; }

        .btn-action-outline {
          background: transparent;
          border: 1px solid #e4e4e7;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 800;
          border-radius: 6px;
          cursor: pointer;
        }

        .btn-action-outline.reject {
          border-color: #e4e4e7;
          color: #71717a;
          background: #f4f4f5;
        }

        .served-status-success-badge {
          font-size: 12.5px;
          color: #09090b;
          font-weight: bold;
        }

        .stocks-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .stock-control-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
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

        .stock-indicator-pill.in-stock { background: #f4f4f5; color: #09090b; border: 1px solid #e4e4e7; }
        .stock-indicator-pill.low-stock { background: #f4f4f5; color: #71717a; border: 1px solid #e4e4e7; }
        .stock-indicator-pill.out-of-stock { background: #000000; color: #ffffff; }

        .btn-raise-restock {
          background: #000000;
          border: 1px solid #000000;
          color: #ffffff;
          padding: 6px 14px;
          font-size: 11px;
          font-weight: 750;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-raise-restock:hover {
          background: #27272a;
        }

        /* Luxury Black & White Center Alert Modal (Continuous Ringtone until Confirmed) */
        .bw-alert-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999;
          padding: 20px;
          animation: bwFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes bwFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }

        .bw-alert-modal {
          background: #09090b;
          border: 1.5px solid #27272a;
          border-radius: 28px;
          width: 100%;
          max-width: 540px;
          padding: 32px;
          box-shadow: 0 25px 80px -10px rgba(0, 0, 0, 0.95), 0 0 40px rgba(255, 255, 255, 0.08);
          color: #ffffff;
          box-sizing: border-box;
          position: relative;
        }

        .bw-alert-top-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 9999px;
          padding: 6px 14px;
          margin-bottom: 20px;
        }

        .bw-pulsing-circle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          position: relative;
        }

        .bw-pulsing-dot {
          width: 8px;
          height: 8px;
          background: #ffffff;
          border-radius: 50%;
          display: block;
          animation: bwPulse 1.2s infinite ease-in-out;
        }

        @keyframes bwPulse {
          0% { transform: scale(0.8); opacity: 0.5; box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
          70% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); }
          100% { transform: scale(0.8); opacity: 0.5; box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }

        .bw-badge-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #ffffff;
          flex-grow: 1;
          margin-left: 8px;
        }

        .bw-mute-pill-btn {
          background: #27272a;
          color: #a1a1aa;
          border: 1px solid #3f3f46;
          border-radius: 9999px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bw-mute-pill-btn:hover {
          color: #ffffff;
          border-color: #71717a;
        }

        .bw-modal-header {
          margin-bottom: 24px;
        }

        .bw-modal-title {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
          color: #ffffff;
          margin: 0 0 6px 0;
        }

        .bw-modal-subtitle {
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.5;
          margin: 0;
        }

        .bw-order-summary-box {
          background: #121215;
          border: 1px solid #27272a;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .bw-order-id-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid #222226;
          margin-bottom: 16px;
        }

        .bw-order-id {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #ffffff;
        }

        .bw-payment-badge {
          background: #27272a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 9999px;
          border: 1px solid #3f3f46;
        }

        .bw-order-details-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #222226;
        }

        .bw-info-block {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .bw-info-block.right {
          text-align: right;
          align-items: flex-end;
        }

        .bw-info-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #71717a;
        }

        .bw-info-value {
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
        }

        .bw-info-sub {
          font-size: 12px;
          color: #a1a1aa;
        }

        .bw-info-phone {
          font-size: 11.5px;
          color: #d4d4d8;
          font-weight: 600;
          margin-top: 2px;
        }

        .bw-info-price {
          font-size: 24px;
          font-weight: 900;
          color: #ffffff;
        }

        .bw-items-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bw-items-heading {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #71717a;
        }

        .bw-items-scroll {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 140px;
          overflow-y: auto;
        }

        .bw-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #18181b;
          border: 1px solid #27272a;
          border-radius: 12px;
          padding: 10px 14px;
        }

        .bw-item-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bw-item-qty {
          background: #ffffff;
          color: #000000;
          font-size: 11px;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 6px;
        }

        .bw-item-name {
          font-size: 13.5px;
          font-weight: 700;
          color: #ffffff;
        }

        .bw-item-custom {
          font-size: 11px;
          color: #a1a1aa;
        }

        .bw-modal-actions {
          display: flex;
          gap: 12px;
        }

        .bw-btn-reject {
          flex: 1;
          background: transparent;
          color: #a1a1aa;
          border: 1px solid #27272a;
          border-radius: 9999px;
          padding: 14px 18px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s;
        }

        .bw-btn-reject:hover {
          background: #18181b;
          color: #ffffff;
          border-color: #3f3f46;
        }

        .bw-btn-confirm {
          flex: 2;
          background: #ffffff;
          color: #000000;
          border: none;
          border-radius: 9999px;
          padding: 16px 24px;
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 0 25px rgba(255, 255, 255, 0.25);
        }

        .bw-btn-confirm:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 35px rgba(255, 255, 255, 0.4);
        }

        .bw-btn-confirm:active {
          transform: translateY(0);
        }

        @media (max-width: 1400px) {
          .dashboard-container {
            margin-right: 0;
            width: calc(100% - 260px);
          }
          .dashboard-right-sidebar {
            position: fixed;
            width: 400px;
            max-width: 100vw;
            border-left: 1px solid rgba(44, 27, 13, 0.08);
            border-top: none;
            margin-top: 0;
            z-index: 9999;
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
          .mobile-menu-btn {
            display: block !important;
          }
          .dashboard-sidebar {
            transform: translateX(-100%);
            display: flex !important;
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            z-index: 9999;
            transition: transform 0.3s ease;
            box-shadow: 10px 0 30px rgba(0,0,0,0.2);
          }
          .dashboard-sidebar.mobile-open {
            transform: translateX(0);
          }
          .dashboard-container {
            margin-left: 0 !important;
            margin-right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 16px !important;
            padding-bottom: 80px !important; /* space for bottom navbar */
            overflow-x: hidden;
          }
          
          .dashboard-container.pending-open {
            margin-right: 0 !important;
            width: 100% !important;
          }
          
          .dashboard-container.pending-open {
            margin-right: 0 !important;
            width: 100vw !important;
          }
          
          /* Mobile Header Fixes */
          .dashboard-header-new {
            flex-wrap: wrap;
            gap: 12px;
            justify-content: space-between;
          }
          .header-left-wrap {
            gap: 8px !important;
          }
          .header-actions-wrap {
            gap: 8px !important;
          }
          .btn-pending-requests {
            padding: 8px 10px !important;
            font-size: 11px !important;
          }
          .operator-title {
            font-size: 18px !important;
          }
          .header-search-box-wrap {
            order: 3;
            max-width: 100%;
            width: 100%;
            margin-top: 4px;
          }
          
          /* Mobile Subheader Fixes */
          .sales-order-subheader {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .subheader-controls {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }
          
          /* Mobile Stats Carousel */
          .stats-cards-row-new {
            display: flex !important;
            flex-wrap: nowrap;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            gap: 12px;
            padding-bottom: 12px;
          }
          .stats-cards-row-new > div {
            flex: 0 0 80%; /* 80% width so the next card peeks out */
            scroll-snap-align: start;
          }
          .stats-cards-row-new::-webkit-scrollbar {
            display: none;
          }
          
          /* Mobile Bottom Navbar */
          .mobile-bottom-navbar {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100vw;
            background: #ffffff;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
            z-index: 9999;
            justify-content: space-around;
            padding: 12px 0;
            border-top: 1px solid rgba(44, 27, 13, 0.1);
          }
          .mobile-bottom-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            color: #666;
            font-size: 10px;
            font-weight: 700;
            gap: 4px;
            text-transform: uppercase;
          }
          .mobile-bottom-nav-item.active {
            color: #2c1b0d;
          }
          .mobile-bottom-nav-item .btn-emoji {
            font-size: 20px;
            margin-right: 0;
          }
          .mobile-menu-btn {
            display: none !important; /* Hide hamburger since we have bottom nav */
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

        /* Modern Sliding Sidebar Styles */
        .queue-sidebar-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(4px);
          z-index: 999;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .queue-sidebar-overlay.open {
          opacity: 1;
          visibility: visible;
        }

        .queue-sidebar-panel {
          position: fixed;
          top: 0; right: -560px;
          width: 100%;
          max-width: 520px;
          height: 100vh;
          background: #f8fafc;
          z-index: 1000;
          box-shadow: -10px 0 40px rgba(0,0,0,0.18);
          transition: right 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .queue-sidebar-panel.open {
          right: 0;
        }

        .queue-sidebar-panel::-webkit-scrollbar {
          width: 6px;
        }
        .queue-sidebar-panel::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .queue-sidebar-panel::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .queue-sidebar-content-modern {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* Modern Sidebar Header */
        .modern-sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 14px;
          border-bottom: 1px solid #e2e8f0;
        }
        .sidebar-header-title-box {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sidebar-order-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #1e293b;
          color: #ffffff;
          padding: 5px 12px;
          border-radius: 20px;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.5px;
        }
        .channel-indicator {
          font-size: 10px;
          color: #cbd5e1;
          border-right: 1px solid rgba(255,255,255,0.25);
          padding-right: 6px;
        }
        .order-status-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
          border: 1px solid transparent;
        }
        .status-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          display: inline-block;
        }
        .sidebar-modern-close-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .sidebar-modern-close-btn:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fca5a5;
          transform: rotate(90deg);
        }

        /* Order Meta Card */
        .sidebar-meta-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
        }
        .sidebar-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sidebar-meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .sidebar-meta-item.text-right {
          text-align: right;
        }
        .meta-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 700;
          color: #94a3b8;
        }
        .meta-value-bold {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
        }
        .meta-value {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }
        .meta-value-accent {
          font-size: 13px;
          font-weight: 700;
          color: #d97706;
        }
        .meta-value-sub {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }
        .sidebar-meta-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 10px 0;
        }

        /* Section Cards */
        .sidebar-section-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sidebar-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .sidebar-section-title {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sidebar-section-sub {
          margin: 2px 0 0 0;
          font-size: 11px;
          color: #64748b;
        }
        .items-count-badge {
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
        }

        /* Items List with Images */
        .sidebar-items-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sidebar-item-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: #f8fafc;
          border: 1px solid #edf2f7;
          border-radius: 12px;
          transition: all 0.15s ease;
        }
        .sidebar-item-row:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .sidebar-item-img-wrap {
          position: relative;
          width: 56px;
          height: 56px;
          flex-shrink: 0;
        }
        .sidebar-item-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
        }
        .sidebar-item-qty-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          background: #2c1b0d;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 8px;
          border: 1.5px solid #ffffff;
        }
        .sidebar-item-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .sidebar-item-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;
        }
        .sidebar-item-name {
          font-size: 13px;
          font-weight: 800;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-item-price {
          font-size: 13px;
          font-weight: 800;
          color: #16a34a;
          flex-shrink: 0;
        }
        .sidebar-item-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .item-pill {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
        }
        .sugar-pill {
          background: #fef3c7;
          color: #92400e;
        }
        .milk-pill {
          background: #e0e7ff;
          color: #3730a3;
        }
        .notes-pill {
          background: #f3e8ff;
          color: #7e22ce;
        }

        /* Status Action Panel */
        .status-action-card {
          border: 1.5px solid #cbd5e1;
        }
        .auto-whatsapp-tag {
          font-size: 10px;
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
          padding: 3px 8px;
          border-radius: 20px;
          font-weight: 800;
        }
        .status-quick-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 8px;
        }
        .status-chip-btn {
          padding: 9px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          border: 1.5px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .status-chip-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(0,0,0,0.06);
        }
        .status-chip-btn.active {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .sidebar-select.modern {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1.5px solid #cbd5e1;
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          background: #f8fafc;
          outline: none;
          cursor: pointer;
        }

        /* Online vs Offline Settlement */
        .online-settled-card {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }
        .online-settled-flex {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .online-settled-icon {
          font-size: 26px;
        }
        .online-settled-title {
          font-size: 13px;
          font-weight: 800;
          color: #15803d;
        }
        .online-settled-desc {
          font-size: 11.5px;
          color: #166534;
          margin-top: 2px;
        }

        .offline-settlement-card {
          background: #fffbeb;
          border: 1px solid #fde68a;
        }
        .payment-due-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .payment-due-badge.paid {
          background: #15803d;
          color: #ffffff;
        }
        .payment-due-badge.pending {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fcd34d;
        }
        .payment-methods-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 4px;
        }
        .payment-method-chip {
          padding: 9px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 800;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #2c1b0d;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }
        .payment-method-chip.selected {
          border: 2px solid #2c1b0d;
          background: #2c1b0d;
          color: #ffffff;
        }

        /* Delivery Window */
        .quick-time-buttons {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .quick-time-pill {
          padding: 5px 10px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .quick-time-pill:hover {
          background: #2c1b0d;
          color: #ffffff;
          border-color: #2c1b0d;
        }
        .delivery-time-input-row {
          display: flex;
          gap: 8px;
        }
        .sidebar-input.modern {
          flex: 1;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          color: #1e293b;
          background: #f8fafc;
          outline: none;
        }
        .sidebar-save-btn.modern {
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          border-radius: 10px;
          padding: 0 18px;
          font-weight: 800;
          font-size: 12.5px;
          cursor: pointer;
          transition: background 0.25s ease;
          white-space: nowrap;
        }
        .sidebar-save-btn.modern.saved {
          background: #16a34a;
        }

        /* ORDER QUEUE DESIGN SYSTEM */
        .queue-stats-carousel-wrapper {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 1024px) {
          .queue-stats-carousel-wrapper {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 8px;
            gap: 12px;
            scrollbar-width: thin;
          }
          .queue-stats-carousel-wrapper::-webkit-scrollbar {
            height: 4px;
          }
          .queue-stats-carousel-wrapper::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .queue-stat-card {
            flex: 0 0 240px;
            min-width: 240px;
            scroll-snap-align: start;
          }
        }
        .queue-stat-card {
          background: #ffffff;
          padding: 16px 18px;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 10px rgba(0,0,0,0.03);
          display: flex;
          align-items: center;
          gap: 14px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .queue-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
        }
        .queue-stat-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #18181b;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .queue-stat-content {
          flex: 1;
          min-width: 0;
        }
        .queue-stat-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        .queue-stat-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .queue-stat-trend {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 10px;
          white-space: nowrap;
        }
        .queue-stat-trend.up {
          background: #dcfce7;
          color: #16a34a;
        }
        .queue-stat-value {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
        }
        .queue-stat-sub {
          font-size: 10.5px;
          color: #94a3b8;
          font-weight: 600;
          display: block;
        }

        /* Queue Filter Bar */
        .queue-filter-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          padding: 16px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .queue-filter-grid {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          flex: 1;
        }
        .queue-filter-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .queue-filter-label {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          text-transform: capitalize;
        }
        .queue-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .queue-input-icon {
          position: absolute;
          left: 10px;
          font-size: 13px;
          pointer-events: none;
          color: #94a3b8;
        }
        .queue-search-input {
          padding: 8px 30px 8px 32px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
          color: #1e293b;
          width: 210px;
          outline: none;
          transition: all 0.2s ease;
        }
        .queue-search-input:focus {
          border-color: #0f172a;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
        }
        .queue-clear-search-btn {
          position: absolute;
          right: 8px;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 12px;
          cursor: pointer;
          padding: 2px 4px;
        }
        .queue-select-input {
          padding: 8px 12px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 700;
          color: #1e293b;
          outline: none;
          cursor: pointer;
          min-width: 130px;
          transition: all 0.2s ease;
        }
        .queue-select-input:focus {
          border-color: #0f172a;
          background: #ffffff;
        }
        .queue-actions-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .queue-date-picker-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 6px 10px;
          height: 38px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        .queue-date-picker-wrap:focus-within,
        .queue-date-picker-wrap:hover {
          border-color: #0f172a;
          background: #ffffff;
        }
        .queue-date-picker-icon {
          font-size: 14px;
          line-height: 1;
        }
        .queue-calendar-input {
          border: none;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: #1e293b;
          outline: none;
          cursor: pointer;
          font-family: inherit;
          padding: 0;
        }
        .queue-clear-date-btn {
          border: none;
          background: #fee2e2;
          color: #ef4444;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: all 0.15s ease;
        }
        .queue-clear-date-btn:hover {
          background: #fecaca;
          color: #dc2626;
          transform: scale(1.1);
        }
        .queue-add-btn {
          background: #18181b;
          color: #ffffff;
          border: none;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transition: all 0.15s ease;
        }
        .queue-add-btn:hover {
          background: #27272a;
          transform: translateY(-1px);
        }
        .queue-refresh-btn {
          width: 38px;
          height: 38px;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.15s ease;
        }
        .queue-refresh-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        /* Queue Table Card */
        .queue-table-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
          overflow: hidden;
        }
        .queue-table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .queue-modern-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }
        .queue-modern-table th {
          background: #f8fafc;
          color: #64748b;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 14px 16px;
          border-bottom: 1.5px solid #e2e8f0;
          white-space: nowrap;
        }
        .queue-modern-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .queue-table-row {
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .queue-table-row:hover {
          background: #f8fafc;
        }
        .queue-table-row.row-selected {
          background: #f0fdf4;
        }
        .queue-checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #18181b;
        }
        .queue-customer-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          object-fit: cover;
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
        }
        .queue-channel-pill {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 6px;
          font-weight: 800;
        }
        .queue-channel-pill.counter {
          background: #fef3c7;
          color: #92400e;
        }
        .queue-channel-pill.online {
          background: #e0f2fe;
          color: #0369a1;
        }
        .queue-time-badge {
          font-size: 11px;
          font-weight: 700;
          color: #ea580c;
          background: #fff7ed;
          padding: 3px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }
        .queue-status-dropdown {
          appearance: none;
          -webkit-appearance: none;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
          outline: none;
          border: 1.5px solid transparent;
          transition: all 0.15s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .queue-status-dropdown:hover {
          transform: translateY(-1px);
        }
        .queue-edit-btn {
          background: #f8fafc;
          color: #334155;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 5px 10px;
          font-size: 11.5px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .queue-edit-btn:hover {
          background: #18181b;
          color: #ffffff;
          border-color: #18181b;
        }
        .queue-view-btn {
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: #64748b;
          cursor: pointer;
        }
        .queue-view-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* MOBILE RESPONSIVE CARDS & ZERO SIDE-SPACE */
        @media (max-width: 768px) {
          .dashboard-main {
            padding: 6px 2px !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }
          .dashboard-container {
            padding: 6px 4px 95px 4px !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100vw !important;
            box-sizing: border-box !important;
          }
          .dashboard-content {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .tab-body-wrapper {
            padding: 8px 4px !important;
            margin: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          /* Dashboard Page Mobile Polish */
          .dashboard-tab-body {
            padding: 6px 2px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .dashboard-metrics-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
            margin-bottom: 14px !important;
          }
          .dashboard-time-filter-wrap {
            width: 100% !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            overflow-x: auto !important;
            padding: 6px !important;
          }
          .dashboard-summary-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 16px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .dashboard-split-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 14px !important;
            margin-bottom: 16px !important;
            width: 100% !important;
          }
          .dashboard-double-row-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
            margin-bottom: 16px !important;
          }

          /* POS & Shop Mobile Polish */
          .offline-tab-body {
            padding: 6px 2px !important;
          }
          .pos-modal-card {
            width: 96vw !important;
            max-width: 96vw !important;
            max-height: 92vh !important;
            padding: 16px 12px !important;
            border-radius: 16px !important;
          }
          .pos-modal-product-grid {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
            max-height: 52vh !important;
          }

          /* Settings & Profile Mobile Polish */
          .profile-tab-body {
            padding: 6px 2px !important;
          }
          .profile-two-col-grid {
            grid-template-columns: 1fr !important;
            gap: 14px !important;
          }

          /* Inventory (Stock) Mobile Polish */
          .stock-tab-body {
            padding: 6px 2px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .stock-header-controls {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .stock-categories-scroll {
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .stock-actions-wrap {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .stock-date-picker-wrap {
            flex: 1 !important;
          }
          .stock-upload-btn {
            flex: 1 !important;
            justify-content: center !important;
          }
          .stock-table-card {
            display: none !important;
          }
          .stock-mobile-cards-container {
            display: flex !important;
          }

          /* Order History Mobile Polish */
          .history-tab-body {
            padding: 6px 2px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .history-header-bar {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }
          .history-tally-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .history-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .history-filter-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .history-channel-pills {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .history-search-box {
            max-width: 100% !important;
            width: 100% !important;
          }
          .history-date-filters {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .history-view-toggle {
            width: 100% !important;
            justify-content: space-around !important;
          }
          .history-orders-grid {
            grid-template-columns: 1fr !important;
          }
          .slip-details-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .slip-dispatch-box {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .slip-dispatch-box > div:last-child {
            border-left: none !important;
            border-top: 1px solid #e4e4e7 !important;
            padding-left: 0 !important;
            padding-top: 10px !important;
            text-align: left !important;
          }

          /* Leave & Shift Mobile Polish */
          .leave-tab-body {
            padding: 6px 2px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .leave-two-col-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .leave-dates-row {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
          .leave-table-card {
            display: none !important;
          }
          .leave-mobile-cards-container {
            display: flex !important;
          }

          /* Queue Filter Controls Mobile Polish */
          .queue-filter-card {
            padding: 12px 10px !important;
            margin-bottom: 12px !important;
            border-radius: 12px !important;
          }
          .queue-filter-grid {
            gap: 8px !important;
            width: 100% !important;
          }
          .queue-filter-col {
            width: 100% !important;
            min-width: 100% !important;
          }
          .queue-search-input {
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .queue-select-input {
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .queue-actions-group {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .queue-add-btn {
            flex: 1 !important;
            justify-content: center !important;
          }
          
          /* Show mobile cards, hide table on mobile */
          .queue-table-card {
            display: none !important;
          }
          .queue-mobile-cards-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .queue-mobile-order-card {
            background: #ffffff;
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            padding: 12px 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.03);
            display: flex;
            flex-direction: column;
            gap: 10px;
            cursor: pointer;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          .queue-mobile-order-card:active {
            transform: scale(0.99);
          }
          .mob-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
          .mob-card-avatar {
            width: 42px;
            height: 42px;
            border-radius: 10px;
            object-fit: cover;
            border: 1px solid #e2e8f0;
            flex-shrink: 0;
          }
          .mob-card-items-box {
            background: #f8fafc;
            border-radius: 10px;
            padding: 8px 10px;
            border: 1px solid #f1f5f9;
          }
          .mob-card-footer {
            display: flex;
            align-items: center;
            gap: 8px;
          }
        }

        /* NEW ORDER PULSING GLOW & ANIMATION */
        @keyframes newOrderGlowPulse {
          0% {
            background-color: #fffdf5 !important;
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4) !important;
            border-color: #f59e0b !important;
          }
          50% {
            background-color: #fef3c7 !important;
            box-shadow: 0 0 16px 4px rgba(245, 158, 11, 0.35) !important;
            border-color: #d97706 !important;
          }
          100% {
            background-color: #fffdf5 !important;
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4) !important;
            border-color: #f59e0b !important;
          }
        }

        .new-order-received-glow {
          animation: newOrderGlowPulse 2.2s infinite ease-in-out !important;
          border-left: 5px solid #d97706 !important;
        }

        .new-order-badge-pulse {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #d97706;
          color: #ffffff;
          font-size: 9.5px;
          font-weight: 900;
          padding: 2px 7px;
          border-radius: 6px;
          letter-spacing: 0.4px;
          animation: pulseBadge 1.5s infinite ease-in-out;
        }

        @keyframes pulseBadge {
          0% { transform: scale(0.96); opacity: 0.9; }
          50% { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(0.96); opacity: 0.9; }
        }

        /* MODERN MOBILE BOTTOM NAVIGATION BAR & DRAWER (HIDDEN BY DEFAULT ON DESKTOP) */
        .brewmaster-mobile-bottom-bar,
        .mob-drawer-backdrop {
          display: none !important;
        }

        @media (max-width: 768px) {
          .brewmaster-mobile-bottom-bar {
            display: flex !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 68px;
            background: rgba(255, 255, 255, 0.96);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid #e2e8f0;
            box-shadow: 0 -4px 25px rgba(0, 0, 0, 0.08);
            z-index: 9998;
            align-items: center;
            justify-content: space-around;
            padding: 0 6px calc(env(safe-area-inset-bottom, 0px) + 2px);
          }

          .mob-nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            padding: 6px 0;
            cursor: pointer;
            gap: 3px;
            color: #64748b;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            outline: none;
          }

          .mob-nav-item:active {
            transform: scale(0.92);
          }

          .mob-nav-item.active {
            color: #0f172a;
          }

          .mob-nav-icon-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 28px;
          }

          .mob-nav-emoji {
            font-size: 20px;
            transition: transform 0.2s;
          }

          .mob-nav-item.active .mob-nav-emoji {
            transform: translateY(-2px);
          }

          .mob-nav-label {
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: -0.2px;
            line-height: 1;
          }

          .mob-nav-item.active .mob-nav-label {
            font-weight: 850;
            color: #0f172a;
          }

          .mob-nav-badge-pill {
            position: absolute;
            top: -4px;
            right: -6px;
            background: #ef4444;
            color: #ffffff;
            font-size: 10px;
            font-weight: 900;
            padding: 1px 5px;
            border-radius: 999px;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
            animation: pulseBadge 1.5s infinite;
          }

          /* Center Floating + Button */
          .mob-nav-center-wrap {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
          }

          .mob-nav-center-btn {
            position: absolute;
            top: -22px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
            border: 3.5px solid #ffffff;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0,0,0,0.06);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            outline: none;
          }

          .mob-nav-center-btn:active {
            transform: scale(0.92);
          }

          .mob-nav-center-btn.open {
            background: #ef4444;
            transform: rotate(45deg);
            box-shadow: 0 8px 20px rgba(239, 68, 68, 0.35);
          }

          .mob-nav-plus-icon {
            font-size: 26px;
            font-weight: 300;
            line-height: 1;
            margin-top: -2px;
          }

          /* BOTTOM SLIDER DRAWER */
          .mob-drawer-backdrop {
            display: flex !important;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 99999;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.3s;
            align-items: flex-end;
          }

          .mob-drawer-backdrop.open {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
          }

          .mob-drawer-sheet {
            width: 100%;
            background: #ffffff;
            border-radius: 24px 24px 0 0;
            padding: 12px 18px 34px;
            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.25);
            transform: translateY(100%);
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            max-height: 85vh;
            overflow-y: auto;
            box-sizing: border-box;
          }

          .mob-drawer-sheet.open {
            transform: translateY(0);
          }

          .mob-drawer-drag-handle {
            width: 44px;
            height: 4px;
            background: #cbd5e1;
            border-radius: 4px;
            margin: 0 auto 12px;
          }

          .mob-drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 14px;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 14px;
          }

          .mob-drawer-title {
            font-size: 17px;
            font-weight: 900;
            color: #0f172a;
            margin: 0;
          }

          .mob-drawer-sub {
            font-size: 11.5px;
            color: #64748b;
            margin: 2px 0 0;
          }

          .mob-drawer-close-btn {
            background: #f1f5f9;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            color: #64748b;
            cursor: pointer;
            font-weight: 800;
          }

          .mob-drawer-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .mob-drawer-card {
            background: #f8fafc;
            border: 1.5px solid #f1f5f9;
            border-radius: 14px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            text-align: left;
            transition: all 0.15s ease;
            position: relative;
          }

          .mob-drawer-card:active {
            transform: scale(0.97);
            background: #f1f5f9;
          }

          .mob-drawer-card.active {
            background: #ffffff;
            border-color: #0f172a;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          }

          .mob-drawer-card.logout {
            border-color: #fee2e2;
            background: #fff5f5;
          }

          .mob-drawer-card-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
          }

          .mob-drawer-card-info {
            display: flex;
            flex-direction: column;
            min-width: 0;
            flex: 1;
          }

          .mob-drawer-card-info strong {
            font-size: 12.5px;
            font-weight: 800;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .mob-drawer-card-info span {
            font-size: 10.5px;
            color: #64748b;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .mob-drawer-card-badge {
            position: absolute;
            top: 6px;
            right: 8px;
            background: #ef4444;
            color: #ffffff;
            font-size: 9px;
            font-weight: 900;
            padding: 1px 5px;
            border-radius: 6px;
          }

          .dashboard-container {
            padding-bottom: 95px !important;
          }
        }

        @media (min-width: 769px) {
          .brewmaster-mobile-bottom-bar,
          .mob-drawer-backdrop,
          .mob-drawer-sheet,
          .queue-mobile-cards-container,
          .stock-mobile-cards-container,
          .leave-mobile-cards-container,
          .mobile-only-view {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
          .dashboard-sidebar {
            display: flex !important;
            width: 260px !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            bottom: 0 !important;
            z-index: 1000 !important;
          }
          .dashboard-container {
            margin-left: 260px !important;
            width: calc(100% - 260px) !important;
            padding: 28px 36px 48px 36px !important;
          }
          .dashboard-main {
            padding: 0 !important;
          }
          .tab-body-wrapper {
            padding: 16px 0 !important;
          }
          .queue-table-card,
          .stock-table-card,
          .leave-table-card,
          .desktop-only-view {
            display: block !important;
          }
        }

      `}</style>
    </div>
  );
}

