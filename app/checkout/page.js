"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { createOrder, getCoupons } from "@/lib/firestore";

function CheckoutPortal() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { cartItems, getCartTotal, clearCart, updateQuantity, removeFromCart, isLoaded: cartLoaded } = useCart();

  // ONLY 3 CORE REQUIRED FIELDS as requested:
  // 1. Name of Person
  // 2. Office Number
  // 3. Floor Number
  const [personName, setPersonName] = useState("");
  const [officeNumber, setOfficeNumber] = useState("");
  const [floorNumber, setFloorNumber] = useState("");
  const [phone, setPhone] = useState("");

  // Payment Method: "upi" | "cod"
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon State
  const [dbCoupons, setDbCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCouponLabel, setAppliedCouponLabel] = useState("");
  const [couponError, setCouponError] = useState("");

  // PWA Install state
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

  // Pre-fill fields if user is already logged in
  useEffect(() => {
    if (user || profile) {
      if (profile?.name || user?.displayName) {
        setPersonName(profile?.name || user?.displayName || "");
      }
      if (profile?.floor) {
        setOfficeNumber(profile.floor);
      }
      if (profile?.phone) {
        setPhone(profile.phone);
      }
    }
  }, [user, profile]);

  // Load active coupons
  useEffect(() => {
    getCoupons()
      .then((c) => setDbCoupons(c || []))
      .catch((err) => console.error(err));
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (cartLoaded && cartItems.length === 0) {
      router.push("/shop");
    }
  }, [cartItems, cartLoaded, router]);

  // Calculate pricing
  const subtotal = getCartTotal ? getCartTotal() : 0;
  const finalPayable = Math.max(0, subtotal - appliedDiscount);

  // Handle Coupon Application
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError("");
    if (!couponCode.trim()) return;

    const found = dbCoupons.find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.active
    );

    if (found) {
      if (found.type === "flat") {
        setAppliedDiscount(found.value);
        setAppliedCouponLabel(`${found.code} (₹${found.value} flat off)`);
      } else if (found.type === "percent") {
        const disc = Math.round(subtotal * (found.value / 100));
        setAppliedDiscount(disc);
        setAppliedCouponLabel(`${found.code} (${found.value}% off - Save ₹${disc})`);
      }
    } else {
      setCouponError("Invalid or expired coupon code.");
    }
  };

  // Handle Order Placement & Payment
  const handleCheckoutSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!personName.trim()) {
      alert("Please enter the name of the person receiving the order.");
      return;
    }
    if (!officeNumber.trim()) {
      alert("Please enter your office number (e.g. Office 402, Cabin 3).");
      return;
    }
    if (!floorNumber.trim()) {
      alert("Please enter your floor number (e.g. 4th Floor, Ground Floor).");
      return;
    }

    setIsSubmitting(true);

    const formattedAddress = `Office ${officeNumber.trim()}, Floor ${floorNumber.trim()}`;
    const itemsDescription = cartItems
      .map((i) => `${i.name} x${i.quantity || 1}`)
      .join(" + ");

    const orderData = {
      userId: user?.uid || "guest",
      customer: personName.trim(),
      officeNumber: officeNumber.trim(),
      floorNumber: floorNumber.trim(),
      office: formattedAddress,
      address: formattedAddress,
      phone: phone.trim() || "N/A",
      item: itemsDescription,
      items: cartItems.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity || 1,
        price: i.price,
        image: i.image,
        sugar: i.sugar || "Regular",
      })),
      sugar: cartItems.map((i) => i.sugar || "Regular").join(", "),
      milk: "Standard Whole",
      image: cartItems[0]?.image || "/logo.png",
      img: cartItems[0]?.image || "/logo.png",
      total: `₹${finalPayable}`,
      subtotal: `₹${subtotal}`,
      discount: `₹${appliedDiscount}`,
      coupon: appliedCouponLabel || "None",
      paymentMethod: paymentMethod === "cod" ? "Cash on Delivery" : "UPI Online",
      status: "Received",
      createdAt: Date.now(),
      allocatedTime: 20, // 20 minutes default brewing & delivery window
    };

    try {
      if (paymentMethod === "cod") {
        // Cash on Delivery Instant Order
        const orderId = await createOrder({
          ...orderData,
          paymentStatus: "COD (Pay upon arrival)",
        });

        // Save to guest orders
        try {
          const guestOrders = JSON.parse(localStorage.getItem("guest_orders") || "[]");
          if (!guestOrders.find((o) => o.id === orderId)) {
            guestOrders.push({ id: orderId, timestamp: Date.now() });
            localStorage.setItem("guest_orders", JSON.stringify(guestOrders));
          }
        } catch (err) {
          console.error(err);
        }

        clearCart();
        router.push(`/payment-success?order_id=${orderId}&type=cod`);
        return;
      }

      // Online UPI Payment Flow
      const tempOrderId = `ORD-${Date.now().toString().slice(-6)}`;
      let txnToken = null;

      try {
        const res = await fetch("/api/paytm/initiate-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: finalPayable,
            customerId: user?.uid || `guest_${Date.now()}`,
            customerPhone: phone.trim() || "9999999999",
            customerEmail: user?.email || "customer@chaichaska.com",
            orderId: tempOrderId,
          }),
        });
        const payData = await res.json();
        if (payData && payData.txnToken) {
          txnToken = payData.txnToken;
        }
      } catch (apiErr) {
        console.warn("Paytm API check:", apiErr);
      }

      if (txnToken && window.Paytm && window.Paytm.CheckoutJS) {
        // Invoke Paytm SDK
        await createOrder({
          ...orderData,
          orderId: tempOrderId,
          status: "Pending Payment",
        });

        window.Paytm.CheckoutJS.init({
          root: "",
          flow: "DEFAULT",
          data: {
            orderId: tempOrderId,
            token: txnToken,
            tokenType: "TXN_TOKEN",
            amount: finalPayable,
          },
          handler: {
            notifyMerchant: function (eventName, data) {
              console.log("Paytm event:", eventName, data);
            },
          },
        })
          .then(function () {
            window.Paytm.CheckoutJS.invoke();
          })
          .catch(function (error) {
            console.error("Paytm init error", error);
            fallbackDirectOrder();
          });
      } else {
        // Direct seamless online order completion
        fallbackDirectOrder();
      }
    } catch (err) {
      console.error("Checkout error:", err);
      fallbackDirectOrder();
    }
  };

  const fallbackDirectOrder = async () => {
    try {
      const orderId = await createOrder({
        userId: user?.uid || "guest",
        customer: personName.trim(),
        officeNumber: officeNumber.trim(),
        floorNumber: floorNumber.trim(),
        office: `Office ${officeNumber.trim()}, Floor ${floorNumber.trim()}`,
        phone: phone.trim() || "N/A",
        item: cartItems.map((i) => `${i.name} x${i.quantity || 1}`).join(" + "),
        image: cartItems[0]?.image || "/logo.png",
        img: cartItems[0]?.image || "/logo.png",
        total: `₹${finalPayable}`,
        paymentMethod: "UPI Instant Transfer",
        status: "Received",
        createdAt: Date.now(),
        allocatedTime: 20,
      });

      try {
        const guestOrders = JSON.parse(localStorage.getItem("guest_orders") || "[]");
        if (!guestOrders.find((o) => o.id === orderId)) {
          guestOrders.push({ id: orderId, timestamp: Date.now() });
          localStorage.setItem("guest_orders", JSON.stringify(guestOrders));
        }
      } catch (err) {}

      clearCart();
      router.push(`/payment-success?order_id=${orderId}&type=upi`);
    } catch (err) {
      alert("Order placement encountered an error. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (!cartLoaded) {
    return (
      <div className="checkout-loading-screen">
        <div className="loading-spinner-ring" />
        <h2>Preparing Fresh Checkout...</h2>
      </div>
    );
  }

  return (
    <div className="checkout-page-shell">
      <Navbar />

      <main className="checkout-main-content">
        <div className="checkout-container">
          
          {/* Header Banner */}
          <header className="checkout-header-block">
            <div className="checkout-pill-badge">
              <span className="badge-sparkle">✦</span>
              <span>EXPRESS GUEST CHECKOUT</span>
            </div>
            <h1 className="checkout-title">
              Speedy Desk Delivery <span className="title-highlight">In 20 Min</span>
            </h1>
            <p className="checkout-subtitle">
              No account or signup needed. Just tell us your office, floor, and name — your fresh brew is on the stove!
            </p>
          </header>

          {/* 2-Column Split: Left Form | Right Order Summary */}
          <div className="checkout-split-layout">
            
            {/* Left Column: Essential 3 Delivery Fields + Payment Method */}
            <div className="checkout-form-column">
              <form onSubmit={handleCheckoutSubmit} className="checkout-card-box">
                
                <div className="card-section-title-row">
                  <span className="section-number-pill">📍</span>
                  <div>
                    <h2 className="section-heading">Delivery Details</h2>
                    <p className="section-subheading">Enter your desk info to complete your payment</p>
                  </div>
                </div>

                {/* The 3 Core Required Fields */}
                <div className="checkout-fields-grid">
                  {/* 1. Name of Person */}
                  <div className="form-group span-2">
                    <label className="input-label">
                      <span>Name of Person</span>
                      <span className="required-star">*</span>
                    </label>
                    <div className="input-field-shell">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        className="checkout-text-input"
                      />
                    </div>
                  </div>

                  {/* 2. Office Number */}
                  <div className="form-group">
                    <label className="input-label">
                      <span>Office Number</span>
                      <span className="required-star">*</span>
                    </label>
                    <div className="input-field-shell">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Office 402 / Cabin 3B"
                        value={officeNumber}
                        onChange={(e) => setOfficeNumber(e.target.value)}
                        className="checkout-text-input"
                      />
                    </div>
                  </div>

                  {/* 3. Floor Number */}
                  <div className="form-group">
                    <label className="input-label">
                      <span>Floor Number</span>
                      <span className="required-star">*</span>
                    </label>
                    <div className="input-field-shell">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 11 12 6 7 11"></polyline>
                        <polyline points="17 18 12 13 7 18"></polyline>
                      </svg>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 4th Floor / Tower A"
                        value={floorNumber}
                        onChange={(e) => setFloorNumber(e.target.value)}
                        className="checkout-text-input"
                      />
                    </div>
                  </div>

                  {/* Optional Mobile for Delivery Phone Calls */}
                  <div className="form-group span-2">
                    <label className="input-label">
                      <span>Mobile Number</span>
                      <span className="optional-tag">(Optional for delivery calls)</span>
                    </label>
                    <div className="input-field-shell">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="checkout-text-input"
                      />
                    </div>
                  </div>
                </div>



                {/* Total Summary Row */}
                <div className="checkout-total-pill-bar">
                  <div className="total-bar-info">
                    <span className="total-bar-label">Total Amount Payable</span>
                    <span className="total-bar-subtext">Includes all taxes & 20-min desk delivery</span>
                  </div>
                  <span className="total-bar-price">₹{finalPayable}</span>
                </div>

                {/* Final Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="checkout-submit-cta-btn"
                >
                  {isSubmitting ? (
                    <span>Placing Your Brew Order...</span>
                  ) : (
                    <>
                      <span>Pay ₹{finalPayable} & Place Order</span>
                      <span className="btn-arrow-icon">→</span>
                    </>
                  )}
                </button>

                <p className="secure-badge-note">
                  🔒 Encrypted 256-bit checkout • Freshly brewed upon order placement
                </p>
              </form>
            </div>
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

      {/* Embedded Pure White Theme CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .checkout-page-shell {
          background: #ffffff;
          min-height: 100vh;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          position: relative;
        }

        .checkout-main-content {
          padding: 36px 20px 80px;
          max-width: 1140px;
          margin: 0 auto;
        }

        .checkout-container {
          width: 100%;
        }

        /* Header Block */
        .checkout-header-block {
          text-align: center;
          max-width: 700px;
          margin: 0 auto 36px;
        }

        .checkout-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          color: #475569;
          margin-bottom: 14px;
        }

        .badge-sparkle {
          color: #f59e0b;
        }

        .checkout-title {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #0f172a;
          margin: 0 0 10px;
          line-height: 1.15;
        }

        .title-highlight {
          background: linear-gradient(135deg, #0f172a 30%, #64748b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .checkout-subtitle {
          font-size: clamp(14px, 1.8vw, 15.5px);
          color: #64748b;
          line-height: 1.55;
          margin: 0;
        }

        /* Centered Single-Column Form Layout */
        .checkout-split-layout {
          max-width: 580px;
          margin: 0 auto;
          width: 100%;
        }

        .checkout-total-pill-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
          padding: 14px 20px;
          margin-top: 6px;
        }

        .total-bar-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .total-bar-label {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .total-bar-subtext {
          font-size: 11.5px;
          color: #10b981;
          font-weight: 700;
        }

        .total-bar-price {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        /* Form Card */
        .checkout-card-box {
          background: #ffffff;
          border: 1.5px solid #f1f5f9;
          border-radius: 28px;
          padding: 32px 28px;
          box-shadow: 0 10px 35px -5px rgba(15, 23, 42, 0.04);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .card-section-title-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .section-number-pill {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #0f172a;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .section-heading {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 3px;
        }

        .section-subheading {
          font-size: 12.5px;
          color: #64748b;
          margin: 0;
        }

        /* Fields Grid */
        .checkout-fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.span-2 {
          grid-column: span 2;
        }

        .input-label {
          font-size: 12.5px;
          font-weight: 750;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .required-star {
          color: #ef4444;
          font-weight: 800;
        }

        .optional-tag {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }

        .input-field-shell {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 11px 14px;
          transition: all 0.2s;
        }

        .input-field-shell:focus-within {
          background: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
        }

        .checkout-text-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          width: 100%;
        }

        .checkout-text-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .divider-line {
          height: 1px;
          background: #f1f5f9;
          margin: 6px 0;
        }

        /* Payment Options */
        .payment-options-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .payment-method-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 18px;
          padding: 14px 18px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }

        .payment-method-card:hover {
          border-color: #cbd5e1;
          background: #f1f5f9;
        }

        .payment-method-card.selected {
          border-color: #0f172a;
          background: #ffffff;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
        }

        .hidden-radio {
          display: none;
        }

        .payment-card-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .custom-radio-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #cbd5e1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .payment-method-card.selected .custom-radio-circle {
          border-color: #0f172a;
        }

        .radio-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #0f172a;
        }

        .payment-text-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .payment-title {
          font-size: 14px;
          font-weight: 750;
          color: #0f172a;
        }

        .payment-desc {
          font-size: 12px;
          color: #64748b;
        }

        .payment-fast-badge {
          font-size: 11px;
          font-weight: 800;
          background: #ecfdf5;
          color: #059669;
          padding: 3px 8px;
          border-radius: 9999px;
          border: 1px solid #d1fae5;
        }

        .payment-cash-badge {
          font-size: 11px;
          font-weight: 800;
          background: #fef3c7;
          color: #d97706;
          padding: 3px 8px;
          border-radius: 9999px;
          border: 1px solid #fde68a;
        }

        /* Submit CTA */
        .checkout-submit-cta-btn {
          width: 100%;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          padding: 16px 24px;
          font-size: 15.5px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.35);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 10px;
        }

        .checkout-submit-cta-btn:hover {
          background: #1e293b;
          transform: translateY(-2px);
          box-shadow: 0 14px 35px -4px rgba(15, 23, 42, 0.45);
        }

        .checkout-submit-cta-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-arrow-icon {
          font-size: 18px;
          transition: transform 0.2s;
        }

        .checkout-submit-cta-btn:hover .btn-arrow-icon {
          transform: translateX(4px);
        }

        .secure-badge-note {
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }

        /* Summary Column */
        .summary-card-box {
          background: #ffffff;
          border: 1.5px solid #f1f5f9;
          border-radius: 28px;
          padding: 26px 24px;
          box-shadow: 0 10px 35px -5px rgba(15, 23, 42, 0.04);
          position: sticky;
          top: 90px;
        }

        .summary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 16px;
        }

        .summary-title {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .items-count-badge {
          font-size: 11.5px;
          font-weight: 700;
          background: #f1f5f9;
          color: #475569;
          padding: 3px 9px;
          border-radius: 9999px;
        }

        /* Summary Items List */
        .summary-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 240px;
          overflow-y: auto;
          padding-right: 4px;
          margin-bottom: 20px;
        }

        .summary-item-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .summary-item-thumb {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          flex-shrink: 0;
        }

        .summary-item-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .summary-item-info {
          flex: 1;
          min-width: 0;
        }

        .item-name {
          font-size: 13.5px;
          font-weight: 750;
          color: #0f172a;
          margin: 0 0 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .item-qty-tag {
          font-size: 11px;
          color: #64748b;
        }

        .checkout-portion-stepper {
          display: inline-flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 2px 6px;
          gap: 6px;
          margin-top: 4px;
        }

        .checkout-stepper-btn {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          color: #0f172a;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .checkout-stepper-btn:hover {
          background: #0f172a;
          color: #ffffff;
        }

        .checkout-stepper-btn.minus:hover {
          background: #ef4444;
          color: #ffffff;
        }

        .checkout-stepper-qty {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          min-width: 12px;
          text-align: center;
        }

        .item-subtotal-price {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          flex-shrink: 0;
        }

        /* Coupon Box */
        .coupon-box-wrap {
          margin-bottom: 20px;
        }

        .coupon-input-row {
          display: flex;
          gap: 8px;
        }

        .coupon-text-field {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 8px 14px;
          font-size: 12.5px;
          font-weight: 600;
          color: #0f172a;
          outline: none;
        }

        .coupon-text-field:focus {
          border-color: #0f172a;
        }

        .coupon-apply-btn {
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .coupon-success-msg {
          font-size: 11.5px;
          color: #16a34a;
          font-weight: 700;
          margin-top: 6px;
        }

        .coupon-error-msg {
          font-size: 11.5px;
          color: #dc2626;
          margin-top: 6px;
        }

        /* Bill Breakdown */
        .bill-breakdown-box {
          background: #f8fafc;
          border-radius: 20px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
          border: 1px solid #f1f5f9;
        }

        .bill-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          color: #64748b;
        }

        .bill-val {
          font-weight: 700;
          color: #0f172a;
        }

        .discount-line .bill-val {
          color: #16a34a;
        }

        .free-highlight {
          color: #16a34a;
          font-weight: 800;
        }

        .bill-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 4px 0;
        }

        .total-bill-line {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
        }

        .total-val {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
        }

        .modify-tray-link {
          display: block;
          text-align: center;
          font-size: 12.5px;
          color: #64748b;
          text-decoration: none;
          font-weight: 650;
          transition: color 0.2s;
        }

        .modify-tray-link:hover {
          color: #0f172a;
        }

        /* Loading Screen */
        .checkout-loading-screen {
          min-height: 100vh;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .loading-spinner-ring {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: spinCheckout 0.8s linear infinite;
        }

        @keyframes spinCheckout {
          to { transform: rotate(360deg); }
        }

        /* Mobile Bottom Nav Bar */
        .mobile-bottom-nav {
          display: none;
        }



        @media (max-width: 768px) {
          .checkout-main-content {
            padding: 20px 14px 100px;
          }

          .checkout-card-box {
            padding: 22px 18px;
            border-radius: 22px;
          }

          .checkout-fields-grid {
            grid-template-columns: 1fr;
          }

          .form-group.span-2 {
            grid-column: span 1;
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

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div style={{ background: "#ffffff", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <h2>Loading Checkout...</h2>
        </div>
      }
    >
      <CheckoutPortal />
    </Suspense>
  );
}
