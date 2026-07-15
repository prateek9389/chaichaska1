const fs = require('fs');
const filepath = 'lib/firestore.js';
let content = fs.readFileSync(filepath, 'utf8');

const newFunctions = `
// ═══════════════════════════════════════════
// LEAVE REQUESTS
// ═══════════════════════════════════════════
export async function getLeaveRequests() {
  const snap = await getDocs(collection(db, "leaveRequests"));
  const items = [];
  snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
  return items;
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
`;

if (!content.includes('getLeaveRequests')) {
  fs.writeFileSync(filepath, content + '\n' + newFunctions);
  console.log('Appended backend functions to firestore.js');
} else {
  console.log('Functions already exist.');
}
