const fs = require('fs');

const fsPath = 'lib/firestore.js';
let fsContent = fs.readFileSync(fsPath, 'utf8');

const target = `export function onSubscriptionsSnapshot(callback) {
  const q = query(collection(db, "subscriptions"));
  return onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(items);
  });
}`;

const replacement = `export function onSubscriptionsSnapshot(callback) {
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
}`;

if (fsContent.includes(target)) {
  fsContent = fsContent.replace(target, replacement);
  fs.writeFileSync(fsPath, fsContent);
  console.log("Updated firestore.js");
} else {
  console.log("Could not find target in firestore.js");
}
