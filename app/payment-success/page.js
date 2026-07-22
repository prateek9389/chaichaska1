"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const type = searchParams.get("type"); // "checkout" or "wallet"
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    async function fetchOrder() {
      if (orderId && type === "checkout") {
        try {
          const { getOrderById } = await import("@/lib/firestore");
          const order = await getOrderById(orderId);
          if (order) setOrderDetails(order);
        } catch (e) {
          console.error(e);
        }
      }
    }
    fetchOrder();
  }, [orderId, type]);

  useEffect(() => {
    if (orderId && type === "checkout") {
      clearCart();
      try {
        const existing = JSON.parse(localStorage.getItem("guest_orders") || "[]");
        if (!existing.find(o => o.id === orderId)) {
          existing.push({ id: orderId, timestamp: Date.now() });
          localStorage.setItem("guest_orders", JSON.stringify(existing));
        }
      } catch (e) {
        console.error("Could not save guest order", e);
      }
    }
  }, [orderId, type]);

  return (
    <div className="thank-you-layout">
      <div className="thank-you-card">
        <div className="success-badge-circle">✓</div>
        <h2 className="success-title">Payment Successful!</h2>
        <p className="success-message">
          Your payment was processed successfully. 
          {type === "wallet" 
            ? " Your loyalty coin wallet has been recharged." 
            : " Your order is confirmed and heading to the brewing counter."}
        </p>

        <div className="receipt-box" style={{ marginTop: "32px", padding: "24px", background: "#fbf9f6", borderRadius: "16px", border: "1px dashed rgba(138,88,60,0.3)" }}>
          <div className="receipt-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px" }}>
            <span style={{ color: "#666" }}>Reference ID:</span>
            <strong style={{ color: "#2c1b0d" }}>{orderId}</strong>
          </div>
          
          {orderDetails && (
            <>
              <div className="receipt-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px" }}>
                <span style={{ color: "#666" }}>Amount Paid:</span>
                <strong style={{ color: "#2c1b0d", fontSize: "16px" }}>{orderDetails.total}</strong>
              </div>
              <div className="receipt-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "14px" }}>
                <span style={{ color: "#666" }}>Payment Method:</span>
                <strong style={{ color: "#8a583c" }}>Cashfree (Online)</strong>
              </div>
              <div className="receipt-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", borderTop: "1px dashed rgba(0,0,0,0.1)", paddingTop: "12px" }}>
                <span style={{ color: "#666" }}>Status:</span>
                <strong style={{ color: "#27ae60" }}>{orderDetails.payment_status || "PAID"}</strong>
              </div>
            </>
          )}

          {!orderDetails && type === "wallet" && (
             <div className="receipt-row" style={{ display: "flex", justifyContent: "space-between" }}>
               <span style={{ color: "#666" }}>Status:</span>
               <strong style={{ color: "#27ae60" }}>PAID</strong>
             </div>
          )}
        </div>

        <div style={{ marginTop: "32px", display: "flex", gap: "12px", justifyContent: "center" }}>
          {type === "wallet" ? (
            <Link href="/wallet" className="btn-continue-checkout" style={{ padding: "14px 32px", background: "#8a583c", color: "#fff", textDecoration: "none", borderRadius: "12px", fontWeight: "bold" }}>
              Return to Wallet
            </Link>
          ) : (
            <>
              <Link href={`/orders/${orderId}`} className="btn-continue-checkout" style={{ padding: "14px 24px", background: "#fbf9f6", color: "#2c1b0d", border: "1px solid rgba(0,0,0,0.1)", textDecoration: "none", borderRadius: "12px", fontWeight: "bold" }}>
                Track Order
              </Link>
              <Link href="/" className="btn-continue-checkout" style={{ padding: "14px 32px", background: "#8a583c", color: "#fff", textDecoration: "none", borderRadius: "12px", fontWeight: "bold" }}>
                Return to Home
              </Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        .thank-you-layout {
          min-height: calc(100vh - 200px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          background: #fcfaf7;
        }
        .thank-you-card {
          background: #fff;
          padding: 40px;
          border-radius: 24px;
          text-align: center;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(0,0,0,0.05);
        }
        .success-badge-circle {
          width: 70px;
          height: 70px;
          background: #27ae60;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 20px;
        }
        .success-title {
          font-size: 24px;
          font-weight: 800;
          color: #2c1b0d;
          margin-bottom: 12px;
        }
        .success-message {
          color: #666;
          font-size: 15px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div style={{ textAlign: "center", padding: "100px" }}>Loading...</div>}>
        <PaymentSuccessContent />
      </Suspense>
      <Footer />
    </>
  );
}
