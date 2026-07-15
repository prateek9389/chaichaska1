"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";

// ─── Sign Up with Email & Password ──────────────────────────────────────────
export async function signUpWithEmail({ name, email, password, phone = "", floor = "" }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Set display name in Firebase Auth
  await updateProfile(user, { displayName: name });

  // Store extra user profile in Firestore "users" collection
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name,
    email,
    phone,
    floor,
    createdAt: serverTimestamp(),
    role: "customer",
  });

  return user;
}

// ─── Login with Email & Password ────────────────────────────────────────────
export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// ─── Sign In with Google ─────────────────────────────────────────────────────
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Run Firestore check with a timeout so it doesn't hang the login if DB is uninitialized
  try {
    await Promise.race([
      (async () => {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName || "",
            email: user.email || "",
            phone: user.phoneNumber || "",
            floor: "",
            createdAt: serverTimestamp(),
            role: "customer",
          });
        }
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), 4000))
    ]);
  } catch (err) {
    console.warn("Firestore sync skipped during Google Sign-In:", err.message);
  }

  return user;
}

// ─── Sign Out ────────────────────────────────────────────────────────────────
export async function signOut() {
  await firebaseSignOut(auth);
}

// ─── Get current user's Firestore profile ───────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// ─── Listen to auth state changes ───────────────────────────────────────────
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}
