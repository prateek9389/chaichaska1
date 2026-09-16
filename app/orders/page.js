"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db, updateOrder, getOrderById } from "@/lib/firestore";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cartItems, addToCart } = useCart();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("all"); // "all" | "active" | "delivered" | "cancelled"
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  // Real-time clock for countdown timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Firestore orders + Guest orders
  useEffect(() => {
    let unsubOrders = () => {};

    const loadGuestOrders = async () => {
      try {
        const guestOrders = JSON.parse(localStorage.getItem("guest_orders") || "[]");
        const now = Date.now();
        const validGuestOrders = guestOrders.filter(
          (o) => now - o.timestamp < 2 * 60 * 60 * 1000 // 2 hours validity
        );

        localStorage.setItem("guest_orders", JSON.stringify(validGuestOrders));

        if (validGuestOrders.length > 0) {
          const fetchedOrders = await Promise.all(
            validGuestOrders.map((o) => getOrderById(o.id))
          );
          const validFetched = fetchedOrders.filter(
            (o) => o && o.status !== "Pending Payment" && o.status !== "Failed"
          );

          setOrders((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOrders = validFetched.filter((o) => !existingIds.has(o.id));
            return [...prev, ...newOrders].sort(
              (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
            );
          });
        }
      } catch (e) {
        console.error("Failed to load guest orders", e);
      }
    };

    if (!authLoading && user) {
      unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
        const o = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.status !== "Pending Payment" && data.status !== "Failed") {
            o.push({ ...data, id: d.id });
          }
        });
        const myOrders = o
          .filter((ord) => ord.userId === user.uid)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOrders(myOrders);
        loadGuestOrders();
      });
      setLoading(false);
    } else if (!authLoading && !user) {
      loadGuestOrders();
      setLoading(false);
    }

    return () => {
      unsubOrders();
    };
  }, [user, authLoading]);

  // Copy order ID helper
  const handleCopyOrderId = (e, orderId) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(orderId);
      setCopiedId(orderId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Filter orders by tab and search
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const status = (ord.status || "Received").toLowerCase();
      const isCancelled = status.includes("cancel") || status.includes("refund");
      const isDelivered = status === "delivered";
      const isActive = !isCancelled && !isDelivered;

      if (activeTab === "active" && !isActive) return false;
      if (activeTab === "delivered" && !isDelivered) return false;
      if (activeTab === "cancelled" && !isCancelled) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (ord.id || "").toLowerCase().includes(q);
        const matchItem = (ord.item || "").toLowerCase().includes(q);
        const matchCust = (ord.customer || ord.name || "").toLowerCase().includes(q);
        if (!matchId && !matchItem && !matchCust) return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    let active = 0;
    let delivered = 0;
    let cancelled = 0;

    orders.forEach((ord) => {
      const status = (ord.status || "Received").toLowerCase();
      if (status.includes("cancel") || status.includes("refund")) cancelled++;
      else if (status === "delivered") delivered++;
      else active++;
    });

    return { all: orders.length, active, delivered, cancelled };
  }, [orders]);

  // Re-order handler
  const handleReorder = (e, ord) => {
    e.stopPropagation();
    addToCart({
      id: ord.productId || `reorder-${ord.id}`,
      name: ord.item || "Chai Chaska Special",
      price: ord.total || "₹100",
      basePrice: parseInt(String(ord.total).replace(/[^0-9]/g, "")) || 100,
      image: ord.image || ord.img || "/logo.png",
      quantity: 1,
      sugar: ord.sugar || "Regular",
      milk: ord.milk || "Standard",
    });
    router.push("/cart");
  };

  return (
    <div className="orders-page-shell">
      <Navbar />

      {/* Main Content Area */}
      <main className="orders-main-wrap">
        <div className="orders-container">
          
          {/* Top Breadcrumb & Status Pill */}
          <div className="orders-top-meta">
            <div className="live-status-chip">
              <span className="live-pulse-dot" />
              <span>LIVE BREW LOGS</span>
            </div>
            <span className="meta-time-text">Updated moments ago</span>
          </div>

          {/* Heading Section */}
          <header className="orders-header-card">
            <h1 className="orders-main-title">
              Order History & <span className="title-accent">Live Status</span>
            </h1>
            <p className="orders-sub-text">
              Track active estate brews arriving at your desk, review previous orders, or reorder your favorite signature cup.
            </p>

            {/* Filter Tabs & Search Row */}
            <div className="orders-controls-bar">
              <div className="orders-tabs-list">
                <button
                  className={`tab-chip ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  <span>All Orders</span>
                  <span className="tab-badge">{tabCounts.all}</span>
                </button>

                <button
                  className={`tab-chip ${activeTab === "active" ? "active" : ""}`}
                  onClick={() => setActiveTab("active")}
                >
                  <span className="tab-dot active" />
                  <span>Brewing / Active</span>
                  <span className="tab-badge">{tabCounts.active}</span>
                </button>

                <button
                  className={`tab-chip ${activeTab === "delivered" ? "active" : ""}`}
                  onClick={() => setActiveTab("delivered")}
                >
                  <span>Delivered</span>
                  <span className="tab-badge">{tabCounts.delivered}</span>
                </button>

                <button
                  className={`tab-chip ${activeTab === "cancelled" ? "active" : ""}`}
                  onClick={() => setActiveTab("cancelled")}
                >
                  <span>Cancelled</span>
                  <span className="tab-badge">{tabCounts.cancelled}</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="orders-search-input-wrap">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search by Order ID or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="orders-search-field"
                />
                {searchQuery && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearchQuery("")}
                    title="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Orders Content Section */}
          {loading ? (
            <div className="orders-loading-state">
              <div className="loading-spinner-ring" />
              <h3>Loading Your Brews...</h3>
              <p>Fetching real-time updates from Chai Chaska counters.</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            /* Empty State */
            <div className="orders-empty-state">
              <div className="empty-cup-icon">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                  <line x1="6" y1="1" x2="6" y2="4"></line>
                  <line x1="10" y1="1" x2="10" y2="4"></line>
                  <line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
              </div>
              <h2 className="empty-title">
                {orders.length === 0 ? "No orders placed yet" : "No orders found"}
              </h2>
              <p className="empty-desc">
                {orders.length === 0
                  ? "Explore our freshly brewed artisanal chais and chilled coolers to place your first order."
                  : "No orders match your selected filter or search query. Try clearing your filters."}
              </p>
              <Link href="/shop" className="explore-menu-cta-btn">
                <span>Explore Menu & Order Now</span>
                <span className="btn-arrow">→</span>
              </Link>
            </div>
          ) : (
            /* Orders Grid */
            <div className="orders-cards-grid">
              <AnimatePresence>
                {filteredOrders.map((ord, idx) => {
                  const status = ord.status || "Received";
                  const isCancelled =
                    status === "Cancelled" ||
                    status === "Cancelled by User" ||
                    status === "Refunded";
                  const isDelivered = status === "Delivered";
                  const isActive = !isCancelled && !isDelivered;

                  // Stepper logic
                  const isReceived = true;
                  const isPreparing = [
                    "Pending",
                    "Preparing",
                    "Shipped",
                    "Out for Delivery",
                    "Delivered",
                  ].includes(status);
                  const isOutForDelivery = [
                    "Shipped",
                    "Out for Delivery",
                    "Delivered",
                  ].includes(status);

                  // Cancel window (60s)
                  const canCancel =
                    (!ord.status || ["Received", "Pending"].includes(ord.status)) &&
                    ord.createdAt &&
                    currentTime - ord.createdAt <= 60000;
                  const cancelSecondsLeft = canCancel
                    ? Math.max(0, Math.ceil((60000 - (currentTime - ord.createdAt)) / 1000))
                    : 0;

                  // Estimated time remaining
                  const targetDuration = ord.allocatedTime
                    ? parseInt(ord.allocatedTime) * 60 * 1000
                    : 20 * 60 * 1000;
                  const targetTime = (ord.createdAt || Date.now()) + targetDuration;
                  const remainingMs = targetTime - currentTime;

                  let remainingText = "Arriving Soon";
                  if (remainingMs > 0) {
                    const m = Math.floor(remainingMs / 60000);
                    const s = Math.floor((remainingMs % 60000) / 1000);
                    remainingText = `${m.toString().padStart(2, "0")}:${s
                      .toString()
                      .padStart(2, "0")} min`;
                  }

                  const formattedDate = ord.createdAt
                    ? new Date(ord.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ord.date || "Just now";

                  return (
                    <motion.article
                      key={ord.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.35, delay: idx * 0.05 }}
                      className={`order-card-box ${isActive ? "active-order" : ""}`}
                    >
                      {/* Card Header: Order ID, Date, and Status Badge */}
                      <div className="order-card-header">
                        <div className="order-id-group">
                          <button
                            className="order-id-pill"
                            onClick={(e) => handleCopyOrderId(e, ord.id)}
                            title="Click to copy Order ID"
                          >
                            <span className="hash-sym">#</span>
                            <span className="id-text">{ord.id}</span>
                            <span className="copy-icon">
                              {copiedId === ord.id ? "✓" : "📋"}
                            </span>
                          </button>
                          <span className="order-date-label">{formattedDate}</span>
                        </div>

                        {/* Status Badge */}
                        <div
                          className={`order-status-badge ${
                            isCancelled
                              ? "status-cancelled"
                              : isDelivered
                              ? "status-delivered"
                              : "status-active"
                          }`}
                        >
                          {isActive && <span className="status-badge-pulse" />}
                          {isDelivered && <span className="status-check">✓</span>}
                          <span>{status}</span>
                        </div>
                      </div>

                      {/* Live Stepper Tracker (Only for Active Orders) */}
                      {isActive && (
                        <div className="order-live-stepper-box">
                          <div className="stepper-header-row">
                            <span className="stepper-title">Live Brewing & Delivery</span>
                            <span className="stepper-timer-badge">
                              ⏳ Est. {remainingText}
                            </span>
                          </div>

                          <div className="stepper-track-bar">
                            <div className="stepper-node completed">
                              <span className="node-icon">✓</span>
                              <span className="node-label">Confirmed</span>
                            </div>

                            <div
                              className={`stepper-connector ${
                                isPreparing ? "completed" : "pending"
                              }`}
                            />

                            <div
                              className={`stepper-node ${
                                isPreparing ? "completed" : "pending"
                              }`}
                            >
                              <span className="node-icon">
                                {isPreparing ? "✓" : "2"}
                              </span>
                              <span className="node-label">Brewing</span>
                            </div>

                            <div
                              className={`stepper-connector ${
                                isOutForDelivery ? "completed" : "pending"
                              }`}
                            />

                            <div
                              className={`stepper-node ${
                                isOutForDelivery ? "completed" : "pending"
                              }`}
                            >
                              <span className="node-icon">
                                {isOutForDelivery ? "✓" : "3"}
                              </span>
                              <span className="node-label">On the Way</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Card Body: Product Item & Image */}
                      <div className="order-card-body">
                        <div className="order-thumb-wrap">
                          <img
                            src={
                              ord.image ||
                              ord.img ||
                              "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80"
                            }
                            alt={ord.item || "Order item"}
                            className="order-thumb-img"
                            loading="lazy"
                          />
                        </div>

                        <div className="order-details-col">
                          <h3 className="order-item-title">
                            {ord.item || "Artisanal Chai Blend"}
                          </h3>

                          <div className="order-tags-row">
                            {ord.milk && (
                              <span className="order-spec-tag">
                                🥛 {ord.milk}
                              </span>
                            )}
                            {ord.sugar && (
                              <span className="order-spec-tag">
                                🍯 {ord.sugar} Sugar
                              </span>
                            )}
                            {ord.addons && ord.addons !== "None" && (
                              <span className="order-spec-tag">
                                ✦ {ord.addons}
                              </span>
                            )}
                          </div>

                          {/* Customer & Address Details */}
                          <div className="order-address-snippet">
                            <span className="address-pin-icon">📍</span>
                            <span className="address-snippet-text">
                              {ord.office || ord.address || "Standard Desk Delivery"}
                              {ord.customer ? ` • For ${ord.customer}` : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Price & Action Buttons */}
                      <div className="order-card-footer">
                        <div className="order-price-box">
                          <span className="price-sub-label">Total Amount</span>
                          <span className="order-price-val">
                            {ord.total?.startsWith?.("₹") ? ord.total : `₹${ord.total || 0}`}
                          </span>
                        </div>

                        <div className="order-actions-group">
                          {/* Cancel button if placed within 60 seconds */}
                          {canCancel && (
                            <button
                              className="action-btn-cancel"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Are you sure you want to cancel this order? Your funds will be refunded immediately."
                                  )
                                ) {
                                  updateOrder(ord.id, {
                                    status: "Cancelled by User",
                                  });
                                }
                              }}
                            >
                              Cancel ({cancelSecondsLeft}s)
                            </button>
                          )}

                          {/* Primary View Invoice & Tracking Button */}
                          <Link
                            href={`/orders/${ord.id}`}
                            className="action-btn-primary"
                          >
                            <span>Tracking & Invoice</span>
                            <span className="arrow">→</span>
                          </Link>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Shop, Orders, Checkout, Get App) */}
      <nav className="mobile-bottom-nav">
        {/* 1. Shop */}
        <Link href="/shop" className="bottom-nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span className="bottom-nav-label">Shop</span>
        </Link>

        {/* 2. Orders (ACTIVE) */}
        <Link href="/orders" className="bottom-nav-item active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span className="bottom-nav-label">Orders</span>
        </Link>

        {/* 3. Checkout */}
        <Link href="/cart" className="bottom-nav-item checkout-btn-item">
          <div className="bottom-nav-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            {cartItems && cartItems.length > 0 && (
              <span className="bottom-nav-badge">
                {cartItems.reduce((sum, i) => sum + (i.quantity || 1), 0)}
              </span>
            )}
          </div>
          <span className="bottom-nav-label">Checkout</span>
        </Link>

        {/* 4. Get App */}
        <button
          className="bottom-nav-item get-app-btn-item"
          onClick={handleInstallApp}
          title="Install Chai Chaska on Home Screen"
        >
          <div className="get-app-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <span className="get-app-sparkle">✦</span>
          </div>
          <span className="bottom-nav-label">Get App</span>
        </button>
      </nav>

      {/* PWA Install Guide Modal */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="install-modal-backdrop" onClick={() => setShowInstallModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="install-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="install-modal-logo-box">
                <img src="/logo.png" alt="Chai Chaska Logo" className="install-modal-logo" />
              </div>

              <h3 className="install-modal-title">Install Chai Chaska App</h3>
              <p className="install-modal-desc">
                Add Chai Chaska directly to your mobile home screen with instant order tracking and zero storage overhead.
              </p>

              <div className="install-steps-box">
                <div className="install-step-row">
                  <div className="step-num">1</div>
                  <div className="step-text">
                    <strong>Chrome / Android:</strong> Tap the three dots (⋮) menu at top-right and choose <em>"Add to Home screen"</em>.
                  </div>
                </div>

                <div className="install-step-row">
                  <div className="step-num">2</div>
                  <div className="step-text">
                    <strong>Safari / iOS:</strong> Tap the Share button (⎋) at the bottom and choose <em>"Add to Home Screen"</em>.
                  </div>
                </div>
              </div>

              <button
                className="install-modal-close-btn"
                onClick={() => setShowInstallModal(false)}
              >
                Got It, Thanks!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded Modern White Theme Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .orders-page-shell {
          background: #ffffff;
          min-height: 100vh;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          position: relative;
        }

        .orders-main-wrap {
          padding: 36px 20px 80px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .orders-container {
          width: 100%;
        }

        /* Top Meta */
        .orders-top-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .live-status-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #475569;
        }

        .live-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
          animation: pulseGreen 1.8s infinite;
        }

        @keyframes pulseGreen {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }

        .meta-time-text {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }

        /* Header Card */
        .orders-header-card {
          margin-bottom: 32px;
        }

        .orders-main-title {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #0f172a;
          margin: 0 0 10px;
        }

        .title-accent {
          background: linear-gradient(135deg, #0f172a 30%, #64748b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .orders-sub-text {
          font-size: clamp(14.5px, 1.8vw, 16px);
          color: #64748b;
          line-height: 1.55;
          max-width: 680px;
          margin: 0 0 24px;
        }

        /* Controls Bar: Tabs & Search */
        .orders-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          padding-bottom: 4px;
          border-bottom: 1px solid #f1f5f9;
        }

        .orders-tabs-list {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding: 4px 0;
        }

        .orders-tabs-list::-webkit-scrollbar {
          display: none;
        }

        .tab-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .tab-chip:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .tab-chip.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }

        .tab-badge {
          font-size: 11px;
          background: rgba(0, 0, 0, 0.06);
          padding: 1px 7px;
          border-radius: 9999px;
        }

        .tab-chip.active .tab-badge {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .tab-dot.active {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
        }

        /* Search input */
        .orders-search-input-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 8px 14px;
          width: 100%;
          max-width: 280px;
          box-sizing: border-box;
          color: #64748b;
          transition: all 0.2s;
        }

        .orders-search-input-wrap:focus-within {
          border-color: #0f172a;
          background: #ffffff;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
          color: #0f172a;
        }

        .orders-search-field {
          border: none;
          outline: none;
          background: transparent;
          font-size: 13px;
          color: #0f172a;
          width: 100%;
          font-weight: 500;
        }

        .clear-search-btn {
          border: none;
          background: #e2e8f0;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #475569;
          cursor: pointer;
        }

        /* Cards Grid */
        .orders-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 22px;
          margin-top: 24px;
        }

        /* Order Card Box */
        .order-card-box {
          background: #ffffff;
          border: 1.5px solid #f1f5f9;
          border-radius: 24px;
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 8px 25px -4px rgba(15, 23, 42, 0.03);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .order-card-box:hover {
          border-color: #e2e8f0;
          box-shadow: 0 16px 36px -6px rgba(15, 23, 42, 0.08);
          transform: translateY(-3px);
        }

        .order-card-box.active-order {
          border-color: #e2e8f0;
          background: #ffffff;
        }

        .order-card-box.active-order::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3.5px;
          background: linear-gradient(90deg, #10b981, #06b6d4, #6366f1);
        }

        /* Header of Card */
        .order-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .order-id-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .order-id-pill {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 750;
          color: #0f172a;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s;
        }

        .order-id-pill:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .hash-sym {
          color: #94a3b8;
        }

        .copy-icon {
          font-size: 10px;
          color: #64748b;
        }

        .order-date-label {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }

        /* Status Badge */
        .order-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .order-status-badge.status-active {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-badge-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
          animation: pulseGreen 1.5s infinite;
        }

        .order-status-badge.status-delivered {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #e2e8f0;
        }

        .status-check {
          font-size: 11px;
          font-weight: 900;
        }

        .order-status-badge.status-cancelled {
          background: rgba(239, 68, 68, 0.08);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        /* Live Stepper Tracker */
        .order-live-stepper-box {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stepper-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stepper-title {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .stepper-timer-badge {
          font-size: 12px;
          font-weight: 800;
          color: #d97706;
          background: #fef3c7;
          padding: 3px 9px;
          border-radius: 9999px;
        }

        .stepper-track-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }

        .stepper-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          position: relative;
          z-index: 2;
        }

        .node-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          transition: all 0.2s;
        }

        .stepper-node.completed .node-icon {
          background: #0f172a;
          color: #ffffff;
        }

        .stepper-node.pending .node-icon {
          background: #e2e8f0;
          color: #94a3b8;
        }

        .node-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #475569;
          white-space: nowrap;
        }

        .stepper-connector {
          flex: 1;
          height: 3px;
          margin: -16px 8px 0;
          border-radius: 9999px;
          background: #e2e8f0;
          position: relative;
          z-index: 1;
        }

        .stepper-connector.completed {
          background: #0f172a;
        }

        /* Card Body */
        .order-card-body {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .order-thumb-wrap {
          width: 76px;
          height: 76px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .order-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .order-details-col {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .order-item-title {
          font-size: 15.5px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .order-tags-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .order-spec-tag {
          font-size: 11px;
          background: #f1f5f9;
          color: #475569;
          padding: 2px 8px;
          border-radius: 9999px;
          font-weight: 600;
        }

        .order-address-snippet {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .address-pin-icon {
          font-size: 12px;
          flex-shrink: 0;
        }

        .address-snippet-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Card Footer */
        .order-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          border-top: 1px solid #f8fafc;
          gap: 12px;
          flex-wrap: wrap;
        }

        .order-price-box {
          display: flex;
          flex-direction: column;
        }

        .price-sub-label {
          font-size: 10.5px;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
        }

        .order-price-val {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .order-actions-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .action-btn-cancel {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 9999px;
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: background 0.2s;
        }

        .action-btn-cancel:hover {
          background: #fca5a5;
        }

        .action-btn-reorder {
          background: #f8fafc;
          color: #334155;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn-reorder:hover {
          background: #f1f5f9;
          color: #0f172a;
          border-color: #cbd5e1;
        }

        .action-btn-primary {
          background: #0f172a;
          color: #ffffff;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 750;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
        }

        .action-btn-primary:hover {
          background: #1e293b;
          transform: translateX(2px);
        }

        .arrow {
          transition: transform 0.2s;
        }

        .action-btn-primary:hover .arrow {
          transform: translateX(3px);
        }

        /* Empty State */
        .orders-empty-state {
          background: #ffffff;
          border: 1.5px solid #f1f5f9;
          border-radius: 28px;
          padding: 56px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 8px 30px -4px rgba(15, 23, 42, 0.03);
          margin-top: 24px;
        }

        .empty-cup-icon {
          width: 72px;
          height: 72px;
          border-radius: 24px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .empty-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .empty-desc {
          font-size: 14.5px;
          color: #64748b;
          max-width: 440px;
          margin: 0 0 24px;
          line-height: 1.5;
        }

        .explore-menu-cta-btn {
          background: #0f172a;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          box-shadow: 0 6px 20px rgba(15, 23, 42, 0.15);
        }

        .explore-menu-cta-btn:hover {
          background: #1e293b;
          transform: translateY(-2px);
        }

        /* Loading State */
        .orders-loading-state {
          padding: 60px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .loading-spinner-ring {
          width: 36px;
          height: 36px;
          border: 3px solid #e2e8f0;
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: spinLoad 0.8s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spinLoad {
          to { transform: rotate(360deg); }
        }

        /* Mobile Bottom Nav Bar */
        .mobile-bottom-nav {
          display: none;
        }

        /* Responsive Breakpoints */
        @media (max-width: 860px) {
          .orders-cards-grid {
            grid-template-columns: 1fr;
          }

          .orders-controls-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .orders-search-input-wrap {
            max-width: 100%;
          }
        }

        @media (max-width: 768px) {
          .orders-main-wrap {
            padding: 20px 14px 100px;
          }

          .order-card-box {
            padding: 18px 16px;
            border-radius: 20px;
          }

          .order-thumb-wrap {
            width: 66px;
            height: 66px;
            border-radius: 14px;
          }

          .order-item-title {
            font-size: 14.5px;
          }

          .order-card-footer {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .order-actions-group {
            width: 100%;
          }

          .action-btn-primary {
            flex: 1;
            justify-content: center;
          }

          .action-btn-reorder {
            flex-shrink: 0;
          }

          /* Show Mobile Bottom Bar */
          .mobile-bottom-nav {
            display: flex !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 62px !important;
            background: rgba(255, 255, 255, 0.96) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border-top: 1px solid #f1f5f9 !important;
            z-index: 10000 !important;
            justify-content: space-around !important;
            align-items: center !important;
            padding: 0 10px !important;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.04) !important;
          }

          .bottom-nav-item {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 3px !important;
            color: #94a3b8 !important;
            text-decoration: none !important;
            background: transparent !important;
            border: none !important;
            cursor: pointer !important;
            padding: 6px 12px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            transition: all 0.2s ease !important;
            position: relative !important;
            -webkit-tap-highlight-color: transparent !important;
          }

          .bottom-nav-item.active {
            color: #0f172a !important;
            font-weight: 800 !important;
          }

          .bottom-nav-label {
            font-size: 10.5px !important;
            line-height: 1 !important;
          }

          .bottom-nav-icon-box {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .bottom-nav-badge {
            position: absolute;
            top: -5px;
            right: -8px;
            background: #0f172a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            min-width: 16px;
            height: 16px;
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 3px;
            border: 1.5px solid #ffffff;
          }

          .get-app-icon-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .get-app-sparkle {
            position: absolute;
            top: -6px;
            right: -8px;
            font-size: 11px;
            color: #f59e0b;
          }
        }

        /* PWA Install Modal */
        .install-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 20000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .install-modal-card {
          background: #ffffff;
          border-radius: 28px;
          max-width: 400px;
          width: 100%;
          padding: 28px 24px;
          text-align: center;
          box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.3);
          border: 1px solid #f1f5f9;
        }

        .install-modal-logo-box {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          margin: 0 auto 16px;
          overflow: hidden;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .install-modal-logo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .install-modal-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .install-modal-desc {
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 20px;
        }

        .install-steps-box {
          background: #f8fafc;
          border-radius: 18px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 22px;
          text-align: left;
          border: 1px solid #f1f5f9;
        }

        .install-step-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 12.5px;
          color: #334155;
          line-height: 1.45;
        }

        .step-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #0f172a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .install-modal-close-btn {
          width: 100%;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          padding: 12px;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
          transition: background 0.2s;
        }

        .install-modal-close-btn:hover {
          background: #334155;
        }
      ` }} />
    </div>
  );
}
