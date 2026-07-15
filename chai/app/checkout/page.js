"use client";

import { useState, useEffect, Suspense } from "react";
import { getProductById, getAddons, getCoupons, createOrder } from "@/lib/firestore";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

function CheckoutPortal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { cartItems, getCartTotal, clearCart, isLoaded: cartLoaded } = useCart();
  const [checkoutStep, setCheckoutStep] = useState("shipping");
  const [orderRef, setOrderRef] = useState("");

  useEffect(() => {
    if (cartLoaded && cartItems.length === 0 && checkoutStep !== "thankyou") {
      router.push("/");
    }
  }, [cartItems, cartLoaded, checkoutStep, router]);

  // Auth guard: redirect to login if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/checkout");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const [dbCoupons, setDbCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // State (moved up)
  useEffect(() => {
    async function loadData() {
      try {
        const c = await getCoupons();
        setDbCoupons(c);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Address Step form
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [locLoading, setLocLoading] = useState(false);

  // Coupons
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0); // in Rupees
  const [appliedCodeLabel, setAppliedCodeLabel] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("upi"); // "upi" | "card" | "wallet"

  // Pre-fill from logged-in user profile
  useEffect(() => {
    if (user) {
      setFullname(profile?.name || user.displayName || "");
      setPhone(profile?.phone || "");
      setAddress(profile?.floor || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const handleUseLocation = () => {
    setLocLoading(true);
    setTimeout(() => {
      setFullname(profile?.name || user?.displayName || "Royal Tea Aficionado");
      setPhone(profile?.phone || "+91 98765 43210");
      setPincode("302001");
      setAddress(profile?.floor ? `${profile.floor}, Jaipur, Rajasthan` : "Palace Square Vista, Block 4-C, Jaipur, Rajasthan, India");
      setLocLoading(false);
    }, 1500);
  };

  const handleApplyCoupon = (code) => {
    const coupon = dbCoupons.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
    if (coupon) {
      if (coupon.type === "flat") {
        setAppliedDiscount(coupon.value);
        setAppliedCodeLabel(`${coupon.code} (₹${coupon.value} Off)`);
        setCouponCode(coupon.code);
      } else if (coupon.type === "percent") {
        const sub = getCartTotal();
        const disc = Math.round(sub * (coupon.value / 100));
        setAppliedDiscount(disc);
        setAppliedCodeLabel(`${coupon.code} (${coupon.value}% Off - Save ₹${disc})`);
        setCouponCode(coupon.code);
      }
    } else {
      alert("Invalid or inactive coupon code.");
    }
  };

  const toggleAddonOnCheckout = (addon) => {
    setSelectedAddons((prev) =>
      prev.find((a) => a.id === addon.id)
        ? prev.filter((a) => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  if (loading || !cartLoaded) return <div style={{ background: "#fcfaf7", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><h2>Loading Checkout...</h2></div>;
  if (cartItems.length === 0 && checkoutStep !== "thankyou") return null;

  // Cost calculations
  const subtotal = getCartTotal();
  const deliveryCharge = subtotal > 500 ? 0 : 50;
  const finalPayable = Math.max(0, subtotal - appliedDiscount + deliveryCharge);

  const handlePlaceOrder = () => {
    if (checkoutStep === "shipping") {
      if (!fullname || !address || !phone) {
        alert("Please complete the address details to continue.");
        return;
      }
      setCheckoutStep("payment");
      return;
    }

    if (checkoutStep === "payment") {
      setCheckoutStep("processing");
      const orderData = {
        userId: user?.uid || "guest",
        customer: fullname,
        phone,
        pincode,
        office: address,
        item: cartItems.map(i => `${i.name} x${i.quantity}`).join(" + "),
        sugar: cartItems.map(i => i.sugar).join(", ") || "Normal Sugar",
        milk: "Whole Milk",
        img: cartItems[0]?.image || "/chai-ingredients.png",
        priority: "Normal",
        total: `₹${finalPayable}`,
        addons: cartItems.map(i => i.addons).join(", "),
        coupon: couponCode || "None"
      };
      
      createOrder(orderData).then((id) => {
        setOrderRef(id);
        clearCart();
        setCheckoutStep("thankyou");
      }).catch(err => {
        console.error(err);
        alert("Order placement failed.");
        setCheckoutStep("payment");
      });
    }
  };

  return (
    <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", overflowX: "hidden" }}>
      <Navbar />

      <div className="checkout-page-container">
        
        {checkoutStep !== "thankyou" && (
          <section className="checkout-title-row">
            <h1>Secure Checkout</h1>
            <p>Review details, add delivery instructions, and claim exclusive loyalty discounts.</p>
          </section>
        )}

        {checkoutStep !== "thankyou" ? (
          <div className="checkout-grid-layout">
            
            {/* LEFT COLUMN: INTERACTIVE CHECKOUT FORM */}
            <div className="checkout-left-column">
              
              {/* STEP NAVIGATION STATUS BAR */}
              <div className="steps-status-bar">
                <div className={`step-indicator ${checkoutStep === "shipping" ? "active" : "completed"}`}>
                  <span className="step-num">1</span>
                  <span>Delivery Address</span>
                </div>
                <div className={`step-connector ${checkoutStep === "payment" ? "completed" : ""}`} />
                <div className={`step-indicator ${checkoutStep === "payment" ? "active" : ""}`}>
                  <span className="step-num">2</span>
                  <span>Payment Method</span>
                </div>
              </div>

              {/* STEP 1: SHIPPING ADDRESS */}
              {checkoutStep === "shipping" && (
                <div className="checkout-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 className="card-title">Delivery Destination</h3>
                    <button type="button" onClick={handleUseLocation} className="btn-use-location" disabled={locLoading}>
                      {locLoading ? "Detecting..." : "📍 Use Current Location"}
                    </button>
                  </div>

                  <div className="address-inputs-grid">
                    <div className="form-group">
                      <label>Receiver Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                        className="checkout-text-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Contact Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="checkout-text-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Pincode / Postal Code</label>
                      <input
                        type="text"
                        placeholder="302001"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        className="checkout-text-input"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Street Address, Apartment, Landmark</label>
                      <textarea
                        rows="3"
                        placeholder="Suite #, street details, nearby landmark..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="checkout-text-input area"
                      />
                    </div>
                  </div>

                  <button onClick={handlePlaceOrder} className="btn-continue-checkout">
                    Proceed to Payment Options
                  </button>
                </div>
              )}

              {/* STEP 2: PAYMENT METHOD */}
              {checkoutStep === "payment" && (
                <div className="checkout-card">
                  <h3 className="card-title" style={{ marginBottom: "20px" }}>Choose Payment Method</h3>
                  
                  <div className="payment-options-grid">
                    <label className={`pay-choice-box ${paymentMethod === "upi" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="pay"
                        value="upi"
                        checked={paymentMethod === "upi"}
                        onChange={() => setPaymentMethod("upi")}
                      />
                      <div>
                        <strong>UPI Instant Pay</strong>
                        <span className="pay-desc">Pay via Google Pay, PhonePe, or Paytm</span>
                      </div>
                    </label>

                    <label className={`pay-choice-box ${paymentMethod === "card" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="pay"
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={() => setPaymentMethod("card")}
                      />
                      <div>
                        <strong>Credit / Debit Card</strong>
                        <span className="pay-desc">Visa, MasterCard, RuPay accepted</span>
                      </div>
                    </label>

                    <label className={`pay-choice-box ${paymentMethod === "wallet" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="pay"
                        value="wallet"
                        checked={paymentMethod === "wallet"}
                        onChange={() => setPaymentMethod("wallet")}
                      />
                      <div>
                        <strong>Loyalty Coin Wallet</strong>
                        <span className="pay-desc">Redeem from active balance (550 Coins)</span>
                      </div>
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                    <button onClick={() => setCheckoutStep("shipping")} className="btn-continue-checkout back-btn">
                      Back
                    </button>
                    <button onClick={handlePlaceOrder} className="btn-continue-checkout">
                      Pay & Confirm Order (₹{finalPayable})
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: PROCESSING SCREEN */}
              {checkoutStep === "processing" && (
                <div className="checkout-card loader-card" style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div className="checkout-spinner" />
                  <h3 style={{ fontSize: "20px", fontWeight: 900, marginTop: "24px" }}>Configuring Spice Distillation...</h3>
                  <p style={{ color: "#666", fontSize: "13.5px", marginTop: "8px" }}>
                    Validating secure checkout nodes and forwarding order mapping coordinates to the brewery terminal.
                  </p>
                </div>
              )}

            </div>

            {/* RIGHT COLUMN: VIDEO, ADD-ONS & SUMMARY */}
            <div className="checkout-right-column">
              
              {/* VIDEO MINI CARD */}
              <div className="checkout-video-card">
                <video
                  src="/sub-video.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="checkout-video-loop"
                />
                <div className="checkout-video-overlay" />
                <div className="checkout-video-text">
                  <h4>Freshly Distilled Spices</h4>
                  <p>Hand-pounded cardamom and ginger, brewed to order.</p>
                </div>
              </div>



              {/* COUPONS SECTION */}
              <div className="checkout-card compact">
                <h4 style={{ fontSize: "14px", fontWeight: 800, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Apply Coupon Code
                </h4>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <input
                    type="text"
                    placeholder="Enter Coupon (e.g. CHAICLUB)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="coupon-text-field"
                  />
                  <button type="button" onClick={() => handleApplyCoupon(couponCode)} className="btn-coupon-apply">
                    Apply
                  </button>
                </div>
                
                <div className="coupon-pills-row">
                  <button onClick={() => handleApplyCoupon("CHAICLUB")} className="coupon-pill">
                    <strong>CHAICLUB</strong> (Save ₹50)
                  </button>
                  <button onClick={() => handleApplyCoupon("FIRSTCHAI")} className="coupon-pill">
                    <strong>FIRSTCHAI</strong> (20% Off)
                  </button>
                </div>

                {appliedDiscount > 0 && (
                  <div className="success-coupon-label">
                    <span>✓ Applied code: {appliedCodeLabel}</span>
                  </div>
                )}
              </div>

              {/* PRICING BREAKDOWN CARD */}
              <div className="checkout-card pricing-breakdown">
                <h4 style={{ fontSize: "15px", fontWeight: 800, marginBottom: "14px" }}>Order Cost Summary</h4>
                
                <div className="breakdown-list">
                  {cartItems.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: item.addonsList?.length > 0 ? "14px" : "8px" }}>
                      <div className="breakdown-row" style={{ paddingBottom: item.addonsList?.length > 0 ? "4px" : "0" }}>
                        <span>{item.name} (x{item.quantity})</span>
                        <span>{item.basePrice ? `₹${item.basePrice * item.quantity}` : `₹${parseInt(String(item.price).replace(/[^0-9]/g, "")) * item.quantity}`}</span>
                      </div>
                      {item.addonsList && item.addonsList.length > 0 && item.addonsList.map((a, i) => (
                        <div key={i} className="breakdown-row" style={{ paddingBottom: "2px", color: "#8a583c", fontSize: "12.5px" }}>
                          <span>+ {a.name}</span>
                          <span>₹{a.priceVal * item.quantity}</span>
                        </div>
                      ))}
                      {item.addonsList && item.addonsList.length > 0 && (
                        <div className="breakdown-row" style={{ paddingBottom: "2px", paddingTop: "4px", borderTop: "1px dashed #eee", marginTop: "4px", fontWeight: "700", fontSize: "13px", color: "#2c1b0d" }}>
                          <span>Item Total</span>
                          <span>₹{parseInt(String(item.price).replace(/[^0-9]/g, "")) * item.quantity}</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {appliedDiscount > 0 && (
                    <div className="breakdown-row discount">
                      <span>Promo Coupon Discount</span>
                      <span>- ₹{appliedDiscount}</span>
                    </div>
                  )}

                  <div className="breakdown-row">
                    <span>Delivery Charge</span>
                    <span>{deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}</span>
                  </div>

                  <div className="breakdown-row total">
                    <span>Amount Payable</span>
                    <span>₹{finalPayable}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* STEP 4: THANK YOU ORDER SUCCESS PAGE */
          <div className="thank-you-layout">
            <div className="thank-you-card">
              <div className="success-badge-circle">✓</div>
              <h2 className="success-title">Order Placed successfully!</h2>
              <p className="success-message">
                Your order is confirmed and heading to the brewing counter. We've dispatched reference details to your registered number.
              </p>

              <div className="receipt-box">
                <div className="receipt-row">
                  <span>Order Reference ID:</span>
                  <strong>{orderRef}</strong>
                </div>
                <div className="receipt-row">
                  <span>Items:</span>
                  <strong>
                    {cartItems.map((item, idx) => (
                      <div key={idx} style={{ marginBottom: item.addonsList?.length > 0 ? "8px" : "4px" }}>
                        <div>{item.quantity}x {item.name}</div>
                        {item.addonsList && item.addonsList.length > 0 ? (
                          item.addonsList.map((a, i) => (
                            <div key={i} style={{ fontSize: "11px", color: "#666", fontWeight: "normal" }}>
                              + {a.name} (₹{a.priceVal})
                            </div>
                          ))
                        ) : item.addons ? (
                          <div style={{ fontSize: "11px", color: "#666", fontWeight: "normal" }}>
                            + {item.addons}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </strong>
                </div>
                <div className="receipt-row">
                  <span>Total Paid amount:</span>
                  <strong style={{ color: "#8a583c" }}>₹{finalPayable}</strong>
                </div>
                <div className="receipt-row">
                  <span>Estimated Delivery Time:</span>
                  <strong>18-24 Minutes 🚀</strong>
                </div>
                <div className="receipt-row" style={{ borderTop: "1px dashed rgba(0,0,0,0.08)", paddingTop: "12px", marginTop: "12px" }}>
                  <span>Delivery Address:</span>
                  <span style={{ fontSize: "12px", textAlign: "right", maxWidth: "220px", color: "#555" }}>{address}</span>
                </div>
              </div>

              {/* Mock Delivery Map Tracker visual */}
              <div className="mock-tracker-visual">
                <div className="tracker-line">
                  <div className="tracker-progress" />
                  <span className="dot start">🏠</span>
                  <span className="dot current">🚴</span>
                  <span className="dot destination">📍</span>
                </div>
                <div className="tracker-labels">
                  <span>Brewery</span>
                  <span>Chai Rider</span>
                  <span>You</span>
                </div>
              </div>

              <Link href="/" className="btn-continue-checkout" style={{ maxWidth: "260px", margin: "0 auto", display: "block", textDecoration: "none", textAlign: "center" }}>
                Return to Home
              </Link>
            </div>
          </div>
        )}

      </div>

      <Footer />

      {/* Styled JSX */}
      <style>{`
        .checkout-page-container {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
          padding: 120px 24px 60px;
          box-sizing: border-box;
        }

        .checkout-title-row {
          margin-bottom: 30px;
        }

        .checkout-title-row h1 {
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 900;
          color: #2c1b0d;
          margin-bottom: 8px;
        }

        .checkout-title-row p {
          font-size: 14.5px;
          color: #666;
        }

        /* 2-Column layout */
        .checkout-grid-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 30px;
          align-items: start;
        }

        .checkout-left-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .checkout-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 30px;
          border: 1px solid rgba(0,0,0,0.04);
          box-shadow: 0 4px 30px rgba(0,0,0,0.01);
        }

        .checkout-card.compact {
          padding: 20px;
        }

        .card-title {
          font-size: 18px;
          font-weight: 850;
          color: #2c1b0d;
        }

        /* Address inputs form */
        .address-inputs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 12.5px;
          font-weight: 700;
          color: #555;
        }

        .checkout-text-input {
          border: 1.5px solid rgba(44, 27, 13, 0.1);
          border-radius: 8px;
          padding: 11px 14px;
          font-size: 13.5px;
          background: #fbf9f6;
          color: #2c1b0d;
          outline: none;
        }

        .checkout-text-input.area {
          resize: none;
        }

        .checkout-text-input:focus {
          border-color: #2c1b0d;
        }

        .btn-use-location {
          background: rgba(138, 88, 60, 0.08);
          border: 1px solid rgba(138, 88, 60, 0.2);
          color: #8a583c;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-use-location:hover {
          background: rgba(138, 88, 60, 0.15);
        }

        .btn-continue-checkout {
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          padding: 14px 24px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-continue-checkout:hover {
          background: #111;
        }

        .btn-continue-checkout.back-btn {
          background: #fbf9f6;
          border: 1.5px solid rgba(0,0,0,0.1);
          color: #2c1b0d;
        }

        /* Step navigation status bar */
        .steps-status-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #ffffff;
          padding: 16px 24px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.03);
        }

        .step-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 700;
          color: #888;
        }

        .step-indicator.active {
          color: #2c1b0d;
        }

        .step-indicator.completed {
          color: #27ae60;
        }

        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ddd;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .step-indicator.active .step-num {
          background: #2c1b0d;
        }

        .step-indicator.completed .step-num {
          background: #27ae60;
        }

        .step-connector {
          flex-grow: 1;
          height: 2px;
          background: #eee;
        }

        .step-connector.completed {
          background: #27ae60;
        }

        /* Payment choices */
        .payment-options-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pay-choice-box {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #fbf9f6;
          border: 1.5px solid rgba(0,0,0,0.05);
          padding: 14px 20px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .pay-choice-box.selected {
          border-color: #8a583c;
          background: rgba(138, 88, 60, 0.02);
        }

        .pay-choice-box strong {
          display: block;
          font-size: 13.5px;
        }

        .pay-desc {
          font-size: 11px;
          color: #777;
          display: block;
          margin-top: 2px;
        }

        /* Right column details */
        .checkout-right-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .checkout-video-card {
          position: relative;
          aspect-ratio: 1.8 / 1;
          border-radius: 20px;
          overflow: hidden;
          background: #000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }

        .checkout-video-loop {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          opacity: 0.85;
        }

        .checkout-video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%);
          z-index: 1;
        }

        .checkout-video-text {
          position: absolute;
          bottom: 16px;
          left: 20px;
          right: 20px;
          z-index: 2;
          color: #ffffff;
        }

        .checkout-video-text h4 {
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .checkout-video-text p {
          font-size: 11.5px;
          color: rgba(255,255,255,0.85);
          line-height: 1.4;
        }

        /* Add-ons List */
        .checkout-addons-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .checkout-addon-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fbf9f6;
          border: 1.5px solid rgba(0,0,0,0.05);
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .checkout-addon-pill.selected {
          border-color: #8a583c;
          background: rgba(138, 88, 60, 0.02);
        }

        .check-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid #bbb;
        }

        .checkout-addon-pill.selected .check-dot {
          border-color: #8a583c;
          background: #8a583c;
        }

        /* Coupons styling */
        .coupon-text-field {
          flex-grow: 1;
          border: 1.5px solid rgba(44, 27, 13, 0.1);
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 12.5px;
          background: #fbf9f6;
          outline: none;
        }

        .coupon-text-field:focus {
          border-color: #2c1b0d;
        }

        .btn-coupon-apply {
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .coupon-pills-row {
          display: flex;
          gap: 8px;
        }

        .coupon-pill {
          background: #fbf9f6;
          border: 1px dashed rgba(44,27,13,0.2);
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 11.5px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .coupon-pill:hover {
          background: rgba(138,88,60,0.05);
        }

        .success-coupon-label {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          border-radius: 6px;
          padding: 8px;
          font-size: 12px;
          font-weight: 700;
          margin-top: 10px;
        }

        /* Pricing breakdown list */
        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .breakdown-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
        }

        .breakdown-row.discount {
          color: #27ae60;
          font-weight: 600;
        }

        .breakdown-row.total {
          font-size: 16px;
          font-weight: 900;
          color: #2c1b0d;
          border-top: 1px dashed rgba(0,0,0,0.08);
          padding-top: 12px;
          margin-top: 6px;
        }

        /* Loading spinner */
        .checkout-spinner {
          border: 4px solid rgba(44, 27, 13, 0.1);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border-left-color: #2c1b0d;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Thank you layout styles */
        .thank-you-layout {
          max-width: 600px;
          margin: 0 auto;
        }

        .thank-you-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 40px;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 10px 40px rgba(0,0,0,0.03);
          text-align: center;
        }

        .success-badge-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: bold;
          margin: 0 auto 20px;
        }

        .success-title {
          font-size: 24px;
          font-weight: 900;
          color: #2c1b0d;
          margin-bottom: 8px;
        }

        .success-message {
          font-size: 14px;
          color: #666;
          line-height: 1.5;
          margin-bottom: 30px;
        }

        .receipt-box {
          background: #fbf9f6;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 30px;
          text-align: left;
        }

        .receipt-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
          margin-bottom: 10px;
        }

        .receipt-row:last-child {
          margin-bottom: 0;
        }

        /* Mock Map Delivery Progress Tracker */
        .mock-tracker-visual {
          border: 1.5px solid rgba(0,0,0,0.05);
          border-radius: 16px;
          padding: 20px 16px;
          margin-bottom: 30px;
          background: #ffffff;
        }

        .tracker-line {
          position: relative;
          height: 4px;
          background: #eee;
          margin: 20px 10px;
        }

        .tracker-progress {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 50%;
          background: #8a583c;
        }

        .dot {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 18px;
        }

        .dot.start { left: 0; }
        .dot.current { left: 50%; }
        .dot.destination { left: 100%; }

        .tracker-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          color: #888;
        }

        @media (max-width: 990px) {
          .checkout-grid-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 550px) {
          .address-inputs-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ padding: "100px", textAlign: "center" }}>Loading Checkout Details...</div>}>
      <CheckoutPortal />
    </Suspense>
  );
}
