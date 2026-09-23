"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { onOrdersSnapshot, updateOrder, updateStockItem, addStockItem, addRestockRequest, onRestockRequestsSnapshot, onLeaveRequestsSnapshot, addLeaveRequest, getProfileSettings, updateProfileSettings, onProductsSnapshot, createOrder, getMenuItems, getCombos, getRestockHistory, getFeedback } from "@/lib/firestore";
import { loginWithEmail, signOut, signInWithGoogle, onAuthStateChange } from "@/lib/auth";
import { useRouter } from "next/navigation";

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

  // Tabs State (1st tab is Dashboard)
  const [activeTabState, setActiveTabState] = useState("dashboard");
  
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
  const [timeFilter, setTimeFilter] = useState("All");
  const [queueFilter, setQueueFilter] = useState("All");
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

  // Active Orders Queue with detailed fields (including office number, product image, details, priority, createdAt, allocatedTime)
  const [orders, setOrders] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [isOfflineItemModalOpen, setIsOfflineItemModalOpen] = useState(false);
  const [offlineOrderForm, setOfflineOrderForm] = useState({
    customerName: "",
    address: "",
    phone: "",
    walkIn: false,
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

  const filteredOrders = orders.filter(o => {
    if (timeFilter === "All" || !timeFilter) return true;
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
  const activeBrewingCount = filteredOrders.filter(o => o.status === "Preparing").length;
  const awaitingBrewCount = filteredOrders.filter(o => o.status === "Received" || o.status === "Pending").length;
  const readyDeliveryCount = filteredOrders.filter(o => o.status === "Ready" || o.status === "Out for Delivery").length;
  const offlineOrdersCount = filteredOrders.filter(o => o.isOffline === true).length;
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
      const val = typeof o.total === "string" ? parseFloat(o.total.replace(/[^\d\.]/g, "")) : parseFloat(o.total);
      itemMap[key].value += isNaN(val) ? 0 : val;
    });
    return Object.entries(itemMap).map(([k, v]) => ({
      item: `${k} (${v.count} units)`,
      value: `${v.count} ${v.count === 1 ? 'Cup' : 'Cups'}`
    }));
  })();

  const historyOrders = orders.map((o) => {
    const customizations = [];
    if (o.sugar) customizations.push(`Sugar: ${o.sugar}`);
    if (o.milk) customizations.push(`Milk: ${o.milk}`);

    return {
      id: o.orderId || (o.id && o.id.startsWith("#") ? o.id : `#${o.id ? o.id.replace("CHAI-ORD-", "").slice(-6).toUpperCase() : "LIVE"}`),
      originalId: o.id,
      customer: o.customer || (o.address?.firstName ? `${o.address.firstName} ${o.address.lastName || ''}`.trim() : (o.walkIn ? "Walk-in Customer" : "Corporate Client")),
      status: o.status || "Received",
      date: o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "Just now"),
      createdAt: o.createdAt || 0,
      items: o.item || (Array.isArray(o.items) ? o.items.map(it => `${it.name || it.item} x${it.quantity || 1}`).join(", ") : "Chai Selection"),
      customization: customizations.join(", ") || (o.walkIn ? "Counter Order" : "Standard Recipe"),
      office: o.office || o.address || (o.walkIn ? "Counter Pickup" : "Desk Delivery"),
      isOffline: Boolean(o.isOffline || o.walkIn),
      walkIn: Boolean(o.walkIn),
      paymentMethod: o.paymentMethod || (o.isOffline || o.walkIn ? "Cash" : "Online UPI"),
      paymentStatus: o.paymentStatus || "Paid",
      image: o.img || o.image || (Array.isArray(o.items) && o.items[0]?.image) || "/logo.png",
      rawOrder: o
    };
  });

  // Menu items — fetched from Firebase
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
  const [leaveStart, setLeaveStart] = useState("2026-07-10");
  const [leaveEnd, setLeaveEnd] = useState("2026-07-12");
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
          }).catch(() => {});
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
          setIncomingOrder(newest);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch((err) => {
              console.warn("Autoplay audio blocked or pending user interaction:", err);
            });
          }
          setToastMsg(`🚨 New Order #${newest.id ? (typeof newest.id === "string" ? newest.id.slice(-4) : newest.id) : ""}!`);
          setTimeout(() => setToastMsg(""), 6000);
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
    getMenuItems().then(setMenuItems);
    getCombos().then(setCombos);
    getRestockHistory().then(setRestockHistory);
    getFeedback().then(setFeedbackList);

    return () => {
      unsubOrders();
      unsubStock();
      unsubRestock();
      unsubLeave();
      unsubProducts();
      unsubAuth();
    };
  }, [router]);

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
          
          {/* MOBILE BOTTOM NAVBAR */}
          <div className="mobile-bottom-navbar" style={{ display: 'none' }}>
            <button onClick={() => setActiveTab("dashboard")} className={`mobile-bottom-nav-item ${activeTab === "dashboard" ? "active" : ""}`} style={{ background: "transparent", border: "none" }}>
              <span className="btn-emoji">📊</span> Dashboard
            </button>
            <button onClick={() => setActiveTab("queue")} className={`mobile-bottom-nav-item ${activeTab === "queue" ? "active" : ""}`} style={{ background: "transparent", border: "none" }}>
              <span className="btn-emoji">📥</span> Orders
            </button>
            <button onClick={() => setActiveTab("shop")} className={`mobile-bottom-nav-item ${activeTab === "shop" ? "active" : ""}`} style={{ background: "transparent", border: "none" }}>
              <span className="btn-emoji">🛍️</span> Shop
            </button>
            <button onClick={() => setActiveTab("profile")} className={`mobile-bottom-nav-item ${activeTab === "profile" ? "active" : ""}`} style={{ background: "transparent", border: "none" }}>
              <span className="btn-emoji">⚙️</span> Profile
            </button>
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
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                  alt="Profile"
                  className="profile-avatar-new"
                  onClick={() => setActiveTab("profile")}
                  style={{ cursor: "pointer" }}
                />
              </div>
            </header>

            {/* TAB CONTENT: DASHBOARD (MATCHING ADMIN DASHBOARD LAYOUT - ZERO COST & FULL OFFLINE/ONLINE VISIBILITY) */}
            {activeTab === "dashboard" && (() => {
              // Dynamic Calculations matching Admin
              const validOrders = orders.filter(o => o.status !== "Cancelled" && o.status !== "Cancelled by User" && o.status !== "Refunded");
              const totalOrdersCount = validOrders.length;
              const deliveredOrdersCount = validOrders.filter(o => o.status === "Delivered" || o.status === "Completed").length;
              const receivedOrdersCount = validOrders.filter(o => o.status === "Received" || o.status === "Pending").length;
              const preparingOrdersCount = validOrders.filter(o => o.status === "Preparing").length;
              const deliveryOrdersCount = validOrders.filter(o => o.status === "Out for Delivery" || o.status === "Ready" || o.status === "Shipped").length;
              const offlineOrdersCount = validOrders.filter(o => Boolean(o.isOffline || o.walkIn)).length;
              const onlineOrdersCount = validOrders.filter(o => !o.isOffline && !o.walkIn).length;

              // Top items calculation matching Admin
              const itemCounts = {};
              orders.forEach(o => {
                if (Array.isArray(o.items) && o.items.length > 0) {
                  o.items.forEach(it => {
                    const name = it.name || it.item || "Chai";
                    const qty = parseInt(it.quantity) || 1;
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
                <div style={{ padding: "24px", background: "#f8f9fa", minHeight: "100vh", fontFamily: "sans-serif" }}>
                  
                  {/* METRICS HEADER & TIME FILTER */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#2c1b0d" }}>Dashboard Live Metrics</h2>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#777" }}>Live Firestore real-time data and order analytics.</p>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", background: "#ffffff", padding: "4px 8px", borderRadius: "10px", border: "1px solid #eaeaea", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
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
                    </div>
                  </div>

                  {/* TOP ROW: SUMMARY CARDS (MATCHING ADMIN DASHBOARD 1:1 - ZERO COST) */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                    {[
                      { label: "Total Orders", value: `${totalOrdersCount}`, icon: "🧾", color: "#e8f5e9", text: "#2e7d32" },
                      { label: "Pending Orders", value: `${receivedOrdersCount + preparingOrdersCount}`, icon: "⏳", color: "#fff3e0", text: "#ef6c00", modal: "pending" },
                      { label: "Offline Orders", value: `${offlineOrdersCount}`, icon: "🏪", color: "#fff3e0", text: "#ef6c00", modal: "offline" },
                      { label: "Online Orders", value: `${onlineOrdersCount}`, icon: "🌐", color: "#e3f2fd", text: "#1565c0" },
                      { label: "Shipping Orders", value: `${deliveryOrdersCount}`, icon: "🚚", color: "#e3f2fd", text: "#1565c0" },
                      { label: "Pending Orders", value: `${preparingOrdersCount}`, icon: "🕒", color: "#ffebee", text: "#c62828" },
                      { label: "Completed Orders", value: `${deliveredOrdersCount}`, icon: "💰", color: "#e8f5e9", text: "#2e7d32" }
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

                  {/* MIDDLE ROW: SPLIT COLUMNS (MATCHING ADMIN DASHBOARD 1:1) */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                    
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


            {/* TAB: ORDER QUEUE (ALL ACTIVE ONLINE & OFFLINE PREPARATION ORDERS) */}
            {activeTab === "queue" && (() => {
              const allQueueOrders = orders
                .filter(o => o.priority !== "Subscription")
                .sort((a, b) => b.createdAt - a.createdAt);

              const onlineQueueCount = allQueueOrders.filter(o => !o.isOffline && !o.walkIn).length;
              const offlineQueueCount = allQueueOrders.filter(o => o.isOffline || o.walkIn).length;

              const filteredQueueOrders = allQueueOrders.filter(o => {
                if (queueFilter === "online") return !o.isOffline && !o.walkIn;
                if (queueFilter === "offline") return Boolean(o.isOffline || o.walkIn);
                return true;
              });

              return (
                <div className="tab-body-wrapper" style={{ padding: "28px 32px" }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: "wrap", gap: "14px" }}>
                    <div>
                      <h3 className="section-title" style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "#09090b" }}>Live Order Queue</h3>
                      <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#71717a" }}>Real-time preparation queue for online desk delivery orders and in-store counter walk-ins</p>
                    </div>

                    {/* Filter Tabs & Counter */}
                    <div style={{ display: "flex", background: "#f4f4f5", padding: "4px", borderRadius: "10px", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => setQueueFilter("all")}
                        style={{
                          padding: "6px 14px",
                          border: "none",
                          background: queueFilter === "all" ? "#09090b" : "transparent",
                          color: queueFilter === "all" ? "#ffffff" : "#52525b",
                          borderRadius: "7px",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        ☕ All ({allQueueOrders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueueFilter("online")}
                        style={{
                          padding: "6px 14px",
                          border: "none",
                          background: queueFilter === "online" ? "#09090b" : "transparent",
                          color: queueFilter === "online" ? "#ffffff" : "#52525b",
                          borderRadius: "7px",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        🏢 Online Desk ({onlineQueueCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueueFilter("offline")}
                        style={{
                          padding: "6px 14px",
                          border: "none",
                          background: queueFilter === "offline" ? "#09090b" : "transparent",
                          color: queueFilter === "offline" ? "#ffffff" : "#52525b",
                          borderRadius: "7px",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        🏪 Counter / Offline ({offlineQueueCount})
                      </button>
                    </div>
                  </div>

                  <div className="queue-list-container">
                    {filteredQueueOrders.length === 0 ? (
                      <div className="empty-column-msg" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "48px 20px", textAlign: "center", color: "#71717a" }}>
                        <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🫖</span>
                        <strong style={{ fontSize: "14px", color: "#09090b", display: "block", marginBottom: "4px" }}>No active orders in this queue filter</strong>
                        <span style={{ fontSize: "12px", color: "#71717a" }}>New orders from desk or offline counter will appear here instantly.</span>
                      </div>
                    ) : (
                      filteredQueueOrders.map((o) => {
                        const isOffline = Boolean(o.isOffline || o.walkIn);
                        return (
                          <div
                            key={o.id}
                            className="queue-list-item"
                            style={{ border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px 18px", background: "#ffffff", marginBottom: "12px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", transition: "all 0.15s ease" }}
                            onClick={() => {
                              setSelectedQueueOrder(o);
                              setDeliveryTimeInput(o.allocatedTime || "");
                              setQueueDeliveryPaymentMethod(o.paymentMethod || "Cash");
                              setQueueDeliveryPaymentStatus(o.paymentStatus || (o.paymentMethod === "Pending Selection" ? "Pending" : "Paid"));
                              setIsQueueSidebarOpen(true);
                            }}
                          >
                            <img src={o.image || o.img || "/logo.png"} alt={o.id} className="queue-list-img" style={{ width: "54px", height: "54px", borderRadius: "10px", objectFit: 'cover', border: "1px solid #e4e4e7", flexShrink: 0 }} />
                            <div className="queue-list-info" style={{ flexGrow: 1, minWidth: 0 }}>
                              <h4 style={{ fontSize: '14px', marginBottom: '4px', margin: 0, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ color: '#ffffff', fontWeight: '900', background: "#09090b", padding: "2px 7px", borderRadius: "4px", fontSize: "12px" }}>
                                  {o.orderId || (o.id && o.id.length > 8 ? o.id.substring(0,8) : o.id)}
                                </span>
                                <strong style={{ color: "#09090b" }}>{o.customer || "Guest"}</strong>
                                <span style={{
                                  fontSize: "10.5px",
                                  fontWeight: "800",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  background: isOffline ? "#fff7ed" : "#eff6ff",
                                  color: isOffline ? "#c2410c" : "#1d4ed8",
                                  border: isOffline ? "1px solid #fed7aa" : "1px solid #bfdbfe"
                                }}>
                                  {isOffline ? "🏪 Offline Counter" : "🌐 Online Desk"}
                                </span>
                                {isOffline ? (
                                  <span style={{
                                    fontSize: "10.5px",
                                    fontWeight: "750",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    background: (o.paymentStatus === "Pending" || o.paymentMethod === "Corporate Due" || o.paymentMethod === "Pending Selection") ? "#fef3c7" : "#ecfdf5",
                                    color: (o.paymentStatus === "Pending" || o.paymentMethod === "Corporate Due" || o.paymentMethod === "Pending Selection") ? "#92400e" : "#065f46",
                                    border: "1px solid #e2e8f0"
                                  }}>
                                    {o.paymentMethod === "Cash" ? "💵 Cash" : o.paymentMethod === "Card" ? "💳 Card" : (o.paymentMethod === "Corporate Due" || o.paymentStatus === "Pending" || o.paymentMethod === "Pending Selection") ? "⏳ Pending / Due" : `📱 ${o.paymentMethod || "Online UPI"}`}
                                  </span>
                                ) : (
                                  <span style={{
                                    fontSize: "10.5px",
                                    fontWeight: "750",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    background: "#f0fdf4",
                                    color: "#166534",
                                    border: "1px solid #bbf7d0"
                                  }}>
                                    💳 Paid Online
                                  </span>
                                )}
                              </h4>
                              <p style={{ fontWeight: '750', color: '#09090b', fontSize: '13px', margin: '4px 0 2px' }}>{o.item}</p>
                              <p style={{ fontSize: '11.5px', color: '#71717a', margin: '0 0 4px' }}>📍 {o.office || o.address || (o.walkIn ? "Counter Pickup" : "Desk Delivery")}</p>
                              <span className="time-elapsed" style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#71717a' }}>
                                ⏱️ {(() => {
                                  const diffMs = Date.now() - o.createdAt;
                                  const diffMins = Math.floor(diffMs / 60000);
                                  if (diffMins < 60) return `${diffMins}m ago`;
                                  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
                                  return new Date(o.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
                                })()}
                              </span>
                            </div>
                            <div className="queue-list-status" style={{ flexShrink: 0, textAlign: "right" }}>
                              <span style={{
                                fontSize: "11px",
                                fontWeight: "800",
                                padding: "5px 12px",
                                borderRadius: "6px",
                                background: o.status === "Preparing" ? "#0284c7" : o.status === "Delivered" ? "#16a34a" : o.status === "Out for Delivery" || o.status === "Ready" ? "#7e22ce" : "#f4f4f5",
                                color: o.status === "Preparing" || o.status === "Delivered" || o.status === "Out for Delivery" || o.status === "Ready" ? "#ffffff" : "#09090b",
                                border: "1px solid #e4e4e7",
                                display: "inline-block"
                              }}>
                                {o.status || "Received"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                {/* SLIDING SIDEBAR FOR ORDER DETAILS (NO MONEY) */}
                <div className={`queue-sidebar-overlay ${isQueueSidebarOpen ? "open" : ""}`} onClick={() => setIsQueueSidebarOpen(false)}></div>
                <div className={`queue-sidebar-panel ${isQueueSidebarOpen ? "open" : ""}`}>
                  {selectedQueueOrder && (() => {
                    const isOffline = Boolean(selectedQueueOrder.isOffline || selectedQueueOrder.walkIn);
                    return (
                      <div className="queue-sidebar-content">
                        <button className="sidebar-close-btn" onClick={() => setIsQueueSidebarOpen(false)}>✕</button>

                        <h2>Order #{selectedQueueOrder.id ? (typeof selectedQueueOrder.id === "string" ? selectedQueueOrder.id.slice(-6).toUpperCase() : selectedQueueOrder.id) : ""}</h2>
                        <div className="sidebar-detail-group">
                          <label>Customer</label>
                          <p>{selectedQueueOrder.customer}</p>
                          <label>Channel</label>
                          <p>{isOffline ? "🏪 Offline Counter Order" : "🌐 Online App Order (Desk Delivery)"}</p>
                          <label>Office / Desk</label>
                          <p>{selectedQueueOrder.office || selectedQueueOrder.address || (isOffline ? "Counter Pickup" : "Desk Delivery")}</p>
                          <label>Phone</label>
                          <p>{selectedQueueOrder.phone || "N/A"}</p>
                        </div>

                        <div className="sidebar-detail-group">
                          <label>Items to Brew</label>
                          <p><strong>{selectedQueueOrder.item}</strong></p>

                          <label>Preferences</label>
                          <p>{selectedQueueOrder.sugar || "Regular Sugar"} | {selectedQueueOrder.milk || "Standard Milk"}</p>
                          
                          <label>Fulfillment Priority</label>
                          <p>{selectedQueueOrder.priority || (isOffline ? "Counter Fast Fulfillment" : "Standard Desk Delivery")}</p>
                        </div>

                        <div className="sidebar-detail-group">
                          <label>Update Status</label>
                          <select
                            className="sidebar-select"
                            value={selectedQueueOrder.status || "Received"}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              const updates = { status: newStatus };
                              // Only handle settlement if it is an OFFLINE order
                              if (isOffline && newStatus === "Delivered" && (!selectedQueueOrder.paymentMethod || selectedQueueOrder.paymentMethod === "Pending Selection")) {
                                updates.paymentMethod = queueDeliveryPaymentMethod || "Cash";
                                updates.paymentStatus = queueDeliveryPaymentStatus || "Paid";
                              }
                              setSelectedQueueOrder({ ...selectedQueueOrder, ...updates });
                              updateOrder(selectedQueueOrder.id, updates);
                            }}
                          >
                            <option value="Received">Received</option>
                            <option value="Preparing">Preparing</option>
                            <option value="Out for Delivery">Out for Delivery / Ready</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        {/* PAYMENT SETTLEMENT: ONLINE vs OFFLINE */}
                        {!isOffline ? (
                          /* ONLINE ORDERS: NO CASH/UPI UPDATE NEEDED */
                          <div className="sidebar-detail-group" style={{
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: "12px",
                            padding: "12px 14px",
                            marginTop: "8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                          }}>
                            <span style={{ fontSize: "22px" }}>🌐</span>
                            <div>
                              <div style={{ fontSize: "12px", fontWeight: "800", color: "#166534" }}>Online Order (App Checkout)</div>
                              <div style={{ fontSize: "11px", color: "#15803d" }}>Payment settled online. No manual cash / UPI update needed.</div>
                            </div>
                          </div>
                        ) : (
                          /* OFFLINE ORDERS: COUNTER SETTLEMENT SELECTOR */
                          <div className="sidebar-detail-group" style={{
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            borderRadius: "12px",
                            padding: "14px",
                            marginTop: "8px"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <label style={{ margin: 0, fontWeight: "800", color: "#92400e", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                🏪 Offline Settlement Method
                              </label>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: "800",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                background: ((selectedQueueOrder.paymentStatus || queueDeliveryPaymentStatus) === "Pending" || (selectedQueueOrder.paymentMethod || queueDeliveryPaymentMethod) === "Corporate Due" || (selectedQueueOrder.paymentMethod || queueDeliveryPaymentMethod) === "Pending Selection") ? "#fef3c7" : "#166534",
                                color: ((selectedQueueOrder.paymentStatus || queueDeliveryPaymentStatus) === "Pending" || (selectedQueueOrder.paymentMethod || queueDeliveryPaymentMethod) === "Corporate Due" || (selectedQueueOrder.paymentMethod || queueDeliveryPaymentMethod) === "Pending Selection") ? "#92400e" : "#ffffff",
                                border: "1px solid rgba(0,0,0,0.1)"
                              }}>
                                {((selectedQueueOrder.paymentStatus || queueDeliveryPaymentStatus) === "Pending" || (selectedQueueOrder.paymentMethod || queueDeliveryPaymentMethod) === "Corporate Due" || (selectedQueueOrder.paymentMethod || queueDeliveryPaymentMethod) === "Pending Selection") ? "⏳ Payment Due / Pending" : "✅ Payment Collected"}
                              </span>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "6px" }}>
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
                                    style={{
                                      padding: "9px 8px",
                                      borderRadius: "8px",
                                      fontSize: "12px",
                                      fontWeight: "800",
                                      border: isSelected ? "2px solid #2c1b0d" : "1px solid #e2e8f0",
                                      background: isSelected ? "#2c1b0d" : "#ffffff",
                                      color: isSelected ? "#ffffff" : "#2c1b0d",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      textAlign: "center"
                                    }}
                                  >
                                    {pm.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

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

                                setToastMsg("Order details updated successfully!");
                                setSaveAnimation(true);
                                setTimeout(() => {
                                  setToastMsg("");
                                  setSaveAnimation(false);
                                }, 2000);
                              }}
                              style={{ 
                                background: saveAnimation ? "#25D366" : "#2c1b0d",
                                transition: "background 0.3s ease"
                              }}
                            >
                              {saveAnimation ? (
                                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
                                  </svg>
                                  Saved!
                                </span>
                              ) : "Save"}
                            </button>
                          </div>
                        </div>

                        <div className="sidebar-detail-group" style={{ marginTop: "15px" }}>
                          <button
                            className="sidebar-save-btn"
                            style={{ background: "#25D366", color: "#fff", width: "100%", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                            onClick={() => {
                              const customerPhone = selectedQueueOrder?.address?.phone || selectedQueueOrder?.phone || "";
                              if (!customerPhone) {
                                setToastMsg("No phone number found for this order.");
                                setTimeout(() => setToastMsg(""), 3000);
                                return;
                              }
                              let cleanPhone = customerPhone.replace(/\D/g, "");
                              if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
                              
                              const customerName = selectedQueueOrder?.address?.firstName || selectedQueueOrder?.address?.name || selectedQueueOrder?.customer || "Customer";
                              const orderIdText = selectedQueueOrder?.orderId || selectedQueueOrder?.id || "";
                              const currentStatus = selectedQueueOrder?.status || "Received";
                              
                              const message = `Hi ${customerName},\n\nYour Chai Chaska order #${orderIdText.slice(-6).toUpperCase()} status is now: *${currentStatus}*.\n\nThank you for choosing Chai Chaska!\nVisit: https://www.chaichaska.co.in/`;
                              
                              const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                              window.open(url, '_blank');
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                            </svg>
                            Send Message on WhatsApp
                          </button>
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
                <div className="tab-body-wrapper" style={{ position: "relative" }}>
                  {toastMsg && (
                    <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                      <span>🚨</span> {toastMsg}
                    </div>
                  )}

                  <div style={{ maxWidth: "1000px", margin: "0 auto", width: "100%" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setInventoryCategoryFilter(cat)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "20px",
                              fontSize: "11px",
                              fontWeight: "bold",
                              border: "none",
                              cursor: "pointer",
                              background: inventoryCategoryFilter === cat ? "#2c1b0d" : "#f0f0f0",
                              color: inventoryCategoryFilter === cat ? "#fff" : "#555",
                              transition: "all 0.2s"
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f8f9fa", padding: "6px 12px", borderRadius: "8px", border: "1px solid #eaeaea" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#555" }}>📅 Select Date:</span>
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
                            gap: "6px"
                          }}
                        >
                          <span className="btn-emoji">➕</span> Upload New Inventory
                        </button>
                      </div>
                    </div>

                    <div style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: "30px" }}>
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
                              <td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#888", fontStyle: "italic" }}>
                                No inventory items found for this category.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* Add Inventory Modal */}
                    {isAddInventoryModalOpen && (
                      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                        <div style={{ background: "#fff", padding: "30px", borderRadius: "16px", width: "400px", maxWidth: "90%" }}>
                          <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#2c1b0d" }}>Upload New Inventory</h3>
                          
                          <div style={{ marginBottom: "12px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Category</label>
                            <select 
                              value={newInventoryItem.category}
                              onChange={(e) => setNewInventoryItem({...newInventoryItem, category: e.target.value})}
                              style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ddd" }}
                            >
                              {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          
                          <div style={{ marginBottom: "12px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Item Name</label>
                            <input 
                              type="text" 
                              value={newInventoryItem.name}
                              onChange={(e) => setNewInventoryItem({...newInventoryItem, name: e.target.value})}
                              placeholder="e.g. Tea Leaves"
                              style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ddd" }}
                            />
                          </div>

                          <div style={{ marginBottom: "12px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Unit (e.g. kg, Litre, Pcs)</label>
                            <input 
                              type="text" 
                              value={newInventoryItem.unit}
                              onChange={(e) => setNewInventoryItem({...newInventoryItem, unit: e.target.value})}
                              placeholder="e.g. kg"
                              style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ddd" }}
                            />
                          </div>

                          <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Initial Qty</label>
                              <input 
                                type="number" 
                                value={newInventoryItem.qty}
                                onChange={(e) => setNewInventoryItem({...newInventoryItem, qty: e.target.value})}
                                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ddd" }}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Min Alert Limit</label>
                              <input 
                                type="number" 
                                value={newInventoryItem.minLimit}
                                onChange={(e) => setNewInventoryItem({...newInventoryItem, minLimit: e.target.value})}
                                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ddd" }}
                              />
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button 
                              onClick={() => setIsAddInventoryModalOpen(false)}
                              style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#f0f0f0", color: "#555", cursor: "pointer", fontWeight: "bold" }}
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
                              style={{ padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2c1b0d", color: "#fff", cursor: "pointer", fontWeight: "bold" }}
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
                if (historyDateFilter === "today") {
                  if (h.createdAt) {
                    const orderDate = new Date(h.createdAt);
                    const today = new Date();
                    return orderDate.toDateString() === today.toDateString();
                  }
                  const todayStr = new Date().toLocaleDateString("en-IN");
                  return h.date === todayStr || h.date === "Just now";
                }
                if (historyDateFilter === "7days") {
                  if (h.createdAt) {
                    return (Date.now() - h.createdAt) <= 7 * 24 * 60 * 60 * 1000;
                  }
                  return true;
                }
                return true;
              });

              return (
                <div className="tab-body-wrapper" style={{ padding: "28px 32px" }}>

                  {/* KITCHEN DISPATCH & PRODUCTION SLIP MODAL (ZERO MONEY) */}
                  {activeInvoice && (() => {
                    const cleanId = String(activeInvoice.id || "").replace("#", "");

                    return (
                      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, overflowY: "auto", padding: "20px" }}>
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
                          <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
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
                              <span>🖨️</span> Print Kitchen Dispatch Slip
                            </button>
                          </div>

                          {/* Printable Kitchen Slip Card */}
                          <div id="printable-invoice-card" style={{ background: "#ffffff", padding: "40px", borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.2)", border: "1px solid #e4e4e7", color: "#09090b", fontFamily: "system-ui, -apple-system, sans-serif" }}>

                            {/* Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #09090b", paddingBottom: "20px", marginBottom: "24px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                <img src="/logo.png" alt="Chai Chaska Logo" style={{ width: "52px", height: "52px", objectFit: "cover", borderRadius: "12px", border: "1px solid #e4e4e7" }} />
                                <div>
                                  <strong style={{ fontSize: "22px", color: "#09090b", letterSpacing: "0.5px", display: "block" }}>CHAI CHASKA</strong>
                                  <span style={{ fontSize: "12px", color: "#71717a", fontWeight: "600" }}>Brewmaster Kitchen & Dispatch Slip</span>
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: "10.5px", fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase", display: "block", color: "#71717a" }}>PRODUCTION SLIP</span>
                                <strong style={{ fontSize: "20px", color: "#09090b" }}>#{cleanId}</strong>
                              </div>
                            </div>

                            {/* Order Details Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1.5fr", gap: "14px", background: "#f8fafc", padding: "16px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "24px" }}>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#71717a", display: "block", textTransform: "uppercase", fontWeight: "800", marginBottom: "4px" }}>Order Channel</span>
                                <span style={{ fontSize: "12px", fontWeight: "850", padding: "3px 8px", borderRadius: "6px", background: activeInvoice.isOffline ? "#09090b" : "#e2e8f0", color: activeInvoice.isOffline ? "#ffffff" : "#09090b", display: "inline-block" }}>
                                  {activeInvoice.isOffline ? "🏪 Offline Counter" : "🏢 Online Desk"}
                                </span>
                              </div>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#71717a", display: "block", textTransform: "uppercase", fontWeight: "800", marginBottom: "4px" }}>Payment Method</span>
                                <strong style={{ fontSize: "12.5px", color: "#09090b", display: "block" }}>
                                  {activeInvoice.paymentMethod === "Cash" ? "💵 Cash" : activeInvoice.paymentMethod === "Card" ? "💳 Card" : activeInvoice.paymentMethod === "Corporate Due" ? "🏢 Due" : `📱 ${activeInvoice.paymentMethod || "Online UPI"}`}
                                </strong>
                                <span style={{ fontSize: "10.5px", color: "#16a34a", fontWeight: "750" }}>{activeInvoice.paymentStatus || "Paid"}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#71717a", display: "block", textTransform: "uppercase", fontWeight: "800", marginBottom: "4px" }}>Date & Time</span>
                                <strong style={{ fontSize: "12.5px", color: "#09090b" }}>
                                  {activeInvoice.createdAt ? new Date(activeInvoice.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : activeInvoice.date}
                                </strong>
                              </div>
                              <div>
                                <span style={{ fontSize: "10.5px", color: "#71717a", display: "block", textTransform: "uppercase", fontWeight: "800", marginBottom: "4px" }}>Customer / Location</span>
                                <strong style={{ fontSize: "13px", color: "#09090b", display: "block" }}>{activeInvoice.customer}</strong>
                                <span style={{ fontSize: "11.5px", color: "#52525b" }}>📍 {activeInvoice.office}</span>
                              </div>
                            </div>

                            {/* Itemized Kitchen Prep List */}
                            <div style={{ marginBottom: "28px" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ background: "#09090b", color: "#ffffff", fontSize: "11.5px", textTransform: "uppercase" }}>
                                    <th style={{ padding: "10px 16px", textAlign: "left", borderRadius: "8px 0 0 8px" }}>Item Description</th>
                                    <th style={{ padding: "10px 16px", textAlign: "left" }}>Customization / Recipe</th>
                                    <th style={{ padding: "10px 16px", textAlign: "center", borderRadius: "0 8px 8px 0" }}>Preparation Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ borderBottom: "1px solid #e4e4e7", fontSize: "13px" }}>
                                    <td style={{ padding: "16px" }}>
                                      <strong style={{ fontSize: "14px", color: "#09090b", display: "block" }}>{activeInvoice.items}</strong>
                                      <span style={{ fontSize: "11.5px", color: "#71717a" }}>Kitchen Target: Immediate Serving</span>
                                    </td>
                                    <td style={{ padding: "16px", fontSize: "12.5px", color: "#52525b" }}>
                                      {activeInvoice.customization || "Standard Kitchen Recipe"}
                                    </td>
                                    <td style={{ padding: "16px", textAlign: "center" }}>
                                      <span style={{ fontSize: "11px", fontWeight: "850", padding: "4px 10px", borderRadius: "6px", background: activeInvoice.status === "Delivered" || activeInvoice.status === "Completed" ? "#f4f4f5" : "#09090b", color: activeInvoice.status === "Delivered" || activeInvoice.status === "Completed" ? "#09090b" : "#ffffff", border: "1px solid #e4e4e7" }}>
                                        {activeInvoice.status}
                                      </span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Dispatch Confirmation Box */}
                            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px", background: "#fcfcfd", border: "1px solid #e4e4e7", padding: "16px 20px", borderRadius: "12px", marginBottom: "28px" }}>
                              <div>
                                <span style={{ fontSize: "11px", fontWeight: "900", color: "#09090b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Kitchen Quality Standards</span>
                                <p style={{ fontSize: "11.5px", color: "#71717a", margin: 0, lineHeight: 1.5 }}>
                                  Freshly boiled milk & steeped whole tea leaves. Served at optimal brewing temperature (85°C - 90°C) in sanitized insulated flask/cups.
                                </p>
                              </div>
                              <div style={{ textAlign: "right", borderLeft: "1px solid #e4e4e7", paddingLeft: "20px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "800", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Brewmaster Sign</span>
                                <strong style={{ fontSize: "14px", color: "#09090b", display: "block" }}>Master Tea Sommelier</strong>
                                <span style={{ fontSize: "10.5px", color: "#a1a1aa" }}>Verified & Dispatched</span>
                              </div>
                            </div>

                            {/* Footer info */}
                            <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: "14px", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#a1a1aa" }}>
                              <span>🏢 Chai Chaska Central Corporate Hub</span>
                              <span>📞 Central Kitchen Dispatch Unit</span>
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Header Title & Description */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px", flexWrap: "wrap", gap: "14px" }}>
                    <div>
                      <h3 className="section-title" style={{ margin: 0, fontSize: "22px", fontWeight: "900", color: "#09090b" }}>Order History & Logs</h3>
                      <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#71717a" }}>
                        Complete operational logs of all offline counter orders and online corporate desk deliveries
                      </p>
                    </div>
                  </div>

                  {/* Top Stats Cards Grid (Black & White Theme - Zero Money) */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }} className="dashboard-stats-grid">
                    <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Total Orders Logged</span>
                      <strong style={{ fontSize: "24px", fontWeight: "900", color: "#09090b" }}>{historyOrders.length}</strong>
                      <span style={{ fontSize: "11px", color: "#a1a1aa", display: "block", marginTop: "2px" }}>All channels recorded</span>
                    </div>

                    <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Completed & Served</span>
                      <strong style={{ fontSize: "24px", fontWeight: "900", color: "#09090b" }}>{completedCount}</strong>
                      <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "750", display: "block", marginTop: "2px" }}>● Fulfilled successfully</span>
                    </div>

                    <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>🏪 Offline / Walk-in</span>
                      <strong style={{ fontSize: "24px", fontWeight: "900", color: "#09090b" }}>{offlineCount}</strong>
                      <span style={{ fontSize: "11px", color: "#71717a", display: "block", marginTop: "2px" }}>Counter pickup orders</span>
                    </div>

                    <div style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <span style={{ fontSize: "11px", fontWeight: "800", color: "#71717a", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>🏢 Online Desk Orders</span>
                      <strong style={{ fontSize: "24px", fontWeight: "900", color: "#09090b" }}>{onlineCount}</strong>
                      <span style={{ fontSize: "11px", color: "#71717a", display: "block", marginTop: "2px" }}>Floor delivery requests</span>
                    </div>
                  </div>

                  {/* Filter Toolbar: Channel Filter + Date Filter + Search Bar + Layout Switcher */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "14px", background: "#ffffff", padding: "14px 18px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>

                    {/* Order Channel Tabs */}
                    <div style={{ display: "flex", background: "#f4f4f5", padding: "4px", borderRadius: "10px", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => setHistoryTypeFilter("all")}
                        style={{
                          padding: "7px 14px",
                          border: "none",
                          background: historyTypeFilter === "all" ? "#09090b" : "transparent",
                          color: historyTypeFilter === "all" ? "#ffffff" : "#52525b",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        ☕ All ({historyOrders.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTypeFilter("offline")}
                        style={{
                          padding: "7px 14px",
                          border: "none",
                          background: historyTypeFilter === "offline" ? "#09090b" : "transparent",
                          color: historyTypeFilter === "offline" ? "#ffffff" : "#52525b",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        🏪 Offline / Counter ({offlineCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryTypeFilter("online")}
                        style={{
                          padding: "7px 14px",
                          border: "none",
                          background: historyTypeFilter === "online" ? "#09090b" : "transparent",
                          color: historyTypeFilter === "online" ? "#ffffff" : "#52525b",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          transition: "all 0.15s ease"
                        }}
                      >
                        🏢 Online Desk ({onlineCount})
                      </button>
                    </div>

                    {/* Search Bar */}
                    <div style={{ flexGrow: 1, maxWidth: "320px", minWidth: "220px", position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Search ID, customer, item, desk..."
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 14px 8px 34px",
                          borderRadius: "10px",
                          border: "1.5px solid #e4e4e7",
                          fontSize: "12.5px",
                          background: "#f8fafc",
                          color: "#09090b",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                      />
                      <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", color: "#a1a1aa" }}>🔍</span>
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
                    <div style={{ display: "flex", background: "#f4f4f5", padding: "4px", borderRadius: "10px", gap: "4px" }}>
                      {[
                        { key: "all", label: "All Time" },
                        { key: "today", label: "Today" },
                        { key: "7days", label: "Last 7 Days" }
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setHistoryDateFilter(item.key)}
                          style={{
                            padding: "6px 12px",
                            border: "none",
                            background: historyDateFilter === item.key ? "#09090b" : "transparent",
                            color: historyDateFilter === item.key ? "#ffffff" : "#52525b",
                            borderRadius: "7px",
                            fontSize: "11.5px",
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
                    <div style={{ display: "flex", background: "#f4f4f5", padding: "4px", borderRadius: "10px", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode("list")}
                        style={{
                          padding: "6px 12px",
                          border: "none",
                          background: historyViewMode === "list" ? "#09090b" : "transparent",
                          color: historyViewMode === "list" ? "#ffffff" : "#52525b",
                          borderRadius: "7px",
                          fontSize: "11.5px",
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
                          padding: "6px 12px",
                          border: "none",
                          background: historyViewMode === "grid" ? "#09090b" : "transparent",
                          color: historyViewMode === "grid" ? "#ffffff" : "#52525b",
                          borderRadius: "7px",
                          fontSize: "11.5px",
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
                    <div style={{ background: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", padding: "64px 24px", textAlign: "center" }}>
                      <span style={{ fontSize: "42px", display: "block", marginBottom: "12px" }}>📜</span>
                      <strong style={{ fontSize: "16px", color: "#09090b", display: "block", marginBottom: "6px" }}>No orders matching the current filter</strong>
                      <p style={{ fontSize: "13px", color: "#71717a", margin: "0 auto 16px", maxWidth: "420px" }}>
                        Try switching the channel filter or adjusting the date range to see logged orders.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryTypeFilter("all");
                          setHistoryDateFilter("all");
                          setHistorySearchTerm("");
                        }}
                        style={{ background: "#09090b", color: "#ffffff", border: "none", padding: "8px 18px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                      >
                        Reset All Filters
                      </button>
                    </div>
                  ) : historyViewMode === "grid" ? (
                    /* GRID VIEW MODE */
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
                      {filteredHistory.map((h, i) => (
                        <div key={i} style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "12px", fontWeight: "900", color: "#ffffff", background: "#09090b", padding: "2px 7px", borderRadius: "5px" }}>
                                  {h.id}
                                </span>
                                <span style={{
                                  fontSize: "10.5px",
                                  fontWeight: "800",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: h.isOffline ? "#09090b" : "#f4f4f5",
                                  color: h.isOffline ? "#ffffff" : "#09090b",
                                  border: "1px solid #e4e4e7"
                                }}>
                                  {h.isOffline ? "🏪 Offline Walk-in" : "🏢 Desk Delivery"}
                                </span>
                                <span style={{
                                  fontSize: "10.5px",
                                  fontWeight: "750",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "#f8fafc",
                                  color: "#52525b",
                                  border: "1px solid #e2e8f0"
                                }}>
                                  {h.paymentMethod === "Cash" ? "💵 Cash" : h.paymentMethod === "Card" ? "💳 Card" : h.paymentMethod === "Corporate Due" ? "🏢 Due" : `📱 ${h.paymentMethod || "Online UPI"}`}
                                </span>
                              </div>
                              <span style={{ fontSize: "11px", color: "#71717a", fontWeight: "600" }}>{h.date}</span>
                            </div>

                            <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
                              <img
                                src={h.image || "/logo.png"}
                                alt={h.items}
                                style={{ width: "50px", height: "50px", borderRadius: "10px", objectFit: "cover", border: "1px solid #e4e4e7", flexShrink: 0 }}
                              />
                              <div style={{ flexGrow: 1, minWidth: 0 }}>
                                <strong style={{ fontSize: "14px", color: "#09090b", display: "block", marginBottom: "2px" }}>👤 {h.customer}</strong>
                                <p style={{ fontSize: "12.5px", color: "#27272a", fontWeight: "700", margin: "0 0 4px 0" }}>{h.items}</p>
                                <span style={{ fontSize: "11px", color: "#71717a", display: "block" }}>⚙️ {h.customization}</span>
                                <span style={{ fontSize: "11px", color: "#71717a", display: "block" }}>📍 {h.office}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                            <span style={{
                              fontSize: "11px",
                              fontWeight: "850",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              background: h.status === "Delivered" || h.status === "Completed" ? "#f4f4f5" : "#09090b",
                              color: h.status === "Delivered" || h.status === "Completed" ? "#09090b" : "#ffffff",
                              border: "1px solid #e4e4e7"
                            }}>
                              {h.status}
                            </span>

                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                onClick={() => setActiveInvoice(h)}
                                style={{ background: "#ffffff", border: "1.5px solid #e4e4e7", padding: "6px 12px", borderRadius: "8px", fontSize: "11.5px", fontWeight: "800", cursor: "pointer", color: "#09090b" }}
                              >
                                🖨️ Slip
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setToastMsg(`🔄 Re-opened order ${h.id} as active brewing request!`);
                                  setTimeout(() => setToastMsg(""), 3000);
                                }}
                                style={{ background: "#09090b", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "11.5px", cursor: "pointer", fontWeight: "800" }}
                              >
                                Re-open
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* LIST VIEW MODE (RESPONSIVE TABLE - ZERO MONEY) */
                    <div style={{ background: "#ffffff", borderRadius: "18px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", fontSize: "11px", textTransform: "uppercase", color: "#52525b", letterSpacing: "0.5px" }}>
                            <th style={{ padding: "16px 20px" }}>Order ID & Channel</th>
                            <th style={{ padding: "16px 20px" }}>Payment</th>
                            <th style={{ padding: "16px 20px" }}>Customer</th>
                            <th style={{ padding: "16px 20px" }}>Items & Customization</th>
                            <th style={{ padding: "16px 20px" }}>Destination / Desk</th>
                            <th style={{ padding: "16px 20px" }}>Date & Time</th>
                            <th style={{ padding: "16px 20px" }}>Status</th>
                            <th style={{ padding: "16px 20px", textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredHistory.map((h, i) => (
                            <tr key={i} style={{ borderBottom: i === filteredHistory.length - 1 ? "none" : "1px solid #f1f5f9", fontSize: "13px", transition: "background 0.1s ease" }}>
                              <td style={{ padding: "16px 20px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                  <strong style={{ color: "#09090b", fontSize: "13px" }}>{h.id}</strong>
                                  <span style={{
                                    fontSize: "10.5px",
                                    fontWeight: "800",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: h.isOffline ? "#09090b" : "#f4f4f5",
                                    color: h.isOffline ? "#ffffff" : "#09090b",
                                    border: "1px solid #e4e4e7",
                                    width: "fit-content"
                                  }}>
                                    {h.isOffline ? "🏪 Offline Walk-in" : "🏢 Desk Delivery"}
                                  </span>
                                </div>
                              </td>

                              <td style={{ padding: "16px 20px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                  <span style={{
                                    fontSize: "11px",
                                    fontWeight: "800",
                                    padding: "3px 8px",
                                    borderRadius: "5px",
                                    background: "#f4f4f5",
                                    color: "#09090b",
                                    border: "1px solid #e4e4e7",
                                    width: "fit-content"
                                  }}>
                                    {h.paymentMethod === "Cash" ? "💵 Cash" : h.paymentMethod === "Card" ? "💳 Card" : h.paymentMethod === "Corporate Due" ? "🏢 Corporate Due" : `📱 ${h.paymentMethod || "Online UPI"}`}
                                  </span>
                                  <span style={{ fontSize: "10.5px", color: h.paymentStatus === "Paid" ? "#16a34a" : "#ca8a04", fontWeight: "750" }}>
                                    ● {h.paymentStatus || "Paid"}
                                  </span>
                                </div>
                              </td>

                              <td style={{ padding: "16px 20px" }}>
                                <strong style={{ color: "#09090b", display: "block" }}>{h.customer}</strong>
                                <span style={{ fontSize: "11px", color: "#71717a" }}>{h.isOffline ? "Counter Guest" : "Corporate Partner"}</span>
                              </td>

                              <td style={{ padding: "16px 20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <img
                                    src={h.image || "/logo.png"}
                                    alt={h.items}
                                    style={{ width: "38px", height: "38px", borderRadius: "8px", objectFit: "cover", border: "1px solid #e4e4e7", flexShrink: 0 }}
                                  />
                                  <div>
                                    <span style={{ fontWeight: "750", color: "#09090b", display: "block" }}>{h.items}</span>
                                    <span style={{ fontSize: "11px", color: "#71717a" }}>{h.customization}</span>
                                  </div>
                                </div>
                              </td>

                              <td style={{ padding: "16px 20px", color: "#52525b" }}>
                                <span>📍 {h.office}</span>
                              </td>

                              <td style={{ padding: "16px 20px", color: "#71717a", fontSize: "12px" }}>
                                <span>{h.date}</span>
                              </td>

                              <td style={{ padding: "16px 20px" }}>
                                <span style={{
                                  fontSize: "11px",
                                  fontWeight: "850",
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  background: h.status === "Delivered" || h.status === "Completed" ? "#f4f4f5" : "#09090b",
                                  color: h.status === "Delivered" || h.status === "Completed" ? "#09090b" : "#ffffff",
                                  border: "1px solid #e4e4e7"
                                }}>
                                  {h.status}
                                </span>
                              </td>

                              <td style={{ padding: "16px 20px", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => setActiveInvoice(h)}
                                    style={{ background: "#ffffff", border: "1.5px solid #e4e4e7", padding: "6px 12px", borderRadius: "7px", fontSize: "11.5px", fontWeight: "800", cursor: "pointer", color: "#09090b" }}
                                  >
                                    🖨️ Slip
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setToastMsg(`🔄 Re-opened order ${h.id} as active brewing request!`);
                                      setTimeout(() => setToastMsg(""), 3000);
                                    }}
                                    style={{ background: "#09090b", color: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "7px", fontSize: "11.5px", cursor: "pointer", fontWeight: "800" }}
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

            {/* TAB: OFFLINE & WALK-IN ORDERS (BLACK & WHITE THEME - ZERO MONEY) */}
            {activeTab === "offline" && (
              <div className="tab-body-wrapper" style={{ padding: "28px 32px" }}>
                <div style={{ marginBottom: "20px" }}>
                  <h3 className="section-title" style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "#09090b" }}>Offline & Counter Walk-in Orders</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#71717a" }}>Create immediate counter orders and monitor recent in-store preparation batches</p>
                </div>

                {/* TOP ROW: 2 COLUMNS (LEFT: Customer & Destination, RIGHT: Kitchen Prep Items) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }} className="dashboard-double-row-grid">
                  {/* Left Column: Customer & Destination */}
                  <div style={{ background: "#ffffff", padding: "22px", borderRadius: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "850", color: "#09090b" }}>Customer & Destination</h4>
                      <div style={{ marginBottom: "14px" }}>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#52525b", textTransform: "uppercase", marginBottom: "6px" }}>Customer Name</label>
                        <input 
                          type="text"
                          value={offlineOrderForm.customerName}
                          onChange={e => setOfflineOrderForm({ ...offlineOrderForm, customerName: e.target.value })}
                          style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e4e4e7", background: "#f8fafc", fontSize: "13.5px", color: "#09090b", outline: "none", boxSizing: "border-box" }}
                          placeholder="e.g. Rahul Sharma"
                        />
                      </div>
                      <div style={{ marginBottom: "16px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", cursor: "pointer", fontWeight: "750", color: "#09090b" }}>
                          <input 
                            type="checkbox"
                            checked={offlineOrderForm.walkIn}
                            onChange={e => setOfflineOrderForm({ ...offlineOrderForm, walkIn: e.target.checked, address: e.target.checked ? "Walk-in Counter" : "", phone: e.target.checked ? "Walk-in" : "" })}
                            style={{ width: "16px", height: "16px", accentColor: "#000000" }}
                          />
                          Walk-in In-Store Customer (Immediate Counter Pickup)
                        </label>
                      </div>
                      {!offlineOrderForm.walkIn && (
                        <>
                          <div style={{ marginBottom: "14px" }}>
                            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#52525b", textTransform: "uppercase", marginBottom: "6px" }}>Mobile Number</label>
                            <input 
                              type="text"
                              value={offlineOrderForm.phone}
                              onChange={e => setOfflineOrderForm({ ...offlineOrderForm, phone: e.target.value })}
                              style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e4e4e7", background: "#f8fafc", fontSize: "13.5px", color: "#09090b", outline: "none", boxSizing: "border-box" }}
                              placeholder="+91 98000 00000"
                            />
                          </div>
                          <div style={{ marginBottom: "14px" }}>
                            <label style={{ display: "block", fontSize: "11.5px", fontWeight: "800", color: "#52525b", textTransform: "uppercase", marginBottom: "6px" }}>Desk / Office Location</label>
                            <textarea 
                              value={offlineOrderForm.address}
                              onChange={e => setOfflineOrderForm({ ...offlineOrderForm, address: e.target.value })}
                              style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e4e4e7", background: "#f8fafc", fontSize: "13.5px", color: "#09090b", outline: "none", minHeight: "85px", boxSizing: "border-box" }}
                              placeholder="e.g. 2nd Floor, Cabin 204 or Desk Bay 4"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Kitchen Prep Items & Order Action */}
                  <div style={{ background: "#ffffff", padding: "22px", borderRadius: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "850", color: "#09090b" }}>Kitchen Prep Items</h4>
                          <span style={{ fontSize: "12px", color: "#71717a" }}>Selected Chai & Snacks for brewing</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setIsOfflineItemModalOpen(true)}
                          style={{ background: "#000000", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontWeight: "800", fontSize: "12.5px" }}
                        >
                          + Add Products
                        </button>
                      </div>

                      <div style={{ maxHeight: "200px", minHeight: "130px", overflowY: "auto", border: "1px solid #f1f5f9", borderRadius: "12px", padding: "12px", marginBottom: "16px", background: "#fafafa" }}>
                        {offlineOrderForm.items.length === 0 ? (
                          <div style={{ textAlign: "center", color: "#71717a", fontSize: "13px", padding: "36px 0" }}>
                            No items added yet. Click "+ Add Products" to select.
                          </div>
                        ) : (
                          offlineOrderForm.items.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px", marginBottom: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <img src={item.image || "/logo.png"} alt={item.name} style={{ width: "36px", height: "36px", borderRadius: "8px", objectFit: "cover" }} />
                                <div>
                                  <strong style={{ display: "block", fontSize: "13.5px", color: "#09090b" }}>{item.name}</strong>
                                  <span style={{ color: "#71717a", fontSize: "11.5px" }}>Quantity: {item.qty} {item.qty === 1 ? "Cup/Unit" : "Cups/Units"}</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "12px", background: "#f4f4f5", padding: "3px 8px", borderRadius: "6px", fontWeight: "800", color: "#09090b" }}>{item.qty}x</span>
                                <button 
                                  type="button"
                                  onClick={() => setOfflineOrderForm({ ...offlineOrderForm, items: offlineOrderForm.items.filter((_, i) => i !== idx) })}
                                  style={{ background: "#f4f4f5", color: "#09090b", border: "1px solid #e4e4e7", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}
                                >✕</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "12px 16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "13.5px", fontWeight: "800", color: "#09090b" }}>Total Items to Prepare:</span>
                        <span style={{ background: "#000000", color: "#ffffff", padding: "5px 14px", borderRadius: "8px", fontWeight: "900", fontSize: "14px" }}>
                          {offlineOrderForm.items.reduce((acc, item) => acc + item.qty, 0)} Items
                        </span>
                      </div>

                      <button 
                        type="button"
                        onClick={async () => {
                          if (!offlineOrderForm.customerName || offlineOrderForm.items.length === 0) {
                            setToastMsg("❌ Please enter customer name and at least one item!");
                            setTimeout(() => setToastMsg(""), 3000);
                            return;
                          }
                          const orderData = {
                            customer: offlineOrderForm.customerName,
                            phone: offlineOrderForm.phone || "",
                            address: offlineOrderForm.address || (offlineOrderForm.walkIn ? "Counter Walk-in" : "Direct Pickup"),
                            walkIn: offlineOrderForm.walkIn,
                            isOffline: true,
                            paymentStatus: "Pending",
                            paymentMethod: "Pending Selection",
                            status: "Received",
                            total: "Counter Order",
                            priceNum: 0,
                            createdAt: Date.now(),
                            date: new Date().toLocaleDateString('en-GB'),
                            item: offlineOrderForm.items.map(i => `${i.name} x${i.qty}`).join(", "),
                            img: offlineOrderForm.items[0]?.image || "/logo.png"
                          };
                          try {
                            await createOrder(orderData);
                            setToastMsg("✅ Offline Counter Order Created & Added to Queue!");
                            setOfflineOrderForm({ customerName: "", address: "", phone: "", walkIn: false, items: [] });
                            setTimeout(() => setToastMsg(""), 3000);
                          } catch (e) {
                            setToastMsg("❌ Error creating order: " + e.message);
                            setTimeout(() => setToastMsg(""), 3000);
                          }
                        }}
                        style={{ background: "#000000", color: "#ffffff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: "900", cursor: "pointer", width: "100%", fontSize: "14px", letterSpacing: "0.5px" }}
                      >
                        CREATE COUNTER ORDER ☕
                      </button>
                    </div>
                  </div>
                </div>

                {/* BOTTOM SECTION: RECENT OFFLINE ORDERS */}
                <div style={{ background: "#ffffff", padding: "22px", borderRadius: "18px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "900", color: "#09090b" }}>Recent Offline Orders</h4>
                      <span style={{ fontSize: "12px", color: "#71717a" }}>Counter walk-ins and direct kitchen requests</span>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: "800", background: "#f4f4f5", padding: "4px 10px", borderRadius: "6px", border: "1px solid #e4e4e7" }}>
                      {orders.filter(o => o.isOffline === true).length} Orders
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "12px", maxHeight: "450px", overflowY: "auto", paddingRight: "4px" }}>
                    {orders.filter(o => o.isOffline === true).slice(0, 30).map((o, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", background: "#fafafa", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
                        <img 
                          src={o.img || o.image || "/logo.png"} 
                          alt={o.item || "Chai"} 
                          style={{ width: "46px", height: "46px", borderRadius: "8px", objectFit: "cover", border: "1px solid #e4e4e7", flexShrink: 0 }} 
                        />
                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "11px", fontWeight: "900", background: "#000000", color: "#ffffff", padding: "2px 6px", borderRadius: "4px" }}>
                              #{typeof o.id === "string" ? o.id.slice(-5).toUpperCase() : o.id}
                            </span>
                            <strong style={{ fontSize: "13.5px", color: "#09090b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {o.customer || "Walk-in Guest"}
                            </strong>
                            <span style={{
                              fontSize: "10.5px",
                              fontWeight: "750",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "#f4f4f5",
                              color: "#09090b",
                              border: "1px solid #e4e4e7"
                            }}>
                              {o.paymentMethod === "Cash" ? "💵 Cash" : o.paymentMethod === "Card" ? "💳 Card" : o.paymentMethod === "Corporate Due" ? "🏢 Due" : `📱 ${o.paymentMethod || "Online UPI"}`}
                            </span>
                          </div>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#52525b", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.item}</p>
                          <span style={{ fontSize: "11px", color: "#71717a" }}>📍 {o.address || (o.walkIn ? "Counter Pickup" : "In-store")}</span>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <span style={{
                            fontSize: "10.5px",
                            fontWeight: "800",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            background: o.status === "Delivered" || o.status === "Completed" ? "#e8f5e9" : "#000000",
                            color: o.status === "Delivered" || o.status === "Completed" ? "#2e7d32" : "#ffffff",
                            border: "1px solid #e4e4e7"
                          }}>
                            {o.status || "Received"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {orders.filter(o => o.isOffline === true).length === 0 && (
                      <div style={{ textAlign: "center", padding: "40px 10px", color: "#71717a", fontSize: "13px", gridColumn: "1 / -1" }}>
                        No offline counter orders recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* ITEM SELECTION MODAL (ZERO MONEY - FIXED CENTERED) */}
          {isOfflineItemModalOpen && (
            <div 
              onClick={() => setIsOfflineItemModalOpen(false)}
              style={{ 
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0, 0, 0, 0.65)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100000,
                padding: "20px"
              }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  width: "100%", 
                  maxWidth: "680px", 
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
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "900", color: "#09090b" }}>Select Chai & Products to Prepare</h3>
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

                <div style={{ maxHeight: "420px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingRight: "10px" }}>
                  {productsList.length === 0 ? <p style={{ color: "#71717a" }}>Loading menu items...</p> : productsList.map(prod => (
                    <div key={prod.id} style={{ display: "flex", gap: "12px", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "10px", alignItems: "center", background: "#ffffff" }}>
                      <img src={prod.image || "/logo.png"} alt={prod.name} style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e4e4e7" }} />
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <strong style={{ display: "block", fontSize: "13px", color: "#09090b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prod.name}</strong>
                        <span style={{ fontSize: "11px", color: "#71717a" }}>{prod.category || "Beverage Item"}</span>
                      </div>
                      {(() => {
                        const existing = offlineOrderForm.items.find(i => i.id === prod.id);
                        if (existing) {
                          return (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#f4f4f5", borderRadius: "6px", padding: "3px", border: "1px solid #e4e4e7" }}>
                              <button 
                                type="button"
                                onClick={() => {
                                  if (existing.qty > 1) {
                                    setOfflineOrderForm({
                                      ...offlineOrderForm, 
                                      items: offlineOrderForm.items.map(i => i.id === prod.id ? { ...i, qty: i.qty - 1 } : i)
                                    });
                                  } else {
                                    setOfflineOrderForm({
                                      ...offlineOrderForm, 
                                      items: offlineOrderForm.items.filter(i => i.id !== prod.id)
                                    });
                                  }
                                }}
                                style={{ background: "#000000", color: "#fff", border: "none", width: "22px", height: "22px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}
                              >
                                -
                              </button>
                              <span style={{ fontSize: "12px", fontWeight: "bold", width: "16px", textAlign: "center", color: "#09090b" }}>{existing.qty}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  setOfflineOrderForm({
                                    ...offlineOrderForm, 
                                    items: offlineOrderForm.items.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i)
                                  });
                                }}
                                style={{ background: "#000000", color: "#fff", border: "none", width: "22px", height: "22px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}
                              >
                                +
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <button 
                              type="button"
                              onClick={() => {
                                setOfflineOrderForm({
                                  ...offlineOrderForm, 
                                  items: [...offlineOrderForm.items, { id: prod.id, name: prod.name, priceNum: 0, image: prod.image || prod.imagePath || prod.img || "/logo.png", qty: 1 }]
                                });
                              }}
                              style={{ background: "#000000", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                            >
                              Add
                            </button>
                          );
                        }
                      })()}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                  <div style={{ fontSize: "12.5px", color: "#09090b", flexGrow: 1, paddingRight: "20px" }}>
                    {offlineOrderForm.items.length > 0 ? (
                      <span><strong>Added: </strong> {offlineOrderForm.items.map(i => `${i.qty}x ${i.name}`).join(", ")}</span>
                    ) : (
                      <span style={{ color: "#71717a" }}>No items added yet. Click 'Add' to choose.</span>
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
          const val = typeof o.total === "string" ? parseFloat(o.total.replace(/[^\d\.]/g, "")) : parseFloat(o.total || o.price || 0);
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
          const val = typeof o.total === "string" ? parseFloat(o.total.replace(/[^\d\.]/g, "")) : parseFloat(o.total || o.price || 0);
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


