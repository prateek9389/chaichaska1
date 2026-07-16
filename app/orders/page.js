"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db, updateOrder, updateSubscription, onSubscriptionsSnapshot } from "@/lib/firestore";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    let unsubOrders = () => {};

    if (!authLoading && user) {
      unsubOrders = onSnapshot(collection(db, "orders"), (snap) => {
        const o = [];
        snap.forEach(d => o.push({ ...d.data(), id: d.id }));
        const myOrders = o.filter((ord) => ord.userId === user.uid);
        setOrders(myOrders);
      });

      const unsubSubs = onSubscriptionsSnapshot((data) => {
        const mySubs = data.filter((sub) => sub.userId === user.uid);
        setSubscriptions(mySubs);
      });


      setLoading(false);
    } else if (!authLoading && !user) {
      setLoading(false);
    }

    return () => {
      unsubOrders();
      if (typeof unsubSubs === "function") unsubSubs();
    };
  }, [user, authLoading]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", overflowX: "hidden" }}>
      <Navbar />

      <div className="orders-container">
        
        {/* Banner */}
        <section className="orders-header-row">
          <h1>Track Your Brews</h1>
          <p>Manage your active recurring cycles or view past boutique tea collections.</p>
        </section>

        {/* Subscriptions Content */}
        {subscriptions.length > 0 && (
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>My Subscriptions</h2>
            <div className="orders-list-grid">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="order-item-card" style={{ border: "2px solid #8a583c", background: "#fffdfa" }}>
                  <img src={sub.image || sub.img || "/chai-ingredients.png"} alt={sub.id} className="order-card-img" />
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span 
                        className="status-indicator"
                        style={{
                          background: sub.status === "Paused" ? "rgba(243,156,18,0.15)" : 
                                      sub.status === "Active" ? "rgba(39,174,96,0.1)" : "rgba(231,76,60,0.1)",
                          color: sub.status === "Paused" ? "#f39c12" : 
                                 sub.status === "Active" ? "#27ae60" : "#e74c3c",
                        }}
                      >
                        {sub.status || "Active"}
                      </span>
                      <strong style={{ fontSize: "14.5px", color: "#8a583c" }}>{sub.price}</strong>
                    </div>
                    
                    <h3 className="card-title-name" style={{ marginTop: "12px" }}>{sub.items}</h3>
                    <div className="card-meta-list" style={{ marginTop: "8px" }}>
                      <p>📅 Start Date: <strong>{sub.startDate}</strong></p>
                      {sub.endDate && <p>🏁 End Date: <strong>{sub.endDate}</strong></p>}
                      <p>⏰ Time Slot: <strong>{sub.timeSlot} ({sub.schedule})</strong></p>
                      <p>🏢 Delivery To: <strong>{sub.office}</strong></p>
                    </div>

                    <div className="card-action-row" style={{ marginTop: "20px" }}>
                      <button 
                        onClick={() => updateSubscription(sub.id, { status: sub.status === "Paused" ? "Active" : "Paused" })} 
                        className="card-btn secondary full-width-btn"
                      >
                        {sub.status === "Paused" ? "Resume Subscription" : "Pause Subscription"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders Content (Unified) */}
        <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>Order History</h2>
        <div className="orders-list-grid">
          {orders.map((ord) => {
            const isSubscriptionOrder = ord.type === "subscription" || (ord.item && ord.item.includes("Subscription"));
            
            return (
              <div key={ord.id} className="order-item-card">
                <img src={ord.image || ord.img || "/chai-ingredients.png"} alt={ord.id} className="order-card-img" />
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span 
                      className="status-indicator"
                      style={{
                        background: ord.status === "Cancelled" || ord.status === "Cancelled by User" || ord.status === "Paused" ? "rgba(231,76,60,0.1)" : 
                                    ord.status === "Shipped" || ord.status === "Delivered" || ord.status === "Active" ? "rgba(39,174,96,0.1)" : 
                                    ord.status === "Pending" ? "rgba(241,196,15,0.15)" : "rgba(44,27,13,0.08)",
                        color: ord.status === "Cancelled" || ord.status === "Cancelled by User" || ord.status === "Paused" ? "#e74c3c" : 
                               ord.status === "Shipped" || ord.status === "Delivered" || ord.status === "Active" ? "#27ae60" : 
                               ord.status === "Pending" ? "#d35400" : "#2c1b0d",
                      }}
                    >
                      {ord.status || "Received"}
                    </span>
                    <strong style={{ fontSize: "14.5px", color: "#2c1b0d" }}>{ord.total}</strong>
                  </div>
                  
                  <h3 className="card-title-name">{ord.id}</h3>
                  <div className="card-meta-list">
                    <p>📅 Placed Date: <strong>{ord.date || new Date(ord.createdAt).toLocaleDateString()}</strong></p>
                    <p>🛍️ Blend Items: <strong>{ord.item}</strong></p>
                  </div>

                  <div className="card-action-row" style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <Link href={`/orders/${ord.id}`} className="card-btn primary full-width-btn" style={{ marginBottom: "10px", flex: 1 }}>
                      View Order Invoice & Tracking →
                    </Link>
                    {(currentTime - ord.createdAt <= 60000) && (!ord.status || ord.status === "Received") && (
                      <button 
                        onClick={() => {
                          if (window.confirm("Are you sure you want to cancel this order?")) {
                            updateOrder(ord.id, { status: "Cancelled by User" });
                          }
                        }} 
                        className="card-btn" 
                        style={{ background: "#e74c3c", color: "#fff", flex: 1, marginBottom: "10px", border: "none" }}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>



      </div>

      <Footer />

      {/* Styled JSX */}
      <style>{`
        .orders-container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 120px 20px 60px;
          box-sizing: border-box;
        }

        .orders-header-row {
          text-align: center;
          margin-bottom: 40px;
        }

        .orders-header-row h1 {
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 900;
          color: #2c1b0d;
          margin-bottom: 8px;
        }

        .orders-header-row p {
          font-size: 14.5px;
          color: #666;
        }



        /* Cards list grid */
        .orders-list-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .order-item-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(0,0,0,0.04);
          padding: 24px;
          display: flex;
          gap: 20px;
          align-items: start;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
        }

        .order-card-img {
          width: 90px;
          height: 90px;
          border-radius: 12px;
          object-fit: cover;
          flex-shrink: 0;
        }

        .status-indicator {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .status-indicator.active {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
        }

        .status-indicator.delivered {
          background: rgba(44, 27, 13, 0.08);
          color: #2c1b0d;
        }

        .card-title-name {
          font-size: 17px;
          font-weight: 800;
          color: #2c1b0d;
          margin: 6px 0 10px;
        }

        .card-meta-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .card-meta-list p {
          font-size: 12.5px;
          color: #666;
          margin: 0;
        }

        .card-action-row {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }

        .card-btn {
          flex: 1;
          border: none;
          padding: 10px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          text-align: center;
          transition: background 0.2s;
          text-decoration: none;
        }

        .card-btn.primary {
          background: #8a583c;
          color: #ffffff;
        }

        .card-btn.primary:hover {
          background: #6f4228;
        }

        .card-btn.secondary {
          background: #fbf9f6;
          border: 1px solid rgba(0,0,0,0.1);
          color: #2c1b0d;
        }

        .full-width-btn {
          flex: none;
          width: 100%;
          display: block;
          box-sizing: border-box;
        }

        @media (max-width: 860px) {
          .orders-list-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
