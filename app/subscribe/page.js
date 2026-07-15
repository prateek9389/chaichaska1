"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { addSubscription } from "@/lib/firestore";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";

function SubscriptionPortal() {
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const productId = searchParams.get("productId") || "1";
  const sugarParam = searchParams.get("sugar") || "with";
  const addonsParam = searchParams.get("addons") || "";

  const addonsList = [
    { id: "a1", name: "Handmade Chai Biscuits", priceNum: 59 },
    { id: "a2", name: "Butter Rusk Toasts", priceNum: 79 },
    { id: "a3", name: "Classic Elaichi Rusk", priceNum: 69 },
    { id: "a4", name: "Almond Cookies", priceNum: 89 },
  ];

  const selectedAddonIds = addonsParam ? addonsParam.split(",") : [];
  const selectedAddons = addonsList.filter(a => selectedAddonIds.includes(a.id));
  const addonsTotal = selectedAddons.reduce((acc, a) => acc + a.priceNum, 0);

  const teas = [
    {
      id: 1,
      name: "Classic Masala Chai",
      desc: "Robust Assam black tea hand-blended with ginger, cardamom, cinnamon, and cloves.",
      price: "₹149",
      priceNum: 149,
      image: "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
    },
    {
      id: 2,
      name: "Cardamom (Elaichi) Chai",
      desc: "Rich, fragrant infusion of crushed green cardamom pods and premium CTC granules.",
      price: "₹169",
      priceNum: 169,
      image: "https://i.pinimg.com/1200x/5c/b8/8a/5cb88a02e013987379378009ba8d7eb2.jpg",
    },
    {
      id: 3,
      name: "Ginger (Adrak) Chai",
      desc: "Invigorating immunity booster brewed with fresh, spicy grated ginger root.",
      price: "₹169",
      priceNum: 169,
      image: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg",
    },
    {
      id: 4,
      name: "Saffron (Kesar) Royal Chai",
      desc: "Luxurious royal golden blend loaded with Kashmiri Kesar strands and cardamom.",
      price: "₹249",
      priceNum: 249,
      image: "https://i.pinimg.com/736x/21/74/32/2174329b8ef1603c1cbc68bd9ef5865a.jpg",
    },
    {
      id: 5,
      name: "Tandoori Smoky Chai",
      desc: "Unique clay-pot baked malty tea with natural mineral qualities and a robust smoky note.",
      price: "₹199",
      priceNum: 199,
      image: "https://i.pinimg.com/736x/f4/bf/80/f4bf80502363c42324e7126f07b612ad.jpg",
    },
    {
      id: 6,
      name: "Kashmiri Kahwa",
      desc: "Exquisite green tea brewed with whole saffron strands, cinnamon, and raw almond slivers.",
      price: "₹219",
      priceNum: 219,
      image: "https://i.pinimg.com/736x/c4/a8/cc/c4a8ccde9a67e5f24e2be4d0621f4186.jpg",
    },
  ];

  const product = teas.find((t) => String(t.id) === String(productId)) || teas[0];

  // Delivery Session Selection
  const [frequency, setFrequency] = useState("morning"); // "morning" | "evening" | "custom"
  const priceMultiplier = frequency === "morning" ? 0.75 : frequency === "evening" ? 0.85 : 0.9;
  const unitPrice = product ? Math.round(product.priceNum * priceMultiplier) : 0;

  const [customTime, setCustomTime] = useState("09:00");
  const [address, setAddress] = useState("");

  // Invoice & Payment Modal Wizard State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState("invoice"); // "invoice" | "paying" | "success"


  const handleStartSubscription = () => {
    setPaymentStep("invoice");
    setIsPaymentModalOpen(true);
  };

  // Cost calculations
  const totalDeliveries = frequency === "morning" ? 30 : frequency === "evening" ? 12 : 8;
  const itemsSubtotal = (unitPrice * totalDeliveries) + addonsTotal;

  const handleTriggerPayment = async () => {
    setPaymentStep("paying");
    
    // Build subscription object
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Starts tomorrow
    const endDate = new Date(startDate);
    const durationDays = totalDeliveries;
    endDate.setDate(endDate.getDate() + durationDays);

    const subData = {
      customer: profile?.name || user?.displayName || "Guest User",
      office: address || "Tower A, Floor 1",
      item: product.name,
      items: `${product.name} (${sugarParam} sugar) ${addonsParam ? " + " + addonsParam : ""}`,
      total: itemsSubtotal + Math.round(itemsSubtotal * 0.05),
      cost: itemsSubtotal + Math.round(itemsSubtotal * 0.05),
      price: itemsSubtotal + Math.round(itemsSubtotal * 0.05),
      timeSlot: frequency === "custom" ? customTime : frequency === "morning" ? "09:00" : "16:00",
      frequency: frequency.toUpperCase(),
      startDate: startDate.toLocaleDateString('en-GB'),
      endDateIso: endDate.toISOString(),
      endDate: endDate.toLocaleDateString('en-GB'),
      status: "Active"
    };

    try {
      await addSubscription(subData);
    } catch (err) {
      console.error("Error saving subscription:", err);
    }

    setPaymentStep("success");
  };

  const taxes = Math.round(itemsSubtotal * 0.05);
  const finalTotal = itemsSubtotal + taxes;

  return (
    <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", overflowX: "hidden" }}>
      <Navbar />

      <div className="subscribe-container">
        
        {/* Header Summary section */}
        <section className="sub-header-summary">
          <span className="badge-promo">EXCLUSIVE LOYALTY CLUB</span>
          <h1>Customize Your Daily Brew Cycle</h1>
          <p>Configure your delivery windows, specify milk/sugar preferences, and let us handle your daily aromatic wake-up call.</p>
        </section>

        {/* 2-Column Split: Video Showcases (Left) | Subscription Wizard Form (Right) */}
        <div className="sub-portal-layout">
          
          {/* LEFT SIDEBAR: Aesthetic Video loop and Tea Info Cards */}
          <div className="sub-visuals-panel">
            
            {/* Visual Video Card 1: Farm Fresh Harvesting */}
            <div className="visual-video-card">
              <video
                src="/farm-fresh.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="visual-loop"
              />
              <div className="video-overlay-tint" />
              <div className="video-card-details">
                <h4>Farm Fresh Harvest</h4>
                <p>Looped raw footage from our Nilgiri and Assam organic tea farms.</p>
              </div>
            </div>

            {/* Selected Tea Product Card details */}
            <div className="sub-selected-tea-card">
              <img src={product.image} alt={product.name} className="selected-tea-thumbnail" />
              <div>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#8a583c", textTransform: "uppercase" }}>
                  Selected Tea Blend
                </span>
                <h3 style={{ fontSize: "18px", margin: "4px 0" }}>{product.name}</h3>
                <p style={{ fontSize: "12.5px", color: "#666", lineHeight: 1.4 }}>{product.desc}</p>
              </div>
            </div>

            {/* Visual Video Card 2: Hot Brewing Steam */}
            <div className="visual-video-card">
              <video
                src="/sub-video.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="visual-loop"
              />
              <div className="video-overlay-tint" />
              <div className="video-card-details">
                <h4>Crafted At Home</h4>
                <p>Pure steam-distilled spices blended with thick fresh cream.</p>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Subscription Configuration Options */}
          <div className="sub-config-panel">
            
            {/* STEP 1: SELECT FREQUENCY */}
            <div className="form-card">
              <span className="step-label">Step 1</span>
              <h3 className="form-section-title">Delivery Frequency</h3>
              
              <div className="plan-choices">
                <div
                  className={`plan-card ${frequency === "morning" ? "selected" : ""}`}
                  onClick={() => setFrequency("morning")}
                >
                  <span className="save-badge">SAVE 25%</span>
                  <div className="plan-card-icon">🌅</div>
                  <h4>Morning</h4>
                  <p>Fresh brew delivered at your doorstep every morning.</p>
                  <span className="plan-pricing">₹{Math.round(product.priceNum * 0.75)}/cup</span>
                </div>

                <div
                  className={`plan-card ${frequency === "evening" ? "selected" : ""}`}
                  onClick={() => setFrequency("evening")}
                >
                  <span className="save-badge">SAVE 15%</span>
                  <div className="plan-card-icon">🌇</div>
                  <h4>Evening</h4>
                  <p>Unwind with a warm cup delivered after work.</p>
                  <span className="plan-pricing">₹{Math.round(product.priceNum * 0.85)}/cup</span>
                </div>

                <div
                  className={`plan-card ${frequency === "custom" ? "selected" : ""}`}
                  onClick={() => setFrequency("custom")}
                >
                  <span className="save-badge">SAVE 10%</span>
                  <div className="plan-card-icon">⏰</div>
                  <h4>Custom Slot</h4>
                  <p>Pick your own preferred delivery window anytime.</p>
                  {frequency === "custom" ? (
                    <div className="custom-time-picker" onClick={(e) => e.stopPropagation()}>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: "#555", display: "block", marginBottom: "4px" }}>Select Time</label>
                      <input 
                        type="time" 
                        value={customTime} 
                        onChange={(e) => setCustomTime(e.target.value)}
                        style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", width: "100%", fontSize: "13px" }}
                      />
                    </div>
                  ) : (
                    <div className="slot-tag">
                      🕐 Your chosen time
                    </div>
                  )}
                  <span className="plan-pricing" style={{ marginTop: "12px" }}>₹{Math.round(product.priceNum * 0.9)}/cup</span>
                </div>
              </div>
            </div>

            {/* STEP 2: ENTER ADDRESS */}
            <div className="form-card" style={{ marginTop: "20px" }}>
              <span className="step-label">Step 2</span>
              <h3 className="form-section-title">Delivery Address</h3>
              <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>Please provide your exact building floor and desk/room number.</p>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Tower B, Floor 4, Desk 42"
                style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px", fontFamily: "var(--font-body)" }}
              />
            </div>

            {/* ORDER SUMMARY */}
            <div className="sub-summary-card">
              <h3>Pricing Summary</h3>
              <div className="summary-list">
                <div className="summary-item">
                  <span>Plan Unit Cost:</span>
                  <strong>₹{unitPrice} per cup</strong>
                </div>
                <div className="summary-item">
                  <span>Frequency Tier:</span>
                  <span style={{ textTransform: "capitalize", fontWeight: "bold" }}>{frequency}</span>
                </div>
                <div className="summary-item">
                  <span>Active Delivery Slot:</span>
                  <span style={{ textTransform: "capitalize", fontWeight: "bold" }}>{frequency === "custom" ? customTime : frequency}</span>
                </div>
                <div className="summary-item" style={{ borderTop: "1px dashed rgba(0,0,0,0.08)", paddingTop: "12px", marginTop: "12px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "bold" }}>Estimated Monthly Total:</span>
                  <strong style={{ fontSize: "18px", color: "#8a583c" }}>₹{(unitPrice * (frequency === "morning" ? 30 : frequency === "morning_evening" ? 60 : 30)) + addonsTotal}</strong>
                </div>
              </div>

              <button onClick={handleStartSubscription} className="btn-activate-subscription">
                START SUBSCRIPTION
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* PAYMENT & INVOICE MULTI-STEP MODAL */}
      {isPaymentModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content invoice-modal">
            
            {paymentStep !== "paying" && (
              <button onClick={() => setIsPaymentModalOpen(false)} className="modal-close-btn">
                ✕
              </button>
            )}

            {/* STEP 1: INVOICE DETAILS */}
            {paymentStep === "invoice" && (
              <div>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <span style={{ fontSize: "32px" }}>🧾</span>
                  <h2 style={{ fontSize: "20px", fontWeight: 800, marginTop: "8px" }}>ChaiCo Invoice</h2>
                  <p style={{ fontSize: "12px", color: "#888" }}>Invoice ID: INV-SUB-{Date.now().toString().slice(-6)}</p>
                </div>

                <div className="invoice-details-box">
                  <div className="invoice-row header">
                    <span>Description</span>
                    <span>Total</span>
                  </div>

                  <div className="invoice-row">
                    <div>
                      <strong>{product.name} Subscription</strong>
                      <div className="invoice-sub-meta">
                        <span>Time: {(frequency === "custom" ? customTime : frequency).toUpperCase()} slot</span>
                      </div>
                    </div>
                    <span>₹{unitPrice} / cup</span>
                  </div>

                  <div className="invoice-row">
                    <span>Est. Deliveries ({totalDeliveries} / mo)</span>
                    <span>x {totalDeliveries}</span>
                  </div>

                  <div className="invoice-row summary-line">
                    <span>Subtotal</span>
                    <span>₹{itemsSubtotal}</span>
                  </div>

                  <div className="invoice-row summary-line">
                    <span>GST Tax (5%)</span>
                    <span>₹{taxes}</span>
                  </div>

                  <div className="invoice-row summary-line total">
                    <span>Final Amount Payable</span>
                    <span>₹{finalTotal}</span>
                  </div>
                </div>

                {/* Loyalty Bonus alert */}
                <div style={{ background: "rgba(138, 88, 60, 0.08)", padding: "12px 16px", borderRadius: "10px", margin: "20px 0", fontSize: "12.5px", color: "#8a583c", display: "flex", gap: "8px", alignItems: "center" }}>
                  <span>🪙</span>
                  <span><strong>Earn 100 loyalty coins</strong> on this recurring order! Balance updates instantly.</span>
                </div>

                <button onClick={handleTriggerPayment} className="btn-pay-bill">
                  Pay Bill (₹{finalTotal})
                </button>
              </div>
            )}

            {/* STEP 2: PAYMENT PROCESSING LOADER */}
            {paymentStep === "paying" && (
              <div style={{ textAlign: "center", padding: "40px 10px" }}>
                <div className="spinner-loader" />
                <h3 style={{ fontSize: "18px", fontWeight: 800, marginTop: "24px", color: "#2c1b0d" }}>
                  Verifying Transaction...
                </h3>
                <p style={{ fontSize: "13px", color: "#666", marginTop: "8px", maxWidth: "340px", margin: "8px auto 0" }}>
                  Securing subscription gateway and mapping daily delivery route coordinates. Do not refresh.
                </p>
              </div>
            )}

            {/* STEP 3: TRANSACTION SUCCESS */}
            {paymentStep === "success" && (
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <div className="success-checkmark-wrapper">
                  <span className="success-icon">✓</span>
                </div>
                
                <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#27ae60", marginTop: "20px" }}>
                  Subscription Activated!
                </h3>
                
                <p style={{ fontSize: "13.5px", color: "#555", marginTop: "12px", lineHeight: "1.5", maxWidth: "380px", margin: "12px auto 0" }}>
                  Payment of <strong>₹{finalTotal}</strong> received. Your recurring deliveries will begin <strong>tomorrow</strong> at the designated <strong>{(frequency === "custom" ? customTime : frequency).toUpperCase()}</strong> slot!
                </p>

                <div style={{ background: "#f9f9fb", border: "1px dashed #ddd", borderRadius: "8px", padding: "12px", margin: "20px auto", maxWidth: "300px", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "#777" }}>Order Reference:</span>
                    <strong>#CHAI-SUB-8921</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#777" }}>Next Delivery:</span>
                    <strong>Tomorrow ({frequency === "custom" ? customTime : frequency === "morning" ? "07:30 AM" : "05:00 PM"})</strong>
                  </div>
                </div>

                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="btn-pay-bill"
                  style={{ background: "#2c1b0d", maxWidth: "240px", margin: "0 auto" }}
                >
                  Back to Portal
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      <Footer />

      {/* Styled JSX */}
      <style>{`
        .subscribe-container {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
          padding: 120px 24px 60px;
          box-sizing: border-box;
        }

        .sub-header-summary {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 40px;
        }

        .badge-promo {
          font-size: 11px;
          font-weight: 800;
          color: #8a583c;
          letter-spacing: 1.5px;
          display: block;
          margin-bottom: 8px;
        }

        .sub-header-summary h1 {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 900;
          color: #2c1b0d;
          line-height: 1.15;
          margin-bottom: 12px;
        }

        .sub-header-summary p {
          font-size: 15px;
          color: #666;
          line-height: 1.6;
        }

        /* 2-Column Layout Grid */
        .sub-portal-layout {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 40px;
          align-items: start;
        }

        /* Left Visuals Panel */
        .sub-visuals-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .visual-video-card {
          position: relative;
          width: 100%;
          aspect-ratio: 1.6 / 1;
          border-radius: 16px;
          overflow: hidden;
          background: #000;
          box-shadow: 0 8px 30px rgba(0,0,0,0.05);
        }

        .visual-loop {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .video-overlay-tint {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%);
          z-index: 1;
        }

        .video-card-details {
          position: absolute;
          bottom: 18px;
          left: 20px;
          right: 20px;
          z-index: 2;
          color: #ffffff;
        }

        .video-card-details h4 {
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .video-card-details p {
          font-size: 12px;
          color: rgba(255,255,255,0.8);
          line-height: 1.4;
        }

        .sub-selected-tea-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(0,0,0,0.05);
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .selected-tea-thumbnail {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          object-fit: cover;
          flex-shrink: 0;
        }

        /* Right Form Panel */
        .sub-config-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 28px;
          border: 1px solid rgba(0,0,0,0.04);
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          position: relative;
        }

        .step-label {
          font-size: 10px;
          font-weight: 800;
          color: #8a583c;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: block;
          margin-bottom: 6px;
        }

        .form-section-title {
          font-size: 18px;
          font-weight: 800;
          color: #2c1b0d;
          margin-bottom: 16px;
        }

        .plan-choices {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .plan-card {
          border: 1.5px solid rgba(44, 27, 13, 0.08);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .plan-card:hover {
          border-color: rgba(44, 27, 13, 0.2);
        }

        .plan-card.selected {
          border-color: #2c1b0d;
          background: rgba(44, 27, 13, 0.02);
        }

        .save-badge {
          position: absolute;
          top: -8px;
          right: 8px;
          background: #27ae60;
          color: #ffffff;
          font-size: 9px;
          font-weight: 850;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .plan-card h4 {
          font-size: 13.5px;
          font-weight: 800;
          color: #2c1b0d;
          margin-bottom: 6px;
        }

        .plan-card p {
          font-size: 11px;
          color: #777;
          line-height: 1.4;
          margin-bottom: 12px;
          flex-grow: 1;
        }

        .plan-pricing {
          font-size: 13.5px;
          font-weight: 900;
          color: #8a583c;
        }

        .plan-card-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .slot-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(44, 27, 13, 0.06);
          color: #5c4f47;
          font-size: 10.5px;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 999px;
          margin-bottom: 12px;
          border: 1.5px solid transparent;
          transition: all 0.25s ease;
        }

        .slot-tag-filled {
          background: #2c1b0d;
          color: #ffffff;
          border-color: #2c1b0d;
        }

        /* Calendar Picker */
        .date-picker-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .date-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .date-input-group label {
          font-size: 12px;
          font-weight: 700;
          color: #555;
        }

        .date-input-field {
          border: 1.5px solid rgba(44, 27, 13, 0.1);
          border-radius: 8px;
          padding: 10px;
          font-size: 13.5px;
          background: #fbf9f6;
          color: #2c1b0d;
          outline: none;
        }

        .date-input-field:focus {
          border-color: #2c1b0d;
        }

        /* Time slots */
        .time-slots-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .slot-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #fbf9f6;
          border: 1.5px solid rgba(44, 27, 13, 0.08);
          border-radius: 12px;
          padding: 14px 18px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
        }

        .slot-btn:hover {
          border-color: rgba(44, 27, 13, 0.18);
        }

        .slot-btn.active {
          border-color: #2c1b0d;
          background: rgba(44, 27, 13, 0.02);
        }

        .slot-emoji {
          font-size: 24px;
        }

        .slot-hours {
          display: block;
          font-size: 11px;
          color: #777;
          margin-top: 2px;
        }

        /* Blends details */
        .preferences-row {
          display: flex;
          gap: 16px;
        }

        .pref-label {
          font-size: 12px;
          font-weight: 700;
          color: #555;
          display: block;
          margin-bottom: 6px;
        }

        .pref-select {
          width: 100%;
          border: 1.5px solid rgba(44, 27, 13, 0.1);
          border-radius: 8px;
          padding: 10px;
          font-size: 13px;
          background: #fbf9f6;
          color: #2c1b0d;
          outline: none;
        }

        .spice-pills-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .spice-pill-btn {
          background: #fbf9f6;
          border: 1.5px solid rgba(44, 27, 13, 0.08);
          border-radius: 99px;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .spice-pill-btn.selected {
          background: #2c1b0d;
          color: #ffffff;
          border-color: #2c1b0d;
        }

        /* Summary card */
        .sub-summary-card {
          background: #ffffff;
          border: 1.5px dashed rgba(138, 88, 60, 0.35);
          border-radius: 16px;
          padding: 28px;
        }

        .sub-summary-card h3 {
          font-size: 17px;
          font-weight: 800;
          color: #8a583c;
          margin-bottom: 16px;
          border-bottom: 1px solid rgba(138, 88, 60, 0.1);
          padding-bottom: 10px;
        }

        .summary-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
        }

        .btn-activate-subscription {
          background: #8a583c;
          color: #ffffff;
          border: none;
          padding: 14px 20px;
          border-radius: 10px;
          font-weight: 700;
          width: 100%;
          cursor: pointer;
          margin-top: 24px;
          letter-spacing: 0.5px;
          transition: background 0.2s;
        }

        .btn-activate-subscription:hover {
          background: #6f4228;
        }

        /* Invoice Modal Popup */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(4px);
        }

        .modal-content.invoice-modal {
          background: #ffffff;
          width: 90%;
          max-width: 480px;
          border-radius: 20px;
          padding: 30px;
          position: relative;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          border: 1px solid rgba(0,0,0,0.04);
        }

        .modal-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          background: transparent;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #777;
        }

        .invoice-details-box {
          background: #fbf9f6;
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .invoice-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,0.04);
        }

        .invoice-row.header {
          font-weight: 800;
          color: #777;
          border-bottom: 2px solid rgba(0,0,0,0.06);
          padding-top: 0;
        }

        .invoice-sub-meta {
          font-size: 11px;
          color: #666;
          margin-top: 4px;
        }

        .invoice-row.summary-line {
          font-size: 13px;
          color: #666;
        }

        .invoice-row.summary-line.total {
          font-size: 16px;
          font-weight: 900;
          color: #2c1b0d;
          border-bottom: none;
          padding-bottom: 0;
        }

        .btn-pay-bill {
          background: #8a583c;
          color: #ffffff;
          border: none;
          padding: 14px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          width: 100%;
          cursor: pointer;
          transition: background 0.2s;
          display: block;
          text-align: center;
        }

        .btn-pay-bill:hover {
          background: #6f4228;
        }

        /* Payment Loader Spinner */
        .spinner-loader {
          border: 4px solid rgba(138, 88, 60, 0.1);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border-left-color: #8a583c;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Success checkmark */
        .success-checkmark-wrapper {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }

        .success-icon {
          font-size: 32px;
          font-weight: bold;
        }

        @media (max-width: 990px) {
          .sub-portal-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .plan-choices {
            grid-template-columns: 1fr;
          }
          .date-picker-row {
            grid-template-columns: 1fr;
          }
          .preferences-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div style={{ padding: "100px", textAlign: "center" }}>Loading Subscription Details...</div>}>
      <SubscriptionPortal />
    </Suspense>
  );
}
