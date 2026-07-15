"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { loginWithEmail, signInWithGoogle } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push(redirect);
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
      {/* Background blobs */}
      <div style={styles.blobTop} />
      <div style={styles.blobBottom} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <span style={styles.logoIcon}>☕</span>
          <span style={styles.logoText}>Chai Chuska</span>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to order your perfect chai</p>

        {/* Google Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{ ...styles.googleBtn, opacity: googleLoading ? 0.7 : 1 }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.7-6.7C35.8 2.5 30.2 0 24 0 14.7 0 6.8 5.4 2.9 13.2l7.8 6C12.5 13.1 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.2-.4-4.6H24v8.7h12.4c-.5 2.8-2.1 5.1-4.4 6.7l6.9 5.4C43.1 36.9 46.1 31.2 46.1 24.6z"/>
            <path fill="#FBBC05" d="M10.7 28.4A14.5 14.5 0 0 1 9.5 24c0-1.5.3-3 .7-4.4l-7.8-6A24 24 0 0 0 0 24c0 3.8.9 7.4 2.5 10.6l8.2-6.2z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-6.9-5.4c-2 1.3-4.6 2.1-8.3 2.1-6.2 0-11.5-4.2-13.3-9.8l-8.2 6.2C6.8 42.6 14.7 48 24 48z"/>
          </svg>
          {googleLoading ? "Signing in..." : "Continue with Google"}
        </button>

        {/* Divider */}
        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>or continue with email</span>
          <span style={styles.dividerLine} />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailLogin} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email address</label>
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
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <p style={styles.switchText}>
          Don&apos;t have an account?{" "}
          <Link href={`/signup${redirect !== "/" ? `?redirect=${redirect}` : ""}`} style={styles.link}>
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

function getErrorMessage(code) {
  switch (code) {
    case "auth/user-not-found": return "No account found with this email.";
    case "auth/wrong-password": return "Incorrect password. Please try again.";
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/too-many-requests": return "Too many attempts. Please try again later.";
    case "auth/popup-closed-by-user": return "Google sign-in was cancelled.";
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
    padding: "48px 40px",
    width: "100%",
    maxWidth: "440px",
    boxShadow: "0 32px 80px rgba(0,0,0,0.4)",
    position: "relative",
    zIndex: 1,
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "28px",
  },
  logoIcon: {
    fontSize: "28px",
  },
  logoText: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#2c1b0d",
    letterSpacing: "-0.5px",
  },
  title: {
    fontSize: "26px",
    fontWeight: "800",
    color: "#1a0a00",
    margin: "0 0 6px",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#777",
    margin: "0 0 28px",
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
    transition: "all 0.2s ease",
    fontFamily: "inherit",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "24px 0",
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
    gap: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#444",
  },
  input: {
    padding: "13px 16px",
    border: "2px solid #e8e0d8",
    borderRadius: "12px",
    fontSize: "15px",
    color: "#2c1b0d",
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.2s",
    background: "#faf8f5",
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
    marginTop: "4px",
    letterSpacing: "0.3px",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 20px rgba(140,60,0,0.35)",
  },
  switchText: {
    textAlign: "center",
    fontSize: "13.5px",
    color: "#777",
    marginTop: "24px",
  },
  link: {
    color: "#8a3a00",
    fontWeight: "700",
    textDecoration: "none",
  },
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
