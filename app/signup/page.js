"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [floor, setFloor] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail({ name, email, password, phone, floor });
      router.push(redirect);
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push(redirect);
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.blobTop} />
      <div style={styles.blobBottom} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <span style={styles.logoIcon}>☕</span>
          <span style={styles.logoText}>Chai Chuska</span>
        </div>

        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>Order fresh chai delivered right to your desk</p>

        {/* Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          style={{ ...styles.googleBtn, opacity: googleLoading ? 0.7 : 1 }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.7-6.7C35.8 2.5 30.2 0 24 0 14.7 0 6.8 5.4 2.9 13.2l7.8 6C12.5 13.1 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v8.7h12.4c-.5 2.8-2.1 5.1-4.4 6.7l6.9 5.4C43.1 36.9 46.1 31.2 46.1 24.6z"/>
            <path fill="#FBBC05" d="M10.7 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.4l-7.8-6A24 24 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.2-6.2z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-6.9-5.4c-2 1.3-4.6 2.1-8.3 2.1-6.2 0-11.5-4.2-13.3-9.8l-8.2 6.2C6.8 42.6 14.7 48 24 48z"/>
          </svg>
          {googleLoading ? "Signing up..." : "Continue with Google"}
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or sign up with email</span>
          <span style={styles.dividerLine} />
        </div>

        <form onSubmit={handleSignup} style={styles.form}>
          {/* Row: Name + Phone */}
          <div style={styles.row}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Priya Sharma"
                required
                style={styles.input}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Office / Floor (helps us deliver faster!)</label>
            <input
              type="text"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="e.g. Floor 3, Desk 12"
              style={styles.input}
            />
          </div>

          {/* Row: Password + Confirm */}
          <div style={styles.row}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                style={styles.input}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Confirm Password *</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                required
                style={styles.input}
              />
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Creating account..." : "Create Account →"}
          </button>
        </form>

        <p style={styles.switchText}>
          Already have an account?{" "}
          <Link href={`/login${redirect !== "/" ? `?redirect=${redirect}` : ""}`} style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function getErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use": return "This email is already registered. Try signing in.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/weak-password": return "Password should be at least 6 characters.";
    case "auth/popup-closed-by-user": return "Google sign-up was cancelled.";
    default: return "Something went wrong. Please try again.";
  }
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1a0a00 0%, #3d1c00 50%, #1a0a00 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', -apple-system, sans-serif",
    position: "relative",
    overflow: "hidden",
    padding: "20px",
  },
  blobTop: {
    position: "absolute",
    top: "-100px",
    right: "-100px",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(255,160,50,0.15) 0%, transparent 70%)",
    borderRadius: "50%",
    pointerEvents: "none",
  },
  blobBottom: {
    position: "absolute",
    bottom: "-100px",
    left: "-100px",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(255,90,20,0.1) 0%, transparent 70%)",
    borderRadius: "50%",
    pointerEvents: "none",
  },
  card: {
    background: "rgba(255,255,255,0.97)",
    borderRadius: "28px",
    padding: "40px 40px",
    width: "100%",
    maxWidth: "540px",
    boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
    position: "relative",
    zIndex: 1,
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "22px",
  },
  logoIcon: { fontSize: "28px" },
  logoText: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#2c1b0d",
    letterSpacing: "-0.5px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "800",
    color: "#1a0a00",
    margin: "0 0 6px",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#777",
    margin: "0 0 24px",
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px 20px",
    border: "2px solid #e8e0d8",
    borderRadius: "14px",
    background: "#fff",
    fontSize: "15px",
    fontWeight: "600",
    color: "#2c1b0d",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "20px 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "#e8e0d8",
    display: "block",
  },
  dividerText: {
    fontSize: "12px",
    color: "#aaa",
    whiteSpace: "nowrap",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#555",
  },
  input: {
    padding: "12px 14px",
    border: "2px solid #e8e0d8",
    borderRadius: "12px",
    fontSize: "14px",
    color: "#2c1b0d",
    fontFamily: "inherit",
    outline: "none",
    background: "#faf8f5",
    width: "100%",
    boxSizing: "border-box",
  },
  error: {
    fontSize: "13px",
    color: "#e74c3c",
    background: "rgba(231,76,60,0.08)",
    padding: "10px 14px",
    borderRadius: "10px",
    margin: "0",
  },
  submitBtn: {
    padding: "15px 20px",
    background: "linear-gradient(135deg, #8a3a00, #c05a00)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "0.3px",
    boxShadow: "0 4px 20px rgba(140,60,0,0.35)",
  },
  switchText: {
    textAlign: "center",
    fontSize: "13.5px",
    color: "#777",
    marginTop: "20px",
  },
  link: {
    color: "#8a3a00",
    fontWeight: "700",
    textDecoration: "none",
  },
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
