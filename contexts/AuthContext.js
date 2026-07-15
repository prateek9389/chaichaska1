"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChange, getUserProfile } from "@/lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // Firebase Auth user object
  const [profile, setProfile] = useState(null);  // Firestore user profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe;

    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Start listening to realtime profile updates
        import("@/lib/auth").then(({ onUserProfileSnapshot }) => {
          profileUnsubscribe = onUserProfileSnapshot(firebaseUser.uid, (prof) => {
            setProfile(prof);
          });
        });
      } else {
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
        setProfile(null);
      }
      setLoading(false);
    });
    return () => {
      if (profileUnsubscribe) profileUnsubscribe();
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
