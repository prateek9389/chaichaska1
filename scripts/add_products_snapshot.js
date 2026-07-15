const fs = require('fs');

const firestorePath = 'lib/firestore.js';
let firestoreContent = fs.readFileSync(firestorePath, 'utf8');

const target = `export async function getProducts() {`;
const replacement = `export function onProductsSnapshot(callback) {
  const q = query(collection(db, "products"));
  return onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach((d) => items.push({ ...d.data(), id: d.id }));
    items.sort((a, b) => Number(a.id) - Number(b.id));
    callback(items);
  });
}

export async function getProducts() {`;

if (firestoreContent.includes(target) && !firestoreContent.includes('onProductsSnapshot')) {
  firestoreContent = firestoreContent.replace(target, replacement);
  fs.writeFileSync(firestorePath, firestoreContent);
  console.log("Added onProductsSnapshot to firestore.js");
}
