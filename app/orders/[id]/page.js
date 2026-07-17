"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getOrderById, updateOrder } from "@/lib/firestore";

export default function OrderDetailPage({ params }) {
  const orderId = params.id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (orderId) {
      getOrderById(orderId)
        .then((data) => {
          setOrder(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
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
  const isBrewed = ["Pending", "Shipped", "Delivered"].includes(order.status);
  const isDispatched = ["Shipped", "Delivered"].includes(order.status);
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
              
              {(!order.status || ["Received", "Pending"].includes(order.status)) && (
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
            </div>
          </div>

          {/* Tracker visual */}
          {order.status !== "Cancelled" && (
            <div className="tracking-visual-card">
              <h4>Live Shipment Status</h4>
              <div className="stepper-track">
                <div className={`step ${isReceived ? "active" : ""}`}>
                  <span className="step-circle">{isReceived ? "✓" : "1"}</span>
                  <span className="step-text">Ordered</span>
                </div>
                <div className={`track-line ${isBrewed ? "active" : ""}`} />
                <div className={`step ${isBrewed ? "active" : ""}`}>
                  <span className="step-circle">{isBrewed ? "✓" : "2"}</span>
                  <span className="step-text">Brewed</span>
                </div>
                <div className={`track-line ${isDispatched ? "active" : ""}`} />
                <div className={`step ${isDispatched ? "active" : ""}`}>
                  <span className="step-circle">{isDispatched ? "✓" : "3"}</span>
                  <span className="step-text">Dispatched</span>
                </div>
                <div className={`track-line ${isDelivered ? "active" : ""}`} />
                <div className={`step ${isDelivered ? "active" : ""}`}>
                  <span className="step-circle">{isDelivered ? "✓" : "4"}</span>
                  <span className="step-text">Delivered</span>
                </div>
              </div>
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
      `}</style>
    </div>
  );
}
