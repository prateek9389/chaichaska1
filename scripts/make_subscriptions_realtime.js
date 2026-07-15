const fs = require('fs');

// 1. ADD onSubscriptionsSnapshot to firestore.js
const fsPath = 'lib/firestore.js';
let fsContent = fs.readFileSync(fsPath, 'utf8');

const fsTarget = `export async function getSubscriptions() {`;
const fsReplacement = `export function onSubscriptionsSnapshot(callback) {
  const q = query(collection(db, "subscriptions"));
  return onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(items);
  });
}

export async function getSubscriptions() {`;

if (fsContent.includes(fsTarget) && !fsContent.includes('onSubscriptionsSnapshot')) {
  fsContent = fsContent.replace(fsTarget, fsReplacement);
  fs.writeFileSync(fsPath, fsContent);
  console.log("Added onSubscriptionsSnapshot to firestore.js");
}

// 2. UPDATE admin/page.js
const adminPath = 'app/admin/page.js';
let adminContent = fs.readFileSync(adminPath, 'utf8');

const adminImportTarget = `getSubscriptions, updateRestockRequest`;
const adminImportReplacement = `getSubscriptions, onSubscriptionsSnapshot, updateRestockRequest`;
if (adminContent.includes(adminImportTarget) && !adminContent.includes('onSubscriptionsSnapshot')) {
  adminContent = adminContent.replace(adminImportTarget, adminImportReplacement);
}

const adminEffectTarget = `getSubscriptions().then(setSubscriptions);`;
const adminEffectReplacement = `const unsubSubs = onSubscriptionsSnapshot(setSubscriptions);`;
if (adminContent.includes(adminEffectTarget)) {
  adminContent = adminContent.replace(adminEffectTarget, adminEffectReplacement);
}

const adminCleanupTarget = `unsubRestock();
    };`;
const adminCleanupReplacement = `unsubRestock();
      unsubSubs();
    };`;
if (adminContent.includes(adminCleanupTarget) && !adminContent.includes('unsubSubs()')) {
  adminContent = adminContent.replace(adminCleanupTarget, adminCleanupReplacement);
}
fs.writeFileSync(adminPath, adminContent);
console.log("Updated admin page with real-time subscriptions");

// 3. UPDATE chaimaker/page.js
const chaimakerPath = 'app/chaimaker/page.js';
let chaimakerContent = fs.readFileSync(chaimakerPath, 'utf8');

const chaimakerImportTarget = `getSubscriptions, getLeaveRequests`;
const chaimakerImportReplacement = `getSubscriptions, onSubscriptionsSnapshot, getLeaveRequests`;
if (chaimakerContent.includes(chaimakerImportTarget) && !chaimakerContent.includes('onSubscriptionsSnapshot')) {
  chaimakerContent = chaimakerContent.replace(chaimakerImportTarget, chaimakerImportReplacement);
}

const chaimakerEffectTarget = `getSubscriptions().then(setSubscriptions);`;
const chaimakerEffectReplacement = `const unsubSubs = onSubscriptionsSnapshot(setSubscriptions);`;
if (chaimakerContent.includes(chaimakerEffectTarget)) {
  chaimakerContent = chaimakerContent.replace(chaimakerEffectTarget, chaimakerEffectReplacement);
}

const chaimakerCleanupTarget = `unsubRestock();
    };`;
const chaimakerCleanupReplacement = `unsubRestock();
      unsubSubs();
    };`;
if (chaimakerContent.includes(chaimakerCleanupTarget) && !chaimakerContent.includes('unsubSubs()')) {
  chaimakerContent = chaimakerContent.replace(chaimakerCleanupTarget, chaimakerCleanupReplacement);
}
fs.writeFileSync(chaimakerPath, chaimakerContent);
console.log("Updated chaimaker page with real-time subscriptions");
