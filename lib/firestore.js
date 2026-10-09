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
  let nextIdNum = 1;
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const latestOrder = snap.docs[0].data();
      const latestIdStr = latestOrder.orderId || "";
      if (latestIdStr.startsWith("ID-")) {
        const num = parseInt(latestIdStr.replace("ID-", ""), 10);
        if (!isNaN(num)) {
          nextIdNum = num + 1;
        }
      } else {
        // Fallback if previous order was CHAI-ORD-...
        nextIdNum = 1; // start fresh with ID-00001
      }
    }
  } catch (err) {
    console.error("Error fetching latest order ID", err);
  }

  const orderId = `ID-${String(nextIdNum).padStart(5, '0')}`;
  const ref = doc(db, "orders", orderId);
  const finalOrder = {
    ...orderData,
    orderId,
    status: orderData.status || "Received",
    createdAt: (typeof orderData.createdAt === 'number' && !isNaN(orderData.createdAt)) ? orderData.createdAt : (orderData.createdAt ? new Date(orderData.createdAt).getTime() : Date.now()),
    updatedAt: Date.now(),
  };

  await setDoc(ref, finalOrder);

  // Send ONLY initial Order Confirmation WhatsApp message with Image
  const customerPhone = finalOrder.phone || (typeof finalOrder.address === 'object' ? finalOrder.address?.phone : "");
  if (customerPhone && customerPhone !== "N/A") {
    try {
      const orderImage = finalOrder.image || finalOrder.img || (finalOrder.items?.[0]?.image) || "";
      const customerName = finalOrder.customer || (finalOrder.address?.firstName ? `${finalOrder.address.firstName} ${finalOrder.address.lastName || ''}`.trim() : "Valued Customer");
      const orderLocation = (finalOrder.isOffline || finalOrder.walkIn)
        ? (finalOrder.address || "Counter Walk-in")
        : (finalOrder.office || (typeof finalOrder.address === "string" ? finalOrder.address : (finalOrder.address?.address1 || finalOrder.address?.city || "Desk Delivery")));
      const itemsFormatted = finalOrder.item || (Array.isArray(finalOrder.items) ? finalOrder.items.map(it => `${it.name || it.item} x${it.quantity || it.qty || 1}`).join(", ") : "Chai Selection");
      const totalAmount = finalOrder.total || finalOrder.price || finalOrder.totalPrice || 0;

      fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: customerPhone,
          orderId: orderId,
          status: "Received",
          customerName: customerName,
          totalAmount: totalAmount,
          items: itemsFormatted,
          itemsList: finalOrder.items || [],
          location: orderLocation,
          image: orderImage,
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        })
      }).catch(err => console.error("Order creation WhatsApp trigger failed:", err));
    } catch (e) {
      console.error("WhatsApp trigger error on createOrder:", e);
    }
  }

  return orderId;
}

export async function getOrders() {
  const snap = await getDocs(collection(db, "orders"));
  const items = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data.status !== "Failed" && data.paymentStatus !== "Failed") {
      items.push({ ...data, id: d.id, orderId: data.orderId || d.id });
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
  const snap = await getDoc(ref);
  const previousData = snap.exists() ? snap.data() : {};

  await updateDoc(ref, { ...data, updatedAt: Date.now() });

  // Message #2: Send Delivered WhatsApp message (text only, no image) ONLY ONCE when transition to Delivered happens
  const isDelivered = data.status === "Delivered" || data.status === "Completed";
  const wasAlreadyDelivered = previousData.status === "Delivered" || previousData.status === "Completed" || previousData.deliveredMessageSent === true;

  if (isDelivered && !wasAlreadyDelivered) {
    try {
      await updateDoc(ref, { deliveredMessageSent: true });

      const phone = data.phone || previousData.address?.phone || previousData.phone;
      if (phone && phone !== "N/A") {
        const customerName = data.customer || previousData.customer || (previousData.address?.firstName ? `${previousData.address.firstName} ${previousData.address.lastName || ''}`.trim() : "Valued Customer");
        const totalAmount = data.total || data.amount || previousData.total || previousData.price || previousData.totalPrice || 0;
        const orderLocation = (previousData.isOffline || previousData.walkIn)
          ? (previousData.address || "Counter Walk-in")
          : (previousData.office || (typeof previousData.address === "string" ? previousData.address : (previousData.address?.address1 || previousData.address?.city || "Desk Delivery")));
        const orderItems = data.item || previousData.item || (Array.isArray(previousData.items) ? previousData.items.map(it => `${it.name || it.item} x${it.quantity || it.qty || 1}`).join(", ") : "");

        fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone,
            orderId: previousData.orderId || id,
            status: "Delivered",
            customerName: customerName,
            totalAmount: totalAmount,
            items: orderItems,
            itemsList: previousData.items || [],
            location: orderLocation,
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          })
        }).catch(err => console.error("Delivered WhatsApp notification error:", err));
      }
    } catch (e) {
      console.error("Failed to trigger Delivered WhatsApp message:", e);
    }
  }
}

// Real-time listener for orders (admin & brewmaster dashboard)
export function onOrdersSnapshot(callback) {
  return onSnapshot(collection(db, "orders"), (snap) => {
    const items = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.status !== "Failed" && data.paymentStatus !== "Failed") {
        items.push({ ...data, id: d.id, orderId: data.orderId || d.id });
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

export function onStockSnapshot(callback) {
  return onSnapshot(collection(db, "stock"), (snap) => {
    const items = [];
    snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
    callback(items);
  });
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


// WhatsApp API Config
export const DEFAULT_WHATSAPP_CONFIG = {
  baseUrl: 'https://whatsappapi-1n7u.onrender.com',
  instance: 'user_3k6gybzrauwohmso',
  apiKey: '429683C4C977415CAAFCCE10F7D57E11',
  senderNumber: '+919667623123',
  isEnabled: true,
  mode: 'evolution',
  apiUrl: 'https://whatsappapi-1n7u.onrender.com/message/sendText/user_3k6gybzrauwohmso'
};

export function sanitizeApiKey(key) {
  if (!key) return DEFAULT_WHATSAPP_CONFIG.apiKey;
  let cleaned = String(key).trim();
  if (cleaned.toLowerCase().startsWith('wapi_live_')) {
    cleaned = cleaned.substring('wapi_live_'.length);
  }
  return cleaned.toUpperCase();
}

export async function getWhatsAppConfig() {
  try {
    const d = await getDoc(doc(db, 'settings', 'whatsapp'));
    if (d.exists()) {
      const data = d.data();
      return { 
        ...DEFAULT_WHATSAPP_CONFIG, 
        ...data,
        apiKey: sanitizeApiKey(data.apiKey || DEFAULT_WHATSAPP_CONFIG.apiKey)
      };
    }
    return DEFAULT_WHATSAPP_CONFIG;
  } catch (err) {
    console.error('Error fetching whatsapp config:', err);
    return DEFAULT_WHATSAPP_CONFIG;
  }
}

export async function updateWhatsAppConfig(data) {
  try {
    const cleanData = {
      ...data,
      apiKey: sanitizeApiKey(data.apiKey || DEFAULT_WHATSAPP_CONFIG.apiKey)
    };
    await setDoc(doc(db, 'settings', 'whatsapp'), cleanData, { merge: true });
    return true;
  } catch (err) {
    console.error('Error updating whatsapp config:', err);
    return false;
  }
}

export async function sendWhatsAppMessage(number, text) {
  try {
    const config = await getWhatsAppConfig();
    if (!config || !config.isEnabled) return;
    
    let formattedNumber = String(number).replace(/\D/g, '');
    if (formattedNumber.length === 10) formattedNumber = '91' + formattedNumber;
    formattedNumber = '+' + formattedNumber;

    const targetUrl = config.baseUrl && config.instance 
      ? `${config.baseUrl.replace(/\/+$/, '')}/message/sendText/${encodeURIComponent(config.instance)}`
      : (config.apiUrl || `${DEFAULT_WHATSAPP_CONFIG.baseUrl}/message/sendText/${DEFAULT_WHATSAPP_CONFIG.instance}`);

    const activeKey = sanitizeApiKey(config.apiKey || DEFAULT_WHATSAPP_CONFIG.apiKey);

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': activeKey
      },
      body: JSON.stringify({ number: formattedNumber, text })
    });
    
    const jsonRes = await res.json().catch(() => null);
    console.log("WhatsApp API response:", jsonRes);
    return jsonRes;
  } catch (err) {
    console.error("Error sending WhatsApp message:", err);
  }
}


