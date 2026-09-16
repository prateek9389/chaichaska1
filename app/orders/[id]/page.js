"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { updateOrder } from "@/lib/firestore";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCart } from "@/contexts/CartContext";
import { motion, AnimatePresence } from "framer-motion";

export default function OrderDetailPage({ params }) {
  const orderId = params.id;
  const router = useRouter();
  const { cartItems } = useCart();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [copiedId, setCopiedId] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Realtime Firestore subscription
  useEffect(() => {
    if (orderId) {
      const unsub = onSnapshot(
        doc(db, "orders", orderId),
        (docSnap) => {
          if (docSnap.exists()) {
            setOrder({ id: docSnap.id, ...docSnap.data() });
          } else {
            setOrder(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error("Order snapshot error:", err);
          setLoading(false);
        }
      );
      return () => unsub();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  // Tick clock for countdown & cancel window
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // PWA Install prompt listener
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
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const handleCopyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard?.writeText?.(orderId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;
    if (
      window.confirm(
        "Are you sure you want to cancel this order? Your payment will be refunded immediately."
      )
    ) {
      setCancelling(true);
      try {
        await updateOrder(orderId, { status: "Cancelled by User" });
        setOrder((prev) => (prev ? { ...prev, status: "Cancelled by User" } : null));
      } catch (e) {
        console.error("Cancel failed:", e);
        alert("Unable to cancel right now. Please reach out to support.");
      } finally {
        setCancelling(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="order-detail-loading-screen">
        <div className="detail-loading-spinner" />
        <h2 className="loading-title">Fetching Order Details...</h2>
        <p className="loading-desc">Retrieving live estate updates and invoice record.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-page-wrapper">
        <Navbar />
        <main className="order-detail-content-wrap">
          <div className="not-found-card">
            <div className="not-found-icon-box">🔍</div>
            <h2 className="not-found-title">Order Not Found</h2>
            <p className="not-found-desc">
              The order identifier <code className="id-code">{orderId}</code> was not found or has been archived.
            </p>
            <Link href="/orders" className="return-orders-btn">
              ← View All Orders
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Status computations
  const rawStatus = (order.status || "Received").trim();
  const statusLower = rawStatus.toLowerCase();
  const isCancelled = statusLower.includes("cancel") || statusLower.includes("refund");
  const isDelivered = statusLower === "delivered";
  const isOutForDelivery = ["shipped", "out for delivery", "delivered"].includes(statusLower);
  const isPreparing = ["pending", "preparing", "shipped", "out for delivery", "delivered"].includes(statusLower);
  const isReceived = true;

  // 60-second cancel window check
  const createdAt = order.createdAt || Date.now();
  const timeSinceOrder = currentTime - createdAt;
  const canCancel =
    !isCancelled &&
    !isDelivered &&
    timeSinceOrder <= 60000 &&
    (rawStatus === "Received" || rawStatus === "Pending");
  const cancelSecondsLeft = Math.max(0, Math.ceil((60000 - timeSinceOrder) / 1000));

  // Live ETA countdown calculation
  const targetDuration = order.allocatedTime ? parseInt(order.allocatedTime) * 60 * 1000 : 20 * 60 * 1000;
  const targetTime = createdAt + targetDuration;
  const remainingMs = targetTime - currentTime;
  let remainingText = "Arriving Soon";
  if (remainingMs > 0) {
    const m = Math.floor(remainingMs / 60000);
    const s = Math.floor((remainingMs % 60000) / 1000);
    remainingText = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")} min`;
  }

  // Formatted date string
  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : order.date || "Just now";

  // Item parsing (support both multiple string items joined by + or array)
  const itemSummary = order.item || "Chai Chaska Special Beverage";
  const rawPrice = (order.total || "₹0").toString();
  const numericPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, "")) || 0;
  const subTotal = (numericPrice / 1.05).toFixed(2);
  const taxVal = (numericPrice - parseFloat(subTotal)).toFixed(2);

  return (
    <div className="order-detail-page-wrapper">
      <Navbar />

      <main className="order-detail-content-wrap">
        <div className="order-detail-inner-container">
          
          {/* Top Back Navigation & Action Bar */}
          <div className="detail-top-nav-bar">
            <Link href="/orders" className="back-link-chip">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back to Orders</span>
            </Link>

            <div className="top-actions-right">
              {canCancel && (
                <button
                  className="cancel-order-top-btn"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  title="Cancel order within 60s"
                >
                  {cancelling ? "Cancelling..." : `Cancel Order (${cancelSecondsLeft}s)`}
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="print-invoice-btn"
                title="Print or Save Official PDF Invoice"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Download Invoice</span>
              </button>
            </div>
          </div>

          {/* Hero Order Overview Card */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="order-hero-banner-card"
          >
            <div className="hero-banner-top-row">
              <div className="order-meta-info">
                <div className="live-tag-pill">
                  <span className="live-sparkle-dot" />
                  <span>LIVE SHIPMENT LOG</span>
                </div>
                
                <h1 className="order-title-heading">
                  Order Details
                </h1>

                <div className="order-id-meta-box">
                  <button
                    className="order-id-copy-pill"
                    onClick={handleCopyOrderId}
                    title="Copy Order ID"
                  >
                    <span className="id-hash">#</span>
                    <span className="id-value">{orderId}</span>
                    <span className="id-copy-status">
                      {copiedId ? "✓ Copied" : "📋 Copy"}
                    </span>
                  </button>
                  <span className="order-date-text">Placed on {formattedDate}</span>
                </div>
              </div>

              <div className="hero-banner-right-status">
                <div
                  className={`status-indicator-badge ${
                    isCancelled
                      ? "status-badge-cancelled"
                      : isDelivered
                      ? "status-badge-delivered"
                      : "status-badge-active"
                  }`}
                >
                  {!isCancelled && !isDelivered && <span className="status-dot-pulse" />}
                  {isDelivered && <span className="status-check-icon">✓</span>}
                  {isCancelled && <span className="status-cancel-icon">✕</span>}
                  <span>{rawStatus}</span>
                </div>

                {!isCancelled && !isDelivered && (
                  <div className="eta-countdown-pill">
                    <span className="eta-sand-icon">⏳</span>
                    <div className="eta-text-col">
                      <span className="eta-label">Estimated Delivery</span>
                      <strong className="eta-value">{remainingText}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Progress Stepper (Visible for all active / delivered orders) */}
            {!isCancelled ? (
              <div className="order-stepper-container">
                <div className="stepper-header-title-row">
                  <span className="stepper-main-heading">Fulfillment Milestones</span>
                  <span className="stepper-sub-info">Realtime counter updates</span>
                </div>

                <div className="stepper-visual-track">
                  {/* Step 1: Confirmed */}
                  <div className={`track-node ${isReceived ? "completed" : ""}`}>
                    <div className="node-icon-circle">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="node-label-box">
                      <span className="node-step-name">Confirmed</span>
                      <span className="node-step-desc">Order Accepted</span>
                    </div>
                  </div>

                  {/* Connector 1 */}
                  <div className={`track-connector-bar ${isPreparing ? "filled" : ""}`} />

                  {/* Step 2: Brewing */}
                  <div className={`track-node ${isPreparing ? (isOutForDelivery ? "completed" : "in-progress") : "idle"}`}>
                    <div className="node-icon-circle">
                      {isOutForDelivery ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <span>🫖</span>
                      )}
                    </div>
                    <div className="node-label-box">
                      <span className="node-step-name">Brewing</span>
                      <span className="node-step-desc">Fresh in Pot</span>
                    </div>
                  </div>

                  {/* Connector 2 */}
                  <div className={`track-connector-bar ${isOutForDelivery ? "filled" : ""}`} />

                  {/* Step 3: Out for Delivery */}
                  <div className={`track-node ${isOutForDelivery ? (isDelivered ? "completed" : "in-progress") : "idle"}`}>
                    <div className="node-icon-circle">
                      {isDelivered ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <span>🛵</span>
                      )}
                    </div>
                    <div className="node-label-box">
                      <span className="node-step-name">Dispatched</span>
                      <span className="node-step-desc">Desk Rider Active</span>
                    </div>
                  </div>

                  {/* Connector 3 */}
                  <div className={`track-connector-bar ${isDelivered ? "filled" : ""}`} />

                  {/* Step 4: Delivered */}
                  <div className={`track-node ${isDelivered ? "completed" : "idle"}`}>
                    <div className="node-icon-circle">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="node-label-box">
                      <span className="node-step-name">Delivered</span>
                      <span className="node-step-desc">Served at Desk</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-cancelled-notice-box">
                <div className="cancel-notice-icon">⚠️</div>
                <div className="cancel-notice-content">
                  <h3 className="cancel-notice-title">Order Has Been Cancelled</h3>
                  <p className="cancel-notice-desc">
                    Your cancellation request was logged. Any funds paid via UPI or Card will be refunded directly to your original payment account within 2-4 banking hours.
                  </p>
                </div>
              </div>
            )}
          </motion.section>

          {/* 2-Column Responsive Layout: Items & Invoice / Delivery Destination */}
          <div className="detail-dual-grid">
            
            {/* Left Column: Ordered Items & Bill Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="detail-surface-card"
            >
              <div className="card-header-bar">
                <div className="card-title-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div>
                  <h2 className="card-main-title">Ordered Items</h2>
                  <span className="card-sub-title">Artisanal brews & customizations</span>
                </div>
              </div>

              {/* Items List */}
              <div className="ordered-items-container">
                <div className="item-presentation-row">
                  <div className="item-image-wrapper">
                    <img
                      src={order.image || order.img || "/logo.png"}
                      alt={itemSummary}
                      className="item-actual-img"
                    />
                  </div>

                  <div className="item-spec-details">
                    <h3 className="item-spec-name">{itemSummary}</h3>
                    
                    <div className="item-customization-tags">
                      {order.milk && (
                        <span className="spec-tag">🥛 {order.milk}</span>
                      )}
                      {order.sugar && (
                        <span className="spec-tag">🍯 {order.sugar} Sugar</span>
                      )}
                      {order.addons && order.addons !== "None" && order.addons !== "" && (
                        <span className="spec-tag">✦ {order.addons}</span>
                      )}
                    </div>
                  </div>

                  <div className="item-price-column">
                    <span className="item-price-tag">{rawPrice}</span>
                  </div>
                </div>
              </div>

              {/* Bill Breakdown */}
              <div className="bill-breakdown-section">
                <h3 className="bill-heading">Payment Breakdown</h3>

                <div className="breakdown-line">
                  <span className="line-label">Item Subtotal</span>
                  <span className="line-value">₹{subTotal}</span>
                </div>

                <div className="breakdown-line">
                  <span className="line-label">GST & Restaurant Tax (5%)</span>
                  <span className="line-value">₹{taxVal}</span>
                </div>

                <div className="breakdown-line">
                  <span className="line-label">Thermal Desk Delivery</span>
                  <span className="line-value free-badge">FREE</span>
                </div>

                {order.coupon && order.coupon !== "None" && order.coupon !== "" && (
                  <div className="breakdown-line discount">
                    <span className="line-label">Promo Discount ({order.coupon})</span>
                    <span className="line-value">- Applied</span>
                  </div>
                )}

                <div className="breakdown-line grand-total-line">
                  <div className="grand-total-label-box">
                    <span className="grand-total-title">Total Paid</span>
                    <span className="tax-inclusive-tag">Inclusive of all taxes</span>
                  </div>
                  <strong className="grand-total-value">{rawPrice}</strong>
                </div>

                <div className="payment-method-strip">
                  <span className="shield-icon">🛡️</span>
                  <span>Paid securely via <strong>{order.paymentMethod || "UPI Instant Merchant Transfer"}</strong></span>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Delivery Destination & Recipient */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 }}
              className="detail-surface-card"
            >
              <div className="card-header-bar">
                <div className="card-title-icon-box">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <div>
                  <h2 className="card-main-title">Delivery Destination</h2>
                  <span className="card-sub-title">Office desk delivery details</span>
                </div>
              </div>

              {/* Delivery Details Block */}
              <div className="destination-details-box">
                <div className="detail-attribute-row">
                  <div className="attr-icon-circle">👤</div>
                  <div className="attr-data-col">
                    <span className="attr-title">Recipient Name</span>
                    <strong className="attr-value">{order.customer || "Corporate Guest"}</strong>
                  </div>
                </div>

                <div className="detail-attribute-row">
                  <div className="attr-icon-circle">📍</div>
                  <div className="attr-data-col">
                    <span className="attr-title">Desk / Office Location</span>
                    <strong className="attr-value">
                      {order.office || "Corporate Desk Delivery"}
                    </strong>
                    {order.officeNumber && order.floorNumber && (
                      <span className="attr-sub-note">
                        Office: {order.officeNumber} • Floor: {order.floorNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="detail-attribute-row">
                  <div className="attr-icon-circle">📞</div>
                  <div className="attr-data-col">
                    <span className="attr-title">Contact Phone</span>
                    <strong className="attr-value">{order.phone || "N/A"}</strong>
                  </div>
                </div>

                <div className="detail-attribute-row">
                  <div className="attr-icon-circle">🏢</div>
                  <div className="attr-data-col">
                    <span className="attr-title">Hub Station</span>
                    <span className="attr-value-regular">Gaur City Center Chai Hub</span>
                  </div>
                </div>
              </div>

              {/* Freshness & Quality Pledge */}
              <div className="freshness-pledge-card">
                <div className="pledge-icon-wrap">☕</div>
                <div className="pledge-text-col">
                  <h4 className="pledge-title">The Chai Chaska Desk Guarantee</h4>
                  <p className="pledge-desc">
                    Brewed on-demand in food-grade steel kettles and delivered piping hot directly to your office chair. If your brew is cold upon arrival, request an instant re-brew.
                  </p>
                </div>
              </div>

              {/* Help & Support strip */}
              <div className="support-help-box">
                <span>Need support with this order?</span>
                <a href="tel:+919667623123" className="support-phone-link">
                  📞 +91 96676-23-123
                </a>
              </div>
            </motion.div>

          </div>

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
                    Tap the <strong>Share</strong> or <strong>Three Dots (⋮)</strong> menu in your browser.
                  </div>
                </div>
                <div className="install-step-row">
                  <div className="step-num">2</div>
                  <div className="step-text">
                    Select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.
                  </div>
                </div>
              </div>

              <button
                className="install-modal-action-btn"
                onClick={async () => {
                  if (deferredPrompt) {
                    try {
                      deferredPrompt.prompt();
                      const choice = await deferredPrompt.userChoice;
                      if (choice && choice.outcome === "accepted") {
                        setDeferredPrompt(null);
                        setShowInstallModal(false);
                      }
                    } catch (e) {
                      console.warn("Install error:", e);
                    }
                  } else {
                    alert("To add Chai Chaska to your Home Screen:\n\n• Android / Chrome: Tap menu (⋮) -> 'Add to Home screen'\n• iPhone / Safari: Tap Share (⎋) -> 'Add to Home Screen'");
                  }
                }}
              >
                📲 Add to Home Screen
              </button>

              <button
                className="install-modal-close-btn"
                onClick={() => setShowInstallModal(false)}
              >
                Maybe Later
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OFFICIAL PRINTABLE TAX INVOICE (Shows ONLY during window.print()) */}
      <div id="printable-invoice-card" className="print-only-invoice" style={{ display: "none" }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .print-only-invoice {
              display: block !important;
            }
          }
        `}} />
        <div style={{ background: "#ffffff", padding: "44px", borderRadius: "8px", color: "#0f172a", fontFamily: "Arial, sans-serif" }}>
          
          {/* Row 1: Logo & INVOICE header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", borderBottom: "2px solid #0f172a", paddingBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <img src="/logo.png" alt="Chai Chaska Logo" style={{ width: "54px", height: "54px", objectFit: "contain", borderRadius: "50%" }} />
              <div>
                <strong style={{ fontSize: "22px", color: "#0f172a", letterSpacing: "0.5px", display: "block" }}>CHAI CHASKA</strong>
                <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>Corporate Desk Brewery</span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <h1 style={{ fontSize: "26px", color: "#0f172a", letterSpacing: "2px", margin: 0, fontWeight: "800", textTransform: "uppercase" }}>TAX INVOICE</h1>
              <span style={{ fontSize: "12px", color: "#64748b" }}>GSTIN: 09AAEC0000A1Z5</span>
            </div>
          </div>

          {/* Row 2: Details Columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "20px", marginBottom: "20px" }}>
            <div>
              <span style={{ fontSize: "10.5px", color: "#64748b", display: "block", textTransform: "uppercase", marginBottom: "4px", fontWeight: "700" }}>Invoice No.</span>
              <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>#{orderId.replace("CHAI-ORD-", "CC-")}</strong>
            </div>
            <div>
              <span style={{ fontSize: "10.5px", color: "#64748b", display: "block", textTransform: "uppercase", marginBottom: "4px", fontWeight: "700" }}>Invoice Date</span>
              <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>{new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
            </div>
            <div>
              <span style={{ fontSize: "10.5px", color: "#64748b", display: "block", textTransform: "uppercase", marginBottom: "4px", fontWeight: "700" }}>Billed & Delivered To:</span>
              <strong style={{ fontSize: "14px", display: "block", color: "#0f172a" }}>{order.customer || "Corporate Client"}</strong>
              <span style={{ fontSize: "11.5px", color: "#475569" }}>{order.office || "Desk Delivery"}</span>
              {order.phone && <span style={{ fontSize: "11.5px", color: "#64748b", display: "block" }}>Phone: {order.phone}</span>}
            </div>
          </div>

          {/* Row 3: Total Due block */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "18px 24px", borderRadius: "10px", marginBottom: "28px", border: "1px solid #e2e8f0" }}>
            <div>
              <span style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", display: "block", fontWeight: "800", letterSpacing: "0.5px" }}>TOTAL AMOUNT PAID</span>
              <strong style={{ fontSize: "24px", color: "#0f172a" }}>{rawPrice}</strong>
            </div>
            <div style={{ textAlign: "right", fontSize: "12px", color: "#475569" }}>
              <span style={{ display: "block", fontWeight: "700", color: "#0f172a" }}>Payment Status</span>
              <span style={{ color: "#10b981", fontWeight: "800" }}>PAID VIA UPI INSTANT</span>
            </div>
          </div>

          {/* Row 4: Itemized Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#ffffff", fontSize: "11.5px", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", borderRadius: "6px 0 0 6px" }}>Item Description</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Base Price</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "12px 16px", textAlign: "right", borderRadius: "0 6px 6px 0" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #e2e8f0", fontSize: "13px" }}>
                <td style={{ padding: "16px" }}>
                  <strong style={{ display: "block", color: "#0f172a" }}>{itemSummary}</strong>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    Milk: {order.milk || "Standard"} • Sugar: {order.sugar || "Standard"} {order.addons && order.addons !== "None" ? `• ${order.addons}` : ""}
                  </span>
                </td>
                <td style={{ padding: "16px", textAlign: "right", color: "#334155" }}>₹{subTotal}</td>
                <td style={{ padding: "16px", textAlign: "center", color: "#334155" }}>1</td>
                <td style={{ padding: "16px", textAlign: "right", fontWeight: "700", color: "#0f172a" }}>₹{subTotal}</td>
              </tr>
            </tbody>
          </table>

          {/* Row 5: Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", marginBottom: "36px" }}>
            <div>
              <strong style={{ fontSize: "11.5px", textTransform: "uppercase", display: "block", color: "#64748b", marginBottom: "8px" }}>Payment Details</strong>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", background: "#f1f5f9", padding: "6px 12px", borderRadius: "6px", fontWeight: "700", color: "#0f172a" }}>UPI Transfer</span>
                <span style={{ fontSize: "12px", background: "#f1f5f9", padding: "6px 12px", borderRadius: "6px", fontWeight: "700", color: "#0f172a" }}>Authorized Merchant</span>
              </div>
              <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginTop: "8px" }}>TransID: {orderId}</span>
            </div>

            <div style={{ fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#64748b" }}>
                <span>Sub Total:</span>
                <span>₹{subTotal}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#64748b", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                <span>GST (5%):</span>
                <span>₹{taxVal}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#0f172a", color: "#ffffff", borderRadius: "6px", marginTop: "10px", fontWeight: "800", fontSize: "15px" }}>
                <span>Grand Total:</span>
                <span>{rawPrice}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "32px" }}>
            <div style={{ textAlign: "center", width: "180px" }}>
              <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "18px", color: "#0f172a", display: "block", marginBottom: "4px" }}>Chai Chaska</span>
              <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "6px", fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", fontWeight: "700" }}>Authorized Signatory</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "36px", paddingTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8" }}>
            <span>TF-57, 3rd Floor, Gaur City Center, Greater Noida West</span>
            <span>Support: +91 96676-23-123</span>
            <span>chaichaska.support@gmail.com</span>
          </div>

        </div>
      </div>

      <style>{`
        /* ============================================================ */
        /* ORDER DETAIL PAGE PREMIUM STYLES                              */
        /* ============================================================ */
        .order-detail-page-wrapper {
          background: #f8fafc;
          min-height: 100vh;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          position: relative;
        }

        .order-detail-content-wrap {
          width: 100%;
          max-width: 1060px;
          margin: 0 auto;
          padding: 32px 24px 80px;
          box-sizing: border-box;
        }

        .order-detail-inner-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Top Nav & Action Bar */
        .detail-top-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .back-link-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          text-decoration: none;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
          transition: all 0.2s ease;
        }

        .back-link-chip:hover {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          transform: translateY(-1px);
        }

        .top-actions-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cancel-order-top-btn {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-order-top-btn:hover {
          background: #dc2626;
          color: #ffffff;
          border-color: #dc2626;
        }

        .print-invoice-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
        }

        .print-invoice-btn:hover {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        /* Hero Order Banner Card */
        .order-hero-banner-card {
          background: #ffffff;
          border-radius: 28px;
          border: 1px solid #f1f5f9;
          padding: 32px;
          box-shadow: 0 8px 30px -4px rgba(15, 23, 42, 0.05);
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .hero-banner-top-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
        }

        .order-meta-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .live-tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #475569;
          width: fit-content;
        }

        .live-sparkle-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .order-title-heading {
          font-size: clamp(24px, 4vw, 32px);
          font-weight: 850;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .order-id-meta-box {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .order-id-copy-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 5px 10px;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          cursor: pointer;
          transition: all 0.2s;
        }

        .order-id-copy-pill:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .id-hash {
          color: #94a3b8;
        }

        .id-copy-status {
          font-size: 11px;
          color: #64748b;
          margin-left: 2px;
        }

        .order-date-text {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .hero-banner-right-status {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }

        .status-indicator-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 13.5px;
          font-weight: 800;
          text-transform: capitalize;
        }

        .status-badge-active {
          background: #ecfdf5;
          color: #059669;
          border: 1px solid #a7f3d0;
        }

        .status-badge-delivered {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .status-badge-cancelled {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .status-dot-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
          70% { box-shadow: 0 0 0 7px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .eta-countdown-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          padding: 8px 14px;
          border-radius: 14px;
        }

        .eta-sand-icon {
          font-size: 18px;
        }

        .eta-text-col {
          display: flex;
          flex-direction: column;
        }

        .eta-label {
          font-size: 10.5px;
          font-weight: 700;
          color: #b45309;
          text-transform: uppercase;
        }

        .eta-value {
          font-size: 15px;
          font-weight: 850;
          color: #92400e;
        }

        /* Live Progress Stepper Track */
        .order-stepper-container {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 22px 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .stepper-header-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .stepper-main-heading {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #0f172a;
        }

        .stepper-sub-info {
          font-size: 11.5px;
          color: #64748b;
          font-weight: 600;
        }

        .stepper-visual-track {
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          gap: 6px;
        }

        .track-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
          position: relative;
          z-index: 2;
          min-width: 68px;
        }

        .node-icon-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          transition: all 0.3s;
        }

        .track-node.completed .node-icon-circle {
          background: #0f172a;
          color: #ffffff;
        }

        .track-node.in-progress .node-icon-circle {
          background: #0f172a;
          color: #ffffff;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.15);
        }

        .node-label-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .node-step-name {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
        }

        .track-node.idle .node-step-name {
          color: #94a3b8;
        }

        .node-step-desc {
          font-size: 10.5px;
          color: #64748b;
          white-space: nowrap;
        }

        .track-node.idle .node-step-desc {
          color: #cbd5e1;
        }

        .track-connector-bar {
          flex: 1;
          height: 3px;
          background: #e2e8f0;
          transform: translateY(-13px);
          transition: background 0.3s ease;
        }

        .track-connector-bar.filled {
          background: #0f172a;
        }

        /* Cancelled notice */
        .order-cancelled-notice-box {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 18px;
          padding: 18px 20px;
        }

        .cancel-notice-icon {
          font-size: 24px;
          line-height: 1;
        }

        .cancel-notice-title {
          font-size: 15px;
          font-weight: 800;
          color: #991b1b;
          margin: 0 0 4px 0;
        }

        .cancel-notice-desc {
          font-size: 13px;
          color: #7f1d1d;
          line-height: 1.5;
          margin: 0;
        }

        /* 2-Column Responsive Split */
        .detail-dual-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .detail-surface-card {
          background: #ffffff;
          border-radius: 28px;
          border: 1px solid #f1f5f9;
          padding: 28px;
          box-shadow: 0 4px 24px -2px rgba(15, 23, 42, 0.04);
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .card-header-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 18px;
          border-bottom: 1px solid #f1f5f9;
        }

        .card-title-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          flex-shrink: 0;
        }

        .card-main-title {
          font-size: 17px;
          font-weight: 850;
          color: #0f172a;
          margin: 0;
        }

        .card-sub-title {
          font-size: 12px;
          color: #64748b;
          display: block;
          margin-top: 2px;
        }

        /* Ordered Items View */
        .ordered-items-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .item-presentation-row {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          padding: 14px 16px;
          border-radius: 18px;
        }

        .item-image-wrapper {
          width: 58px;
          height: 58px;
          border-radius: 14px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
        }

        .item-actual-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .item-spec-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .item-spec-name {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          line-height: 1.3;
        }

        .item-customization-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .spec-tag {
          font-size: 11px;
          font-weight: 700;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .item-price-column {
          flex-shrink: 0;
          text-align: right;
        }

        .item-price-tag {
          font-size: 16px;
          font-weight: 850;
          color: #0f172a;
        }

        /* Payment Breakdown */
        .bill-breakdown-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
          border-top: 1px dashed #e2e8f0;
          padding-top: 18px;
        }

        .bill-heading {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
          margin: 0 0 6px 0;
        }

        .breakdown-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13.5px;
          color: #64748b;
        }

        .breakdown-line.discount {
          color: #059669;
          font-weight: 600;
        }

        .free-badge {
          color: #059669;
          font-weight: 800;
          font-size: 12px;
          background: #ecfdf5;
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .breakdown-line.grand-total-line {
          margin-top: 10px;
          padding-top: 14px;
          border-top: 1.5px solid #0f172a;
          color: #0f172a;
        }

        .grand-total-label-box {
          display: flex;
          flex-direction: column;
        }

        .grand-total-title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .tax-inclusive-tag {
          font-size: 11px;
          color: #94a3b8;
        }

        .grand-total-value {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
        }

        .payment-method-strip {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 12px;
          color: #475569;
          margin-top: 8px;
        }

        /* Destination Card Details */
        .destination-details-box {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-attribute-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .attr-icon-circle {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
        }

        .attr-data-col {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .attr-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .attr-value {
          font-size: 14.5px;
          font-weight: 750;
          color: #0f172a;
        }

        .attr-sub-note {
          font-size: 12.5px;
          color: #64748b;
          font-weight: 600;
        }

        .attr-value-regular {
          font-size: 13.5px;
          color: #475569;
          font-weight: 600;
        }

        /* Guarantee Pledge */
        .freshness-pledge-card {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: #fdfaf6;
          border: 1px solid #f5ede2;
          border-radius: 18px;
          padding: 16px 18px;
        }

        .pledge-icon-wrap {
          font-size: 22px;
          line-height: 1;
        }

        .pledge-title {
          font-size: 13.5px;
          font-weight: 800;
          color: #8a3a00;
          margin: 0 0 4px 0;
        }

        .pledge-desc {
          font-size: 12px;
          color: #78350f;
          line-height: 1.5;
          margin: 0;
        }

        .support-help-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 14px;
          border-top: 1px solid #f1f5f9;
          font-size: 12.5px;
          color: #64748b;
        }

        .support-phone-link {
          color: #0f172a;
          font-weight: 800;
          text-decoration: none;
        }

        .support-phone-link:hover {
          text-decoration: underline;
        }

        /* Loading Screen */
        .order-detail-loading-screen {
          min-height: 100vh;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px;
          text-align: center;
        }

        .detail-loading-spinner {
          width: 44px;
          height: 44px;
          border: 3.5px solid #e2e8f0;
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
        }

        .loading-desc {
          font-size: 13.5px;
          color: #64748b;
          margin: 0;
        }

        /* Not Found */
        .not-found-card {
          background: #ffffff;
          border-radius: 28px;
          border: 1px dashed #cbd5e1;
          padding: 60px 24px;
          text-align: center;
          max-width: 480px;
          margin: 60px auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .not-found-icon-box {
          font-size: 40px;
          margin-bottom: 16px;
        }

        .not-found-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px 0;
        }

        .not-found-desc {
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 24px 0;
        }

        .id-code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 6px;
          font-family: monospace;
          color: #0f172a;
        }

        .return-orders-btn {
          background: #0f172a;
          color: #ffffff;
          text-decoration: none;
          padding: 10px 22px;
          border-radius: 9999px;
          font-size: 13.5px;
          font-weight: 700;
          transition: all 0.2s;
        }

        .return-orders-btn:hover {
          background: #334155;
          transform: translateY(-1px);
        }

        /* Mobile Bottom Nav */
        .mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.04);
          z-index: 1000;
          align-items: center;
          justify-content: space-around;
          padding: 0 12px;
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #64748b;
          text-decoration: none;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 12px;
          font-family: inherit;
          transition: color 0.2s ease;
        }

        .bottom-nav-item.active {
          color: #0f172a;
        }

        .bottom-nav-label {
          font-size: 10.5px;
          font-weight: 700;
        }

        .bottom-nav-icon-box {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bottom-nav-badge {
          position: absolute;
          top: -6px;
          right: -10px;
          background: #e2123a;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          border-radius: 9999px;
          padding: 1px 5px;
          min-width: 16px;
          text-align: center;
          border: 1.5px solid #ffffff;
        }

        .get-app-icon-wrap {
          position: relative;
        }

        .get-app-sparkle {
          position: absolute;
          top: -6px;
          right: -6px;
          font-size: 10px;
          color: #f59e0b;
        }

        /* Install Modal */
        .install-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .install-modal-card {
          background: #ffffff;
          border-radius: 28px;
          padding: 32px 28px;
          max-width: 380px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 48px rgba(15, 23, 42, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .install-modal-logo-box {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          overflow: hidden;
          margin-bottom: 16px;
          border: 1px solid #e2e8f0;
        }

        .install-modal-logo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .install-modal-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px 0;
        }

        .install-modal-desc {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 20px 0;
        }

        .install-steps-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          margin-bottom: 24px;
          text-align: left;
        }

        .install-step-row {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid #f1f5f9;
        }

        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #0f172a;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .step-text {
          font-size: 12.5px;
          color: #334155;
          line-height: 1.3;
        }

        .install-modal-action-btn {
          width: 100%;
          background: #0f172a;
          color: #ffffff;
          padding: 13px 20px;
          border-radius: 9999px;
          border: none;
          font-size: 14.5px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);
          margin-bottom: 10px;
        }

        .install-modal-action-btn:hover {
          background: #1e293b;
          transform: translateY(-1px);
        }

        .install-modal-close-btn {
          width: 100%;
          background: transparent;
          color: #64748b;
          padding: 10px 16px;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .install-modal-close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .install-modal-close-btn:hover {
          background: #334155;
        }

        /* ============================================================ */
        /* RESPONSIVENESS (< 768px)                                      */
        /* ============================================================ */
        @media (max-width: 768px) {
          .mobile-bottom-nav {
            display: flex !important;
          }

          .order-detail-content-wrap {
            padding: 16px 14px 90px !important;
          }

          .order-hero-banner-card {
            padding: 20px 18px !important;
            border-radius: 22px !important;
            gap: 20px !important;
          }

          .hero-banner-top-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 14px !important;
          }

          .hero-banner-right-status {
            width: 100% !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
          }

          .order-stepper-container {
            padding: 16px 14px !important;
            border-radius: 16px !important;
          }

          .stepper-visual-track {
            gap: 2px !important;
          }

          .track-node {
            min-width: 48px !important;
          }

          .node-icon-circle {
            width: 26px !important;
            height: 26px !important;
            font-size: 11px !important;
          }

          .node-step-name {
            font-size: 10.5px !important;
          }

          .node-step-desc {
            display: none !important;
          }

          .track-connector-bar {
            transform: translateY(-9px) !important;
          }

          .detail-dual-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }

          .detail-surface-card {
            padding: 20px 18px !important;
            border-radius: 22px !important;
          }

          .top-actions-right {
            width: 100% !important;
            justify-content: space-between !important;
          }

          .print-invoice-btn,
          .cancel-order-top-btn {
            flex: 1 !important;
            justify-content: center !important;
          }
        }

        /* PRINT STYLES */
        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          body *:not(#printable-invoice-card):not(:has(#printable-invoice-card)):not(#printable-invoice-card *) {
            display: none !important;
          }
          body *:has(#printable-invoice-card) {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: transparent !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            position: static !important;
          }
          #printable-invoice-card {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 24px !important;
            margin: 0 !important;
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
