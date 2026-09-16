"use client";

import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function CartPage() {
  const { cartItems, getCartTotal, removeFromCart, updateQuantity, isLoaded } = useCart();
  const router = useRouter();

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

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

  if (!isLoaded) {
    return (
      <div className="cart-loading-state">
        <div className="cart-spinner-ring" />
        <h2>Brewing Your Tray...</h2>
      </div>
    );
  }

  const subtotal = getCartTotal ? getCartTotal() : 0;
  const totalItemCount = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);

  // Stagger animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 350,
        damping: 26,
      },
    },
    exit: {
      opacity: 0,
      x: -60,
      scale: 0.9,
      height: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
      overflow: "hidden",
      transition: {
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <div className="cart-page-shell">
      <Navbar />

      <main className="cart-main-content">
        <div className="cart-container">
          
          {/* Header Banner */}
          <header className="cart-header-row">
            <div className="cart-badge-chip">
              <span className="badge-pulse-dot" />
              <span>YOUR SELECTION</span>
            </div>
            <h1 className="cart-main-title">
              Your Tray <span className="title-count">({totalItemCount} {totalItemCount === 1 ? "item" : "items"})</span>
            </h1>
            <p className="cart-subtitle">
              Review your handcrafted brews. Adjust portions directly or proceed to fast desk checkout.
            </p>
          </header>

          {cartItems.length === 0 ? (
            /* Empty Tray State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="cart-empty-card"
            >
              <div className="empty-cup-box">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                  <line x1="6" y1="1" x2="6" y2="4"></line>
                  <line x1="10" y1="1" x2="10" y2="4"></line>
                  <line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
              </div>
              <h2 className="empty-title">Your tray is currently empty</h2>
              <p className="empty-description">
                Explore our signature masala chais, artisanal coffees, and chilled coolers to fill your tray.
              </p>
              <Link href="/shop" className="explore-menu-btn">
                <span>Explore Full Menu</span>
                <span className="arrow-sym">→</span>
              </Link>
            </motion.div>
          ) : (
            /* 2-Column Split: Items List on Left, Bill Summary on Right */
            <div className="cart-split-layout">
              
              {/* Left Column: Items with Stagger Animation */}
              <div className="cart-items-column">
                <div className="cart-items-card">
                  <div className="items-card-header">
                    <span className="header-label">Selected Items</span>
                    <span className="header-hint">Tap – at 1 to auto-remove</span>
                  </div>

                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="cart-items-stagger-list"
                  >
                    <AnimatePresence mode="popLayout">
                      {cartItems.map((item, idx) => {
                        const itemPrice =
                          parseInt(String(item.price).replace(/[^0-9]/g, "")) || 0;
                        const itemTotal = itemPrice * (item.quantity || 1);

                        return (
                          <motion.article
                            key={`${item.id}-${idx}`}
                            variants={itemVariants}
                            layout
                            exit="exit"
                            className="cart-item-row"
                          >
                            {/* Product Media Box */}
                            <div className="item-thumb-box">
                              <img
                                src={
                                  item.image ||
                                  "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80"
                                }
                                alt={item.name}
                                className="item-thumb-img"
                              />
                            </div>

                            {/* Details Column */}
                            <div className="item-details-col">
                              <div className="item-title-row">
                                <h3 className="item-name">{item.name}</h3>
                                <span className="item-unit-rate">₹{itemPrice} each</span>
                              </div>

                              <div className="item-specs-row">
                                <span className="spec-dot" />
                                <span className="spec-tag">Freshly Brewed</span>
                                {item.sugar && (
                                  <span className="spec-bubble">{item.sugar} Sugar</span>
                                )}
                                {item.milk && (
                                  <span className="spec-bubble">{item.milk}</span>
                                )}
                              </div>

                              {/* Interactive Portion Controller (No remove button - auto-removes at 0) */}
                              <div className="item-action-row">
                                <div className="portion-stepper">
                                  <button
                                    onClick={() => {
                                      if (item.quantity <= 1) {
                                        // Auto-removes smoothly with animation
                                        removeFromCart(idx);
                                      } else {
                                        updateQuantity(idx, item.quantity - 1);
                                      }
                                    }}
                                    className={`stepper-btn minus ${item.quantity === 1 ? "trash-hint" : ""}`}
                                    title={item.quantity === 1 ? "Remove item from tray" : "Decrease quantity"}
                                    aria-label="Decrease quantity"
                                  >
                                    {item.quantity === 1 ? "✕" : "–"}
                                  </button>

                                  <span className="stepper-count">{item.quantity}</span>

                                  <button
                                    onClick={() => updateQuantity(idx, item.quantity + 1)}
                                    className="stepper-btn plus"
                                    title="Increase quantity"
                                    aria-label="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>

                                <span className="item-line-total">₹{itemTotal}</span>
                              </div>
                            </div>
                          </motion.article>
                        );
                      })}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>

              {/* Right Column: Order Bill Summary */}
              <div className="cart-summary-column">
                <div className="summary-card-box">
                  <div className="summary-header">
                    <h3 className="summary-title">Bill Summary</h3>
                    <span className="summary-items-pill">{totalItemCount} items</span>
                  </div>

                  <div className="summary-bill-rows">
                    <div className="bill-row">
                      <span className="bill-label">Item Total</span>
                      <span className="bill-value">₹{subtotal}</span>
                    </div>

                    <div className="bill-row">
                      <span className="bill-label">Brewing & Packaging</span>
                      <span className="bill-free-badge">FREE</span>
                    </div>

                    <div className="bill-row">
                      <span className="bill-label">Instant Desk Delivery</span>
                      <span className="bill-free-badge">FREE</span>
                    </div>

                    <div className="bill-divider" />

                    <div className="bill-row total-bill-row">
                      <span className="total-label">Grand Total</span>
                      <span className="total-value">₹{subtotal}</span>
                    </div>
                  </div>

                  {/* Proceed to Checkout CTA */}
                  <button
                    onClick={() => router.push("/checkout")}
                    className="proceed-checkout-cta"
                  >
                    <span>Proceed to Checkout</span>
                    <span className="cta-arrow">→</span>
                  </button>

                  <div className="checkout-perks-box">
                    <div className="perk-item">
                      <span className="perk-icon">⚡</span>
                      <span>Express 20-min desk delivery</span>
                    </div>
                    <div className="perk-item">
                      <span className="perk-icon">🔒</span>
                      <span>No account creation required</span>
                    </div>
                  </div>

                  <Link href="/shop" className="continue-shopping-link">
                    ← Add more items from menu
                  </Link>
                </div>
              </div>

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

        {/* 2. Orders */}
        <Link href="/orders" className="bottom-nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span className="bottom-nav-label">Orders</span>
        </Link>

        {/* 3. Checkout (ACTIVE) */}
        <Link href="/cart" className="bottom-nav-item active checkout-btn-item">
          <div className="bottom-nav-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            {cartItems && cartItems.length > 0 && (
              <span className="bottom-nav-badge">
                {totalItemCount}
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

      {/* Embedded Modern White Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        .cart-page-shell {
          background: #ffffff;
          min-height: 100vh;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          position: relative;
        }

        .cart-main-content {
          padding: 36px 20px 90px;
          max-width: 1140px;
          margin: 0 auto;
        }

        .cart-container {
          width: 100%;
        }

        /* Header Row */
        .cart-header-row {
          margin-bottom: 32px;
        }

        .cart-badge-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #475569;
          margin-bottom: 12px;
        }

        .badge-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
        }

        .cart-main-title {
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .title-count {
          color: #64748b;
          font-weight: 700;
          font-size: 0.85em;
        }

        .cart-subtitle {
          font-size: clamp(14px, 1.8vw, 15.5px);
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        /* Empty Card */
        .cart-empty-card {
          background: #ffffff;
          border: 1.5px solid #f1f5f9;
          border-radius: 28px;
          padding: 64px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.03);
          margin-top: 16px;
        }

        .empty-cup-box {
          width: 80px;
          height: 80px;
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

        .empty-description {
          font-size: 14.5px;
          color: #64748b;
          max-width: 440px;
          margin: 0 0 24px;
          line-height: 1.5;
        }

        .explore-menu-btn {
          background: #0f172a;
          color: #ffffff;
          text-decoration: none;
          padding: 13px 28px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
          transition: all 0.2s;
        }

        .explore-menu-btn:hover {
          background: #1e293b;
          transform: translateY(-2px);
        }

        .arrow-sym {
          transition: transform 0.2s;
        }

        .explore-menu-btn:hover .arrow-sym {
          transform: translateX(3px);
        }

        /* 2-Column Split */
        .cart-split-layout {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 32px;
          align-items: start;
        }

        /* Items Column */
        .cart-items-card {
          background: #ffffff;
          border: 1.5px solid #f1f5f9;
          border-radius: 28px;
          padding: 24px 28px;
          box-shadow: 0 10px 35px -5px rgba(15, 23, 42, 0.03);
        }

        .items-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 20px;
        }

        .header-label {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .header-hint {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 600;
        }

        /* Staggered Items List */
        .cart-items-stagger-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .cart-item-row {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 16px 18px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 22px;
          transition: all 0.2s ease;
        }

        .cart-item-row:hover {
          border-color: #e2e8f0;
          background: #ffffff;
          box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.05);
        }

        .item-thumb-box {
          width: 78px;
          height: 78px;
          border-radius: 18px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .item-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .item-details-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .item-title-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }

        .item-name {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-unit-rate {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 600;
          white-space: nowrap;
        }

        .item-specs-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .spec-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
        }

        .spec-tag {
          font-size: 11.5px;
          color: #059669;
          font-weight: 700;
        }

        .spec-bubble {
          font-size: 11px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 2px 8px;
          border-radius: 9999px;
          font-weight: 600;
        }

        /* Action Row: Stepper + Line Total */
        .item-action-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }

        /* Stepper Controller */
        .portion-stepper {
          display: inline-flex;
          align-items: center;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 9999px;
          padding: 3px 6px;
          gap: 10px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          transition: all 0.2s;
        }

        .portion-stepper:focus-within,
        .portion-stepper:hover {
          border-color: #0f172a;
        }

        .stepper-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          color: #0f172a;
          font-size: 14px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }

        .stepper-btn:hover {
          background: #0f172a;
          color: #ffffff;
          transform: scale(1.08);
        }

        .stepper-btn.trash-hint:hover {
          background: #ef4444;
          color: #ffffff;
        }

        .stepper-count {
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          min-width: 14px;
          text-align: center;
        }

        .item-line-total {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        /* Summary Column */
        .cart-summary-column {
          position: sticky;
          top: 90px;
        }

        .summary-card-box {
          background: #ffffff;
          border: 1.5px solid #f1f5f9;
          border-radius: 28px;
          padding: 28px 24px;
          box-shadow: 0 10px 35px -5px rgba(15, 23, 42, 0.04);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .summary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid #f1f5f9;
        }

        .summary-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .summary-items-pill {
          font-size: 11.5px;
          font-weight: 750;
          background: #f1f5f9;
          color: #475569;
          padding: 3px 9px;
          border-radius: 9999px;
        }

        .summary-bill-rows {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bill-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13.5px;
          color: #64748b;
        }

        .bill-value {
          font-weight: 750;
          color: #0f172a;
        }

        .bill-free-badge {
          color: #16a34a;
          font-weight: 800;
          font-size: 12px;
          background: #ecfdf5;
          padding: 2px 7px;
          border-radius: 9999px;
        }

        .bill-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 4px 0;
        }

        .total-bill-row {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }

        .total-value {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
        }

        .proceed-checkout-cta {
          width: 100%;
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 16px 20px;
          border-radius: 9999px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .proceed-checkout-cta:hover {
          background: #1e293b;
          transform: translateY(-2px);
          box-shadow: 0 14px 35px rgba(15, 23, 42, 0.35);
        }

        .cta-arrow {
          font-size: 18px;
          transition: transform 0.2s;
        }

        .proceed-checkout-cta:hover .cta-arrow {
          transform: translateX(4px);
        }

        .checkout-perks-box {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 18px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .perk-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #475569;
          font-weight: 600;
        }

        .perk-icon {
          font-size: 13px;
        }

        .continue-shopping-link {
          display: block;
          text-align: center;
          font-size: 12.5px;
          color: #64748b;
          text-decoration: none;
          font-weight: 650;
          transition: color 0.2s;
        }

        .continue-shopping-link:hover {
          color: #0f172a;
        }

        /* Loading Screen */
        .cart-loading-state {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: #ffffff;
        }

        .cart-spinner-ring {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: spinCart 0.8s linear infinite;
        }

        @keyframes spinCart {
          to { transform: rotate(360deg); }
        }

        /* Mobile Bottom Nav Bar */
        .mobile-bottom-nav {
          display: none;
        }

        /* Responsive Breakpoints */
        @media (max-width: 860px) {
          .cart-split-layout {
            grid-template-columns: 1fr;
          }

          .cart-summary-column {
            position: static;
          }
        }

        @media (max-width: 768px) {
          .cart-main-content {
            padding: 20px 14px 100px;
          }

          .cart-items-card {
            padding: 18px 16px;
            border-radius: 22px;
          }

          .cart-item-row {
            padding: 12px 14px;
            gap: 14px;
            border-radius: 18px;
          }

          .item-thumb-box {
            width: 66px;
            height: 66px;
            border-radius: 14px;
          }

          .item-name {
            font-size: 14.5px;
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
      ` }} />
    </div>
  );
}
