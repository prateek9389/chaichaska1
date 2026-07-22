"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUserTransactions, updateUserCoins } from "@/lib/firestore";

export default function WalletPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState(0);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("upi"); // "upi" | "card" | "netbanking"
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (profile?.coins !== undefined) {
      setBalance(profile.coins);
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      getUserTransactions(user.uid).then(txs => {
         setTransactions(txs);
      });
    }
  }, [user]);

  useEffect(() => {
    // Load Cashfree script dynamically
    if (!document.getElementById("cashfree-script")) {
      const script = document.createElement("script");
      script.id = "cashfree-script";
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Quick Recharge multipliers
  const getCoinsForAmount = (amt) => {
    const parsed = parseInt(amt) || 0;
    if (parsed >= 1000) return parsed + 150; // Bonus 150 coins
    if (parsed >= 500) return parsed + 60;   // Bonus 60 coins
    if (parsed >= 200) return parsed + 20;   // Bonus 20 coins
    return parsed;
  };

  const handleQuickAdd = (amt) => {
    setRechargeAmount(amt.toString());
  };

  const handleRechargeSubmit = (e) => {
    e.preventDefault();
    if (!user) {
      router.push("/signup?redirect=/wallet");
      return;
    }
    const amt = parseInt(rechargeAmount);
    if (!amt || amt <= 0) {
      alert("Please enter a valid recharge amount.");
      return;
    }

    setLoading(true);
    setSuccess(false);

    // Play Pop Sound
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (err) {}

    const initializePayment = async () => {
      if (!window.Cashfree) {
         alert("Payment Gateway failed to load. Please refresh.");
         setLoading(false);
         return;
      }
      const cashfree = window.Cashfree({ mode: "production" }); // Change to sandbox for testing
      const addedCoins = getCoinsForAmount(amt);
      
      try {
        const res = await fetch("/api/cashfree/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amt,
            customer_id: user?.uid || `guest_${Date.now()}`,
            customer_phone: profile?.phone || "9999999999",
            customer_name: profile?.name || "Guest Wallet User",
            order_meta: { coins: addedCoins, method: selectedMethod },
            type: "wallet",
            firebase_uid: user?.uid || null
          })
        });
        
        const data = await res.json();
        if (data.payment_session_id) {
           cashfree.checkout({
             paymentSessionId: data.payment_session_id,
             redirectTarget: "_self"
           });
        } else {
           alert("Failed to initialize payment");
           setLoading(false);
        }
      } catch(err) {
        console.error(err);
        alert("Payment initialization failed");
        setLoading(false);
      }
    };
    
    setTimeout(() => {
      initializePayment();
    }, 1500);

  };

  if (authLoading) {
    return (
      <div style={{ background: "#fcfaf7", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <h2>Loading Wallet...</h2>
      </div>
    );
  }

  return (
    <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", overflowX: "hidden" }}>
      <Navbar />

      <div className="wallet-container">
        
        {/* WALLET SUMMARY BANNER */}
        <section className="wallet-hero-card">
          <div className="shine-decor" />
          <div className="wallet-main-row">
            <div>
              <span className="wallet-tag">ROYAL LOYALTY CLUB</span>
              <h1 className="wallet-title">ChaiCo Coin Wallet</h1>
              <p className="wallet-subtitle">Accumulate gold coins with every subscription and spend them like cash!</p>
            </div>
            
            <div className="balance-display-box">
              <span className="gold-coin-floating" />
              <div style={{ textAlign: "right" }}>
                <span className="balance-value">{balance}</span>
                <span className="balance-label">Active Coins (₹{(balance / 10).toFixed(2)})</span>
              </div>
            </div>
          </div>

          <div className="wallet-stats-row">
            <div className="stat-card">
              <span>Lifetime Coins</span>
              <strong>{balance} Coins</strong>
            </div>
            <div className="stat-card">
              <span>Subscriptions Linked</span>
              <strong>0 Active</strong>
            </div>
            <div className="stat-card">
              <span>Total Cash Saved</span>
              <strong>₹0.00</strong>
            </div>
          </div>
        </section>

        {/* 2-Column Split: Recharge Options (Left) | Transaction Logs (Right) */}
        <div className="wallet-grid">
          
          {/* LEFT WIDGET: RECHARGE PORTAL */}
          <div className="wallet-card recharge-panel">
            <h2 className="section-title">Recharge Loyalty Balance</h2>
            <p className="section-desc">Instantly load cash and receive bonus coins to redeem on premium blends.</p>

            <form onSubmit={handleRechargeSubmit}>
              {/* Amount Input */}
              <div style={{ marginBottom: "20px" }}>
                <label className="input-label">Enter Amount (₹)</label>
                <div style={{ position: "relative" }}>
                  <span className="currency-prefix">₹</span>
                  <input
                    type="number"
                    placeholder="E.g., 500"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    className="amount-input-field"
                  />
                </div>
                {rechargeAmount && (
                  <span className="coins-equivalent-hint">
                    Yields: <strong>{getCoinsForAmount(rechargeAmount)} Coins</strong> (Includes active bonuses)
                  </span>
                )}
              </div>

              {/* Quick Options */}
              <div className="quick-amount-row">
                {[
                  { amt: 200, label: "+ ₹200" },
                  { amt: 500, label: "+ ₹500" },
                  { amt: 1000, label: "+ ₹1000" },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.amt}
                    onClick={() => handleQuickAdd(item.amt)}
                    className="quick-add-btn"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Payment Methods */}
              <div style={{ margin: "24px 0" }}>
                <label className="input-label" style={{ marginBottom: "12px", display: "block" }}>
                  Invoice Payment Method
                </label>
                
                <div className="payment-options-list">
                  <label className={`pay-option-label ${selectedMethod === "upi" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymethod"
                      value="upi"
                      checked={selectedMethod === "upi"}
                      onChange={() => setSelectedMethod("upi")}
                    />
                    <span>UPI (Google Pay, PhonePe, Paytm)</span>
                  </label>

                  <label className={`pay-option-label ${selectedMethod === "card" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymethod"
                      value="card"
                      checked={selectedMethod === "card"}
                      onChange={() => setSelectedMethod("card")}
                    />
                    <span>Credit / Debit Card (Visa, MasterCard, RuPay)</span>
                  </label>

                  <label className={`pay-option-label ${selectedMethod === "netbanking" ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymethod"
                      value="netbanking"
                      checked={selectedMethod === "netbanking"}
                      onChange={() => setSelectedMethod("netbanking")}
                    />
                    <span>Netbanking (HDFC, ICICI, SBI)</span>
                  </label>
                </div>
              </div>

              {/* Recharge trigger */}
              <button type="submit" disabled={loading} className="btn-recharge-submit">
                {loading ? "Verifying Invoice..." : "Load Balance Now"}
              </button>

              {/* Status messages */}
              {loading && (
                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <div className="wallet-mini-spinner" />
                  <span style={{ fontSize: "12px", color: "#666", display: "block", marginTop: "8px" }}>
                    Distilling payment verification tokens...
                  </span>
                </div>
              )}

              {success && (
                <div className="success-banner">
                  <span>🎉 Wallet recharged successfully! Coins added.</span>
                </div>
              )}
            </form>
          </div>

          {/* RIGHT WIDGET: TRANSACTION LOGS */}
          <div className="wallet-card transactions-panel">
            <h2 className="section-title">Coin Transaction History</h2>
            <p className="section-desc">Recent log entries of your coin earnings and coupon redemptions.</p>

            <div className="transactions-list-box">
              {transactions.map((t) => (
                <div key={t.id} className="transaction-log-card">
                  <span className={`log-indicator-icon ${t.type === "credit" ? "credit" : "debit"}`}>
                    {t.type === "credit" ? "↓" : "↑"}
                  </span>
                  
                  <div style={{ flexGrow: 1 }}>
                    <h4 className="log-desc">{t.desc}</h4>
                    <span className="log-date">{t.date} | Status: <strong style={{ color: "#27ae60" }}>{t.status}</strong></span>
                  </div>

                  <span className={`log-amount ${t.type === "credit" ? "credit" : "debit"}`}>
                    {t.type === "credit" ? "+" : "-"}{t.coins} Coins
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      <Footer />

      {/* Styled JSX */}
      <style>{`
        .wallet-container {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
          padding: 120px 24px 60px;
          box-sizing: border-box;
        }

        /* Hero Balance Card */
        .wallet-hero-card {
          position: relative;
          background: linear-gradient(135deg, #1e1107 0%, #3a2210 100%);
          border-radius: 24px;
          padding: 40px;
          color: #ffffff;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(44, 27, 13, 0.15);
          margin-bottom: 30px;
        }

        .shine-decor {
          position: absolute;
          top: -50%;
          right: -20%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(245, 176, 65, 0.1) 0%, transparent 70%);
          z-index: 1;
          pointer-events: none;
        }

        .wallet-main-row {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 30px;
        }

        .wallet-tag {
          font-size: 11px;
          letter-spacing: 1.5px;
          font-weight: 800;
          color: #f1c40f;
          display: block;
          margin-bottom: 8px;
        }

        .wallet-title {
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 900;
          line-height: 1.2;
          margin-bottom: 8px;
        }

        .wallet-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.8);
          max-width: 520px;
          line-height: 1.5;
        }

        .balance-display-box {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px 30px;
          border-radius: 16px;
          backdrop-filter: blur(4px);
        }

        @keyframes floatAndSpin {
          0% { transform: translateY(0) rotateY(0); }
          50% { transform: translateY(-6px) rotateY(180deg); }
          100% { transform: translateY(0) rotateY(360deg); }
        }

        .gold-coin-floating {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: radial-gradient(circle, #ffe066 0%, #f5b041 70%, #d35400 100%);
          box-shadow: inset 0 0 8px #ffffff, 0 4px 15px rgba(245, 176, 65, 0.4);
          border: 2.5px solid #d35400;
          animation: floatAndSpin 4s infinite ease-in-out;
        }

        .balance-value {
          display: block;
          font-size: 42px;
          font-weight: 900;
          color: #f1c40f;
          line-height: 1;
        }

        .balance-label {
          display: block;
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          font-weight: 700;
          margin-top: 4px;
        }

        .wallet-stats-row {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          padding-top: 30px;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .stat-card span {
          font-size: 12px;
          color: rgba(255,255,255,0.65);
          font-weight: 600;
        }

        .stat-card strong {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
        }

        /* Split grid */
        .wallet-grid {
          display: grid;
          grid-template-columns: 1fr 1.1fr;
          gap: 30px;
          width: 100%;
        }

        .wallet-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 30px;
          border: 1px solid rgba(0,0,0,0.04);
          box-shadow: 0 4px 30px rgba(0,0,0,0.01);
        }

        .section-title {
          font-size: 18px;
          font-weight: 800;
          color: #2c1b0d;
          margin-bottom: 6px;
        }

        .section-desc {
          font-size: 12.5px;
          color: #777;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        /* Recharge panel options */
        .input-label {
          font-size: 12.5px;
          font-weight: 700;
          color: #555;
          margin-bottom: 8px;
          display: block;
        }

        .currency-prefix {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          font-weight: 800;
          color: #888;
        }

        .amount-input-field {
          width: 100%;
          border: 1.5px solid rgba(44, 27, 13, 0.1);
          border-radius: 8px;
          padding: 12px 12px 12px 32px;
          font-size: 18px;
          font-weight: 800;
          color: #2c1b0d;
          background: #fbf9f6;
          outline: none;
          box-sizing: border-box;
        }

        .amount-input-field:focus {
          border-color: #2c1b0d;
        }

        .coins-equivalent-hint {
          display: block;
          font-size: 11.5px;
          color: #27ae60;
          margin-top: 6px;
          font-weight: 600;
        }

        .quick-amount-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 10px;
        }

        .quick-add-btn {
          background: #fbf9f6;
          border: 1.5px solid rgba(44, 27, 13, 0.08);
          border-radius: 8px;
          padding: 10px;
          font-size: 13px;
          font-weight: 700;
          color: #2c1b0d;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-add-btn:hover {
          background: rgba(44, 27, 13, 0.03);
          border-color: rgba(44, 27, 13, 0.2);
        }

        .payment-options-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pay-option-label {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fbf9f6;
          border: 1.5px solid rgba(0,0,0,0.05);
          padding: 12px 16px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .pay-option-label.selected {
          border-color: #8a583c;
          background: rgba(138, 88, 60, 0.02);
        }

        .btn-recharge-submit {
          background: #8a583c;
          color: #ffffff;
          border: none;
          padding: 14px;
          border-radius: 8px;
          font-weight: 700;
          width: 100%;
          cursor: pointer;
          transition: background 0.2s;
          margin-top: 20px;
        }

        .btn-recharge-submit:hover {
          background: #6f4228;
        }

        .wallet-mini-spinner {
          border: 3px solid rgba(138, 88, 60, 0.1);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border-left-color: #8a583c;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }

        .success-banner {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          border-radius: 8px;
          padding: 10px;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          margin-top: 14px;
        }

        /* Transactions logs styling */
        .transactions-list-box {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: 480px;
          overflow-y: auto;
        }

        .transaction-log-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px;
          background: #fbf9f6;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.03);
        }

        .log-indicator-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justifyContent: center;
          font-weight: bold;
          font-size: 15px;
        }

        .log-indicator-icon.credit {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
        }

        .log-indicator-icon.debit {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
        }

        .log-desc {
          font-size: 13.5px;
          font-weight: 700;
          color: #2c1b0d;
          margin-bottom: 4px;
        }

        .log-date {
          display: block;
          font-size: 11px;
          color: #888;
        }

        .log-amount {
          font-size: 14px;
          font-weight: 800;
        }

        .log-amount.credit {
          color: #27ae60;
        }

        .log-amount.debit {
          color: #e74c3c;
        }

        @media (max-width: 990px) {
          .wallet-grid {
            grid-template-columns: 1fr;
          }
          .wallet-hero-card {
            padding: 24px;
          }
          .wallet-main-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .balance-display-box {
            width: 100%;
            box-sizing: border-box;
            justifyContent: space-between;
          }
        }
      `}</style>
    </div>
  );
}
