"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, profile } = useAuth();
  const { cartItems } = useCart();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    setUserMenuOpen(false);
    router.push("/");
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = ["Home", "Shop", "Orders", "Contact"];

  const getLinkTarget = (item) => {
    if (item === "Home") return "/";
    if (item === "Shop") return "/shop";
    if (item === "Orders") return "/orders";
    return `/#${item.toLowerCase().replace(/\s+/g, "-")}`;
  };

  return (
    <>
      <header
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: scrolled ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
        transition: "all 0.4s ease",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 90,
          padding: "0 20px",
          maxWidth: "1180px",
          margin: "0 auto",
        }}
        className="nav-container"
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <img src="/logo.png" alt="Chai Chaska Logo" style={{ height: "75px", objectFit: "contain", mixBlendMode: "multiply" }} />
        </Link>

        <ul
          className="nav-links"
          style={{
            display: "flex",
            gap: 24,
            listStyle: "none",
            fontSize: 14,
            fontWeight: 600,
            color: "#2c1b0d",
            padding: 0,
            margin: 0,
          }}
        >
          {links.map((l) => (
            <li key={l}>
              <Link
                href={getLinkTarget(l)}
                style={{
                  opacity: 0.85,
                  transition: "opacity 0.2s",
                  textDecoration: "none",
                  color: "inherit",
                }}
                onMouseEnter={(e) => (e.target.style.opacity = 1)}
                onMouseLeave={(e) => (e.target.style.opacity = 0.85)}
              >
                {l}
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Animated Gold Coins Wallet Link */}
          <Link
            href="/wallet"
            className="navbar-wallet-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#ffffff",
              border: "1.5px solid rgba(220, 160, 40, 0.4)",
              padding: "8px 14px",
              borderRadius: "999px",
              fontSize: "13.5px",
              fontWeight: 800,
              color: "#d35400",
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(0,0,0,0.02)",
              transition: "transform 0.2s, background 0.2s",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.04)";
              e.currentTarget.style.background = "#fffbf0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.background = "#ffffff";
            }}
            title="View Coin Wallet & Balance"
          >
            <span className="gold-coin-3d" />
            <span>{user ? (profile?.coins || 0) : 0} Coins</span>
          </Link>

          {/* Cart Button */}
          <Link
            href="/cart"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#2c1b0d",
              color: "#ffffff",
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              textDecoration: "none",
              transition: "transform 0.2s ease, opacity 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            title="View Cart"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartItems && cartItems.length > 0 && (
              <span style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#e74c3c",
                color: "#fff",
                fontSize: "11px",
                fontWeight: 800,
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                border: "2px solid #fff",
              }}>
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </Link>

          {/* Auth Button */}
          {user ? (
            <div className="user-auth-btn" style={{ position: "relative" }}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#f5f0e8",
                  border: "1.5px solid rgba(44,27,13,0.15)",
                  padding: "7px 14px 7px 8px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#2c1b0d",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "linear-gradient(135deg, #8a3a00, #c05a00)",
                  color: "#fff", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "12px", fontWeight: 800,
                  flexShrink: 0,
                }}>
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </span>
              </button>
              {userMenuOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  background: "#fff", borderRadius: "14px", padding: "8px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  minWidth: "160px", zIndex: 999,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}>
                  <Link href="/orders" onClick={() => setUserMenuOpen(false)} style={{
                    display: "block", padding: "10px 14px", fontSize: "13px",
                    fontWeight: 600, color: "#2c1b0d", textDecoration: "none",
                    borderRadius: "8px",
                  }}>📦 My Orders</Link>
                  <button onClick={handleSignOut} style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 14px", fontSize: "13px", fontWeight: 600,
                    color: "#e74c3c", background: "none", border: "none",
                    cursor: "pointer", borderRadius: "8px", fontFamily: "inherit",
                  }}>🚪 Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="user-auth-btn"
              style={{
                background: "#f5f0e8",
                border: "1.5px solid rgba(44,27,13,0.15)",
                padding: "9px 18px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#2c1b0d",
                textDecoration: "none",
                transition: "background 0.2s",
              }}
            >
              Sign In
            </Link>
          )}
          
          <button
            aria-label="Menu"
            onClick={() => setOpen(!open)}
            className="burger"
            style={{
              display: "none",
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg width="22" height="16" viewBox="0 0 22 16">
              <rect width="22" height="2" fill="#2c1b0d" />
              <rect y="7" width="22" height="2" fill="#2c1b0d" />
              <rect y="14" width="22" height="2" fill="#2c1b0d" />
            </svg>
          </button>
        </div>
      </nav>
      </header>

      {/* Mobile Navigation Drawer Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 90,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Mobile Navigation Drawer Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "85%",
          maxWidth: "340px",
          background: "#ffffff",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          padding: "30px 24px",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <img src="/logo.png" alt="Chai Chaska Logo" style={{ height: "65px", objectFit: "contain", mixBlendMode: "multiply" }} />
          <button
            onClick={() => setOpen(false)}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 24,
              fontWeight: "bold",
              color: "#2c1b0d",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            fontSize: "20px",
            fontWeight: "600",
            color: "#2c1b0d",
            padding: 0,
            margin: 0,
          }}
        >
          {links.map((l) => (
            <li key={l}>
              <Link
                href={getLinkTarget(l)}
                onClick={() => setOpen(false)}
                style={{ display: "block", width: "100%", textDecoration: "none", color: "inherit" }}
              >
                {l}
              </Link>
            </li>
          ))}
        </ul>
        
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Wallet for mobile drawer */}
          <Link
            href="/wallet"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: "#fffbf0",
              border: "1.5px solid rgba(220, 160, 40, 0.4)",
              padding: "14px",
              borderRadius: "999px",
              fontSize: "15px",
              fontWeight: 800,
              color: "#d35400",
              textDecoration: "none",
            }}
          >
            <span className="gold-coin-3d" />
            <span>550 Balance Coins</span>
          </Link>

          <Link
            href="/shop"
            onClick={() => setOpen(false)}
            style={{
              background: "#2c1b0d",
              color: "#ffffff",
              padding: "16px 32px",
              borderRadius: "999px",
              fontSize: 16,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            Shop Now
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ overflow: "visible" }}
            >
              <path className="steam-line steam-1" d="M8 6c0-1.5 1-1.5 1-3" />
              <path className="steam-line steam-2" d="M12 6c0-1.5 1-1.5 1-3" />
              <path className="steam-line steam-3" d="M16 6c0-1.5 1-1.5 1-3" />
              <path d="M17 9H7c0 0 0 6 5 6s5-6 5-6z" />
              <path d="M17 11h1.5a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1-1.5 1.5H17" />
              <path d="M5 18h14" />
            </svg>
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes spinCoin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .gold-coin-3d {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: radial-gradient(circle, #ffe066 0%, #f5b041 70%, #d35400 100%);
          box-shadow: inset 0 0 4px #ffffff, 0 1px 3px rgba(0,0,0,0.15);
          border: 1px solid #d35400;
          display: inline-block;
          animation: spinCoin 3s infinite linear;
        }
        @media (max-width: 860px) {
          .nav-links { display: none !important; }
          .nav-buy-btn { display: none !important; }
          .navbar-wallet-btn { display: none !important; }
          .user-auth-btn { display: none !important; }
          .burger { display: flex !important; }
        }
        @media (min-width: 861px) {
          .nav-container { padding: 0 40px !important; }
        }
      `}</style>
    </>
  );
}
