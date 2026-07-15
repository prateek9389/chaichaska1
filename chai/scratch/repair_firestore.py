import sys

with open('lib/firestore.js', 'r', encoding='utf-8') as f:
    code = f.read()

# truncate after updateContactInfo
idx = code.find('export async function updateContactInfo(data) {')
if idx != -1:
    idx2 = code.find('}', idx)
    code = code[:idx2+1] + '\n\n'

feedback_code = """
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
"""

with open('lib/firestore.js', 'w', encoding='utf-8') as f:
    f.write(code + feedback_code)

print("Firestore fixed!")
