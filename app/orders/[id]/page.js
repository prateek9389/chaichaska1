"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getOrderById, updateOrder } from "@/lib/firestore";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function OrderDetailPage({ params }) {
  const orderId = params.id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (orderId) {
      const unsub = onSnapshot(doc(db, "orders", orderId), (docSnap) => {
        if (docSnap.exists()) {
          setOrder({ id: docSnap.id, ...docSnap.data() });
        } else {
          setOrder(null);
        }
        setLoading(false);
      }, (err) => {
        console.error(err);
        setLoading(false);
      });
      return () => unsub();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <h2>Loading order details...</h2>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d" }}>
        <Navbar />
        <div style={{ padding: "120px 20px", textAlign: "center" }}>
          <h2>Order not found</h2>
          <p>The order ID {orderId} does not exist or has been removed.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const isReceived = true;
  const isPreparing = ["Pending", "Preparing", "Shipped", "Out for Delivery", "Delivered"].includes(order.status);
  const isOutForDelivery = ["Shipped", "Out for Delivery", "Delivered"].includes(order.status);
  const isDelivered = order.status === "Delivered";
  
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString('en-US', { month: 'long', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "Just now";

  return (
    <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", overflowX: "hidden" }}>
      <Navbar />

      <div className="order-detail-container">
        <div className="order-detail-box">
          
          {/* Header */}
          <div className="detail-header-row">
            <div>
              <span className="order-tag">SECURE SHIPMENT LOGS</span>
              <h2>Invoice details: {orderId}</h2>
              <p>Placed on {dateStr}</p>
              
              {["Received", "Pending", "Shipped"].includes(order.status || "Received") && (
                <p style={{ marginTop: '10px' }}>⏳ Estimated Delivery: <strong style={{ color: "#e67e22" }}>
                  {(() => {
                    const targetDuration = order.allocatedTime ? parseInt(order.allocatedTime) * 60 * 1000 : 20 * 60 * 1000;
                    const targetTime = (order.createdAt || Date.now()) + targetDuration;
                    const remainingMs = targetTime - currentTime;
                    if (remainingMs > 0) {
                      const m = Math.floor(remainingMs / 60000);
                      const s = Math.floor((remainingMs % 60000) / 1000);
                      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    }
                    return "Arriving Soon";
                  })()}
                </strong></p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-end" }}>
              <div className="status-badge" style={{ 
                background: order.status === "Cancelled" || order.status === "Cancelled by User" ? "rgba(231,76,60,0.1)" : "rgba(39, 174, 96, 0.1)",
                color: order.status === "Cancelled" || order.status === "Cancelled by User" ? "#e74c3c" : "#27ae60"
              }}>
                {order.status}
              </div>
              
              {(!order.status || ["Received", "Pending"].includes(order.status)) && order.createdAt && (currentTime - order.createdAt <= 60000) && (
                <button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to cancel this order?")) {
                      updateOrder(orderId, { status: "Cancelled by User" }).then(() => {
                         setOrder({...order, status: "Cancelled by User"});
                      });
                    }
                  }} 
                  style={{ background: "#e74c3c", color: "#fff", padding: "8px 16px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
                >
                  Cancel Order
                </button>
              )}
              
              <button
                onClick={() => window.print()}
                className="no-print"
                style={{ background: "#2c1b0d", color: "#fff", padding: "8px 16px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
              >
                🖨️ Download Invoice
              </button>
            </div>
          </div>

          {/* Tracker visual */}
          {order.status !== "Cancelled" && order.status !== "Cancelled by User" && order.status !== "Refunded" ? (
            <div className="tracking-visual-card">
              <h4>Live Shipment Status</h4>
              <div className="stepper-track">
                <div className={`step ${isReceived ? "active" : ""}`}>
                  <span className="step-circle">{isReceived ? "✓" : "1"}</span>
                  <span className="step-text">Received</span>
                </div>
                <div className={`track-line ${isPreparing ? "active" : ""}`} />
                <div className={`step ${isPreparing ? "active" : ""}`}>
                  <span className="step-circle">{isPreparing ? "✓" : "2"}</span>
                  <span className="step-text">Preparing</span>
                </div>
                <div className={`track-line ${isOutForDelivery ? "active" : ""}`} />
                <div className={`step ${isOutForDelivery ? "active" : ""}`}>
                  <span className="step-circle">{isOutForDelivery ? "✓" : "3"}</span>
                  <span className="step-text">Out for Delivery</span>
                </div>
                <div className={`track-line ${isDelivered ? "active" : ""}`} />
                <div className={`step ${isDelivered ? "active" : ""}`}>
                  <span className="step-circle">{isDelivered ? "✓" : "4"}</span>
                  <span className="step-text">Delivered</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="tracking-visual-card" style={{ textAlign: "center", padding: "30px" }}>
              {(order.status === "Cancelled" || order.status === "Cancelled by User") && (
                <>
                  <h4 style={{ color: "#e74c3c" }}>Order Cancelled</h4>
                  <p style={{ marginTop: "10px", fontSize: "14px" }}>
                    Your refund will be processed in 4 hours. If paid via Coins, they will be credited back to your wallet.
                  </p>
                </>
              )}
              {order.status === "Refunded" && (
                <>
                  <h4 style={{ color: "#3498db" }}>Refund Processed</h4>
                  <p style={{ marginTop: "10px", fontSize: "14px" }}>
                    Your refund was processed successfully. If you paid via Coins, they have been credited back to your wallet.
                  </p>
                </>
              )}
            </div>
          )}

          {/* 2-Column Split: Summary | Address */}
          <div className="detail-grid">
            
            {/* Left: Invoice items list */}
            <div className="detail-card">
              <h3 className="section-title">Invoice Items</h3>
              <div className="invoice-items-list">
                <div className="item-row">
                  <div>
                    <strong>{order.item}</strong>
                    <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#777" }}>Milk: {order.milk} | Sugar: {order.sugar}</p>
                  </div>
                  <strong>-</strong>
                </div>

                {order.addons && order.addons !== "None" && order.addons !== "" && (
                  <div className="item-row">
                    <div>
                      <strong>Add-ons: {order.addons}</strong>
                    </div>
                    <strong>-</strong>
                  </div>
                )}

                <div className="breakdown-total-row">
                  <span>Subtotal:</span>
                  <span>{order.total}</span>
                </div>
                <div className="breakdown-total-row">
                  <span>Express Delivery:</span>
                  <span>Free</span>
                </div>
                {order.coupon && order.coupon !== "None" && order.coupon !== "" && (
                  <div className="breakdown-total-row">
                    <span>Coupon Applied:</span>
                    <span>{order.coupon}</span>
                  </div>
                )}
                <div className="breakdown-total-row final">
                  <span>Total Amount Paid:</span>
                  <span style={{ color: "#8a583c", fontSize: "18px", fontWeight: "900" }}>{order.total}</span>
                </div>
              </div>
            </div>

            {/* Right: Shipping details */}
            <div className="detail-card">
              <h3 className="section-title">Shipping & Delivery Address</h3>
              
              <div className="address-box-display">
                <p>👤 <strong>Receiver Name:</strong> {order.customer || "N/A"}</p>
                <p>📞 <strong>Phone:</strong> {order.phone || "N/A"}</p>
                <p>📍 <strong>Delivery Address:</strong></p>
                <p className="full-address-text">
                  {order.office || "N/A"} {order.pincode ? ` - ${order.pincode}` : ""}
                </p>
              </div>

              <div style={{ marginTop: "24px", background: "rgba(138, 88, 60, 0.08)", padding: "14px", borderRadius: "10px", fontSize: "12.5px" }}>
                <span>🛡️ Payment secured via <strong>UPI Instant Merchant Transfer</strong>. TransID: {order.id}.</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      <Footer />

      {/* Styled JSX */}
      <style>{`
        .order-detail-container {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          padding: 120px 20px 60px;
          box-sizing: border-box;
        }

        .order-detail-box {
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.04);
          padding: 40px;
          box-shadow: 0 4px 30px rgba(0,0,0,0.01);
        }

        .detail-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding-bottom: 24px;
          margin-bottom: 30px;
        }

        .order-tag {
          font-size: 10.5px;
          font-weight: 800;
          color: #8a583c;
          letter-spacing: 1px;
          display: block;
          margin-bottom: 6px;
        }

        .detail-header-row h2 {
          font-size: clamp(20px, 3.5vw, 26px);
          font-weight: 900;
          color: #2c1b0d;
          margin: 0 0 6px;
        }

        .detail-header-row p {
          font-size: 13px;
          color: #666;
          margin: 0;
        }

        .status-badge {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 8px;
        }

        /* Status stepper tracker */
        .tracking-visual-card {
          background: #fbf9f6;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(0,0,0,0.03);
          margin-bottom: 30px;
        }

        .tracking-visual-card h4 {
          font-size: 14.5px;
          font-weight: 800;
          margin-bottom: 20px;
          color: #2c1b0d;
        }

        .stepper-track {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .step-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #ddd;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
        }

        .step.active .step-circle {
          background: #27ae60;
        }

        .step-text {
          font-size: 12px;
          font-weight: 750;
          color: #888;
        }

        .step.active .step-text {
          color: #2c1b0d;
        }

        .track-line {
          flex-grow: 1;
          height: 3px;
          background: #eee;
          margin: 0 10px;
          transform: translateY(-12px);
        }

        .track-line.active {
          background: #27ae60;
        }

        /* Details columns */
        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }

        .detail-card {
          background: #ffffff;
          border: 1.5px solid rgba(0,0,0,0.04);
          border-radius: 16px;
          padding: 24px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 850;
          color: #2c1b0d;
          margin-bottom: 20px;
          border-bottom: 1.5px solid rgba(0,0,0,0.04);
          padding-bottom: 10px;
        }

        .item-row {
          display: flex;
          justify-content: space-between;
          font-size: 13.5px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0,0,0,0.04);
          margin-bottom: 12px;
        }

        .breakdown-total-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #555;
          margin-bottom: 8px;
        }

        .breakdown-total-row.final {
          border-top: 1px dashed rgba(0,0,0,0.08);
          padding-top: 12px;
          margin-top: 12px;
          font-weight: 850;
          color: #2c1b0d;
        }

        /* Shipping Address card */
        .address-box-display {
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 13.5px;
        }

        .address-box-display p {
          margin: 0;
        }

        .full-address-text {
          background: #fbf9f6;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.04);
          line-height: 1.4;
          color: #555;
        }

        @media (max-width: 800px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
          .order-detail-box {
            padding: 24px;
          }
          .track-line {
            margin: 0 4px;
          }
          .step-text {
            font-size: 10px;
          }
        }

        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          /* Hide all elements except the invoice lineage and its descendants */
          body *:not(#printable-invoice-card):not(:has(#printable-invoice-card)):not(#printable-invoice-card *) {
            display: none !important;
          }
          /* Strip layout from the lineage ancestors to avoid extra spacing/scrollbars */
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
            padding: 20px !important;
            margin: 0 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* INVOICE CARD (Hidden normally, shown only on print) */}
      <div id="printable-invoice-card" className="print-only-invoice" style={{ display: "none" }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .print-only-invoice {
              display: block !important;
            }
          }
        `}} />
        <div style={{ background: "#ffffff", padding: "48px", borderRadius: "8px", color: "#2c1b0d", fontFamily: "Arial, sans-serif" }}>
          
          {/* Row 1: Logo & INVOICE header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img src="/logo.png" alt="Chai Chaska Logo" style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "50%" }} />
              <div>
                <strong style={{ fontSize: "20px", color: "#2c1b0d", letterSpacing: "0.5px" }}>CHAI CHASKA</strong>
              </div>
            </div>
            <h1 style={{ fontSize: "28px", color: "#2c1b0d", letterSpacing: "2px", margin: 0, fontWeight: "300", textTransform: "uppercase" }}>INVOICE</h1>
          </div>

          {/* Row 2: Details Columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 2fr", gap: "16px", borderBottom: "1px solid #eee", paddingBottom: "20px", marginBottom: "20px" }}>
            <div>
              <span style={{ fontSize: "10.5px", color: "#888", display: "block", textTransform: "uppercase", marginBottom: "4px" }}>Invoice no.</span>
              <strong style={{ fontSize: "13px" }}>#{orderId.replace("CHAI-ORD-", "CH-")}</strong>
            </div>
            <div>
              <span style={{ fontSize: "10.5px", color: "#888", display: "block", textTransform: "uppercase", marginBottom: "4px" }}>Date</span>
              <strong style={{ fontSize: "13px" }}>{new Date(order.createdAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
            </div>
            <div>
              <span style={{ fontSize: "10.5px", color: "#888", display: "block", textTransform: "uppercase", marginBottom: "4px" }}>Invoice to:</span>
              <strong style={{ fontSize: "13.5px", display: "block" }}>{order.customer || "Customer"}</strong>
              <span style={{ fontSize: "11px", color: "#666" }}>Corporate Desk Partner</span>
            </div>
          </div>

          {/* Row 3: Total Due block */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fbf9f6", padding: "20px 24px", borderRadius: "6px", marginBottom: "28px", border: "1px solid rgba(44,27,13,0.03)" }}>
            <div>
              <span style={{ fontSize: "10px", color: "#8a583c", textTransform: "uppercase", display: "block", fontWeight: "bold", letterSpacing: "0.5px" }}>TOTAL DUE</span>
              <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>{typeof order.total === 'string' && order.total.includes('₹') ? order.total : `₹${order.total}`}</strong>
            </div>
            <div style={{ textAlign: "right", fontSize: "11.5px", color: "#555" }}>
              <span style={{ display: "block", fontWeight: "bold", color: "#2c1b0d" }}>📍 Delivery Destination</span>
              <span>{order.office || "General Area"}</span>
            </div>
          </div>

          {/* Row 4: Main Itemized Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px" }}>
            <thead>
              <tr style={{ background: "#2c1b0d", color: "#ffffff", fontSize: "12px", textTransform: "uppercase" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", borderRadius: "4px 0 0 4px" }}>Item Description</th>
                <th style={{ padding: "10px 16px", textAlign: "right" }}>Unit Price</th>
                <th style={{ padding: "10px 16px", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "10px 16px", textAlign: "right", borderRadius: "0 4px 4px 0" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const priceVal = parseFloat((order.total || "").toString().replace("₹", "")) || 0;
                const subTotal = (priceVal / 1.05).toFixed(2);
                const taxVal = (priceVal - subTotal).toFixed(2);
                
                return (
                  <>
                    <tr style={{ borderBottom: "1px solid #eee", fontSize: "13px" }}>
                      <td style={{ padding: "16px" }}>
                        <strong style={{ display: "block" }}>{order.item || "Chai"}</strong>
                        <span style={{ fontSize: "11px", color: "#666" }}>Pref: Sugar: {order.sugar || "Default"}, Milk: {order.milk || "Default"}</span>
                      </td>
                      <td style={{ padding: "16px", textAlign: "right" }}>₹{subTotal}</td>
                      <td style={{ padding: "16px", textAlign: "center" }}>1</td>
                      <td style={{ padding: "16px", textAlign: "right", fontWeight: "bold" }}>₹{subTotal}</td>
                    </tr>
                  </>
                )
              })()}
            </tbody>
          </table>

          {/* Row 5: Payout acceptance & totals */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", marginBottom: "40px" }}>
            <div>
              <strong style={{ fontSize: "11px", textTransform: "uppercase", display: "block", color: "#666", marginBottom: "8px" }}>Payment Method We Accept</strong>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", background: "rgba(44,27,13,0.05)", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>UPI (Instant)</span>
                <span style={{ fontSize: "12px", background: "rgba(44,27,13,0.05)", padding: "4px 8px", borderRadius: "4px", fontWeight: "bold" }}>Corporate Wallet</span>
              </div>
            </div>

            <div style={{ fontSize: "12.5px" }}>
              {(() => {
                const priceVal = parseFloat((order.total || "").toString().replace("₹", "")) || 0;
                const subTotal = (priceVal / 1.05).toFixed(2);
                const taxVal = (priceVal - subTotal).toFixed(2);
                return (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#666" }}>
                      <span>Sub Total:</span>
                      <span>₹{subTotal}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#666", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
                      <span>Tax (GST 5%):</span>
                      <span>₹{taxVal}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#2c1b0d", color: "#ffffff", borderRadius: "4px", marginTop: "10px", fontWeight: "bold" }}>
                      <span>Grand Total:</span>
                      <span>{typeof order.total === 'string' && order.total.includes('₹') ? order.total : `₹${order.total}`}</span>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "40px" }}>
            <div style={{ textAlign: "center", width: "160px" }}>
              <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "16px", color: "#8a583c", display: "block", marginBottom: "4px" }}>Brewmaster Admin</span>
              <div style={{ borderTop: "1px solid #ccc", paddingTop: "6px", fontSize: "10.5px", color: "#888", textTransform: "uppercase", fontWeight: "bold" }}>Accounts Manager</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #eee", marginTop: "40px", paddingTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "9.5px", color: "#999" }}>
            <span style={{ maxWidth: "200px" }}>🏢 TF-57, 3rd floor, Gaur City Center, Near Gaur Chowk, Greater Noida West (UP)</span>
            <span>📞 +91 96676-23-123</span>
            <span>✉️ chaichaska.support@gmail.com</span>
          </div>

        </div>
      </div>
    </div>
  );
}
