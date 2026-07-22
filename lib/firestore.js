import { db } from "./firebase";
export { db };
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

// ═══════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════
export function onProductsSnapshot(callback) {
  const q = query(collection(db, "products"));
  return onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
    items.sort((a, b) => Number(a.id) - Number(b.id));
    callback(items);
  });
}

export async function getProducts() {
  const snap = await getDocs(collection(db, "products"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  items.sort((a, b) => Number(a.id) - Number(b.id));
  return items;
}

export async function getProductById(id) {
  const ref = doc(db, "products", String(id));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id };
}

export async function addProduct(data) {
  const ref = await addDoc(collection(db, "products"), data);
  return ref.id;
}

export async function updateProduct(id, data) {
  const ref = doc(db, "products", String(id));
  await updateDoc(ref, data);
}

export async function deleteProduct(id) {
  const ref = doc(db, "products", String(id));
  await deleteDoc(ref);
}

// ═══════════════════════════════════════════
// ADDONS
// ═══════════════════════════════════════════
export async function getAddons() {
  const snap = await getDocs(collection(db, "addons"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  return items;
}

export async function addAddon(data) {
  const ref = await addDoc(collection(db, "addons"), data);
  return ref.id;
}

export async function updateAddon(id, data) {
  await updateDoc(doc(db, "addons", id), data);
}

export async function deleteAddon(id) {
  await deleteDoc(doc(db, "addons", id));
}

// ═══════════════════════════════════════════
// COUPONS
// ═══════════════════════════════════════════
export async function getCoupons() {
  const snap = await getDocs(collection(db, "coupons"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  return items;
}

export async function addCoupon(data) {
  const ref = await addDoc(collection(db, "coupons"), data);
  return ref.id;
}

export async function updateCoupon(id, data) {
  await updateDoc(doc(db, "coupons", id), data);
}

export async function deleteCoupon(id) {
  await deleteDoc(doc(db, "coupons", id));
}

// ═══════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════
export async function createOrder(orderData) {
  const orderId = `CHAI-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const ref = doc(db, "orders", orderId);
  await setDoc(ref, {
    ...orderData,
    orderId,
    status: "Received",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return orderId;
}

export async function getOrders() {
  const snap = await getDocs(collection(db, "orders"));
  const items = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data.status !== "Pending Payment" && data.status !== "Failed") {
      items.push({ ...data, id: d.id });
    }
  });
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return items;
}

export async function getOrderById(id) {
  const ref = doc(db, "orders", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id };
}

export async function updateOrder(id, data) {
  const ref = doc(db, "orders", id);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });

  if (data.status && ["Received", "Preparing", "Shipped", "Delivered"].includes(data.status)) {
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const orderInfo = snap.data();
        let phone = orderInfo.address?.phone || orderInfo.phone || "917253015988";
        if (phone) {
          // Formatting for WhatsApp API: Ensure it has country code (default 91) without '+'
          phone = phone.replace(/\D/g, "");
          if (phone.length === 10) phone = "91" + phone;
          
          const customerName = orderInfo.address?.firstName || orderInfo.address?.name || "Customer";
          const totalAmount = orderInfo.total || 0;
          const orderDate = new Date(orderInfo.createdAt || Date.now()).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
          });

          await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: phone,
              orderId: orderInfo.orderId || id,
              status: data.status,
              customerName: customerName,
              totalAmount: totalAmount,
              date: orderDate
            })
          }).catch(err => console.error("WhatsApp trigger failed:", err));
        }
      }
    } catch (err) {
      console.error("Failed to fetch order for WhatsApp:", err);
    }
  }
}

// Real-time listener for orders (admin dashboard)
export function onOrdersSnapshot(callback) {
  return onSnapshot(collection(db, "orders"), (snap) => {
    const items = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.status !== "Pending Payment" && data.status !== "Failed") {
        items.push({ ...data, id: d.id });
      }
    });
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(items);
  });
}

// ═══════════════════════════════════════════
// SUBSCRIPTIONS
// ═══════════════════════════════════════════
export async function createSubscription(data) {
  const subId = `SUB-${Date.now()}`;
  const ref = doc(db, "subscriptions", subId);
  await setDoc(ref, {
    ...data,
    subId,
    status: "Active",
    createdAt: Date.now(),
  });
  return subId;
}

export async function addSubscription(data) {
  const ref = await addDoc(collection(db, "subscriptions"), { ...data, createdAt: Date.now() });
  return ref.id;
}

export function onSubscriptionsSnapshot(callback) {
  const q = query(collection(db, "subscriptions"));
  return onSnapshot(q, (snap) => {
    const items = [];
    const today = new Date().setHours(0,0,0,0);
    snap.forEach((d) => {
      const data = d.data();
      if (data.status === "Active" && data.endDateIso) {
        const end = new Date(data.endDateIso).setHours(0,0,0,0);
        if (today > end) {
          updateDoc(doc(db, "subscriptions", d.id), { status: "Expired", updatedAt: Date.now() });
          data.status = "Expired";
        }
      }
      items.push({ ...data, id: d.id });
    });
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(items);
  });
}

export async function getSubscriptions() {
  const snap = await getDocs(collection(db, "subscriptions"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return items;
}

export async function updateSubscription(id, data) {
  await updateDoc(doc(db, "subscriptions", id), { ...data, updatedAt: Date.now() });
}

// ═══════════════════════════════════════════
// STOCK (Inventory)
// ═══════════════════════════════════════════
export async function getStock() {
  const snap = await getDocs(collection(db, "stock"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  return items;
}

export async function addStockItem(data) {
  const ref = await addDoc(collection(db, "stock"), data);
  return ref.id;
}

export async function updateStockItem(id, data) {
  await updateDoc(doc(db, "stock", id), data);
}

export async function deleteStockItem(id) {
  await deleteDoc(doc(db, "stock", id));
}

// ═══════════════════════════════════════════
// MENU ITEMS (Admin-managed menu)
// ═══════════════════════════════════════════
export async function getMenuItems() {
  const snap = await getDocs(collection(db, "menuItems"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  return items;
}

export async function addMenuItem(data) {
  const ref = await addDoc(collection(db, "menuItems"), data);
  return ref.id;
}

export async function updateMenuItem(id, data) {
  await updateDoc(doc(db, "menuItems", id), data);
}

export async function deleteMenuItem(id) {
  await deleteDoc(doc(db, "menuItems", id));
}

// ═══════════════════════════════════════════
// COMBOS
// ═══════════════════════════════════════════
export async function getCombos() {
  const snap = await getDocs(collection(db, "combos"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  return items;
}

export async function addCombo(data) {
  const ref = await addDoc(collection(db, "combos"), data);
  return ref.id;
}

export async function updateCombo(id, data) {
  await updateDoc(doc(db, "combos", id), data);
}

export async function deleteCombo(id) {
  await deleteDoc(doc(db, "combos", id));
}

// ═══════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════
export async function getFeedback() {
  const q = query(
    collection(db, 'product_feedback'),
    where('approved', '==', true)
  );
  const snap = await getDocs(q);
  const items = [];
  snap.forEach(d => items.push({ ...d.data(), id: d.id }));
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return items;
}

export async function addFeedback(data) {
  const ref = await addDoc(collection(db, "feedback"), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

// ═══════════════════════════════════════════
// SETTINGS (Shop config)
// ═══════════════════════════════════════════
export async function getSettings() {
  const ref = doc(db, "settings", "general");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function updateSettings(data) {
  const ref = doc(db, "settings", "general");
  await setDoc(ref, data, { merge: true });
}

export async function getProfileSettings() {
  const ref = doc(db, "settings", "profile");
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function updateProfileSettings(data) {
  const ref = doc(db, "settings", "profile");
  await setDoc(ref, data, { merge: true });
}


// ═══════════════════════════════════════════
// LEAVE REQUESTS
// ═══════════════════════════════════════════
export async function getLeaveRequests() {
  const snap = await getDocs(collection(db, "leaveRequests"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  return items;
}

export function onLeaveRequestsSnapshot(callback) {
  return onSnapshot(collection(db, "leaveRequests"), (snap) => {
    const items = [];
    snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(items);
  });
}

export async function addLeaveRequest(data) {
  const ref = await addDoc(collection(db, "leaveRequests"), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateLeaveRequest(id, data) {
  await updateDoc(doc(db, "leaveRequests", id), data);
}

export async function deleteLeaveRequest(id) {
  await deleteDoc(doc(db, "leaveRequests", id));
}

// ═══════════════════════════════════════════
// RESTOCK REQUESTS
// ═══════════════════════════════════════════
export async function getRestockRequests() {
  const snap = await getDocs(collection(db, "restockRequests"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return items;
}

export async function addRestockRequest(data) {
  const ref = await addDoc(collection(db, "restockRequests"), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateRestockRequest(id, data) {
  await updateDoc(doc(db, "restockRequests", id), data);
}

export function onRestockRequestsSnapshot(callback) {
  return onSnapshot(collection(db, "restockRequests"), (snap) => {
    const items = [];
    snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(items);
  });
}

// ═══════════════════════════════════════════
// RESTOCK HISTORY
// ═══════════════════════════════════════════
export async function getRestockHistory() {
  const snap = await getDocs(collection(db, "restockHistory"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return items;
}

export async function addRestockHistory(data) {
  const ref = await addDoc(collection(db, "restockHistory"), {
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

// ═══════════════════════════════════════════
// CONTACT SETTINGS
// ═══════════════════════════════════════════
export async function getContactInfo() {
  const ref = doc(db, 'settings', 'contact');
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return {
      brandName: 'ChaiCo.',
      brandDesc: 'Freshly brewed spice teas and organic loose blends sourced straight from certified tea farms. Delivered hot and fresh.',
      address1: '102 Tea Estate lane, Assam Garden,',
      address2: 'India 781001',
      phone: '+91 98765 43210',
      email: 'hello@chaico.com'
    };
  }
  return snap.data();
}

export async function updateContactInfo(data) {
  const ref = doc(db, 'settings', 'contact');
  await setDoc(ref, data, { merge: true });
}


// ═══════════════════════════════════════════
// PRODUCT FEEDBACK SYSTEM
// ═══════════════════════════════════════════
export async function submitProductFeedback(data) {
  const feedbackId = `FB-${Date.now()}`;
  const ref = doc(db, 'product_feedback', feedbackId);
  await setDoc(ref, {
    ...data,
    id: feedbackId,
    approved: false,
    createdAt: Date.now()
  });
  return feedbackId;
}

export async function getApprovedFeedbackForProduct(productId) {
  const q = query(
    collection(db, 'product_feedback'),
    where('productId', '==', productId),
    where('approved', '==', true)
  );
  const snap = await getDocs(q);
  const items = [];
  snap.forEach(d => items.push({ ...d.data(), id: d.id }));
  items.sort((a, b) => b.createdAt - a.createdAt);
  return items;
}

export async function getPendingFeedback() {
  const q = query(
    collection(db, 'product_feedback'),
    where('approved', '==', false)
  );
  const snap = await getDocs(q);
  const items = [];
  snap.forEach(d => items.push({ ...d.data(), id: d.id }));
  items.sort((a, b) => b.createdAt - a.createdAt);
  return items;
}

export async function approveFeedback(feedbackId) {
  const ref = doc(db, 'product_feedback', feedbackId);
  await updateDoc(ref, { approved: true });
}

export async function deleteFeedback(feedbackId) {
  const ref = doc(db, 'product_feedback', feedbackId);
  await deleteDoc(ref);
}

// ═══════════════════════════════════════════

export async function getUserAddresses(uid) {
  const snap = await getDocs(collection(db, "users", uid, "addresses"));
  const items = [];
  snap.forEach(d => items.push({ ...d.data(), id: d.id }));
  // Optional sort if there's a timestamp, otherwise just return
  return items;
}

export async function addUserAddress(uid, addressData) {
  const addressId = addressData.id || Date.now().toString();
  const ref = doc(db, "users", uid, "addresses", addressId);
  await setDoc(ref, {
    ...addressData,
    id: addressId
  });
  return addressId;
}

// ═══════════════════════════════════════════
// USER WALLET & TRANSACTIONS
// ═══════════════════════════════════════════
export async function getUserTransactions(uid) {
  const snap = await getDocs(collection(db, "users", uid, "transactions"));
  const items = [];
  snap.forEach(d => items.push({ ...d.data(), id: d.id }));
  items.sort((a, b) => b.createdAt - a.createdAt);
  return items;
}

export async function addUserTransaction(uid, transactionData) {
  const txId = transactionData.id || `tx-${Date.now()}`;
  const ref = doc(db, "users", uid, "transactions", txId);
  await setDoc(ref, {
    ...transactionData,
    id: txId,
    createdAt: Date.now()
  });
  return txId;
}

export async function updateUserCoins(uid, coinsDelta, transactionDesc) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  
  let currentCoins = 0;
  if (snap.exists()) {
    currentCoins = snap.data().coins;
    if (typeof currentCoins === 'string') {
      currentCoins = parseFloat(currentCoins) || 0;
    }
    if (typeof currentCoins !== 'number' || isNaN(currentCoins)) {
      currentCoins = 0;
    }
  }
  
  let newCoins = currentCoins + coinsDelta;
  if (isNaN(newCoins)) newCoins = currentCoins; // Fallback if coinsDelta was NaN
  
  await setDoc(userRef, { coins: newCoins }, { merge: true });
  
  if (transactionDesc) {
    await addUserTransaction(uid, {
      desc: transactionDesc,
      type: coinsDelta > 0 ? "credit" : "debit",
      coins: Math.abs(coinsDelta),
      date: new Date().toISOString().split("T")[0],
      status: "Completed"
    });
  }
  return newCoins;
}

