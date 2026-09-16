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
  const type = searchParams.get("type");
  const { clearCart } = useCart();
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    async function fetchOrder() {
      if (orderId) {
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
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
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
  }, [orderId]);

  return (
    <div className="thank-you-layout">
      <div className="thank-you-card">
        <div className="success-badge-circle">✓</div>
        <h2 className="success-title">{type === "cod" || orderDetails?.paymentMethod === "Cash on Delivery" ? "Order Placed Successfully!" : "Payment Successful!"}</h2>
        <p className="success-message">{type === "cod" || orderDetails?.paymentMethod === "Cash on Delivery" ? "Your order has been placed with Cash on Delivery and is heading to the brewing counter. Please keep cash ready for delivery." : "Your payment was processed successfully. Your order is confirmed and heading to the brewing counter."}</p>

        <div className="receipt-box">
          <div className="receipt-row">
            <span className="receipt-label">Reference ID:</span>
            <strong className="receipt-val">#{orderId?.slice(-8).toUpperCase() || orderId}</strong>
          </div>
          
          {orderDetails && (
            <>
              <div className="receipt-row">
                <span className="receipt-label">{type === "cod" || orderDetails?.paymentMethod === "Cash on Delivery" ? "Amount Payable:" : "Amount Paid:"}</span>
                <strong className="receipt-val highlight">{orderDetails.total}</strong>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Payment Method:</span>
                <strong className="receipt-val">{orderDetails?.paymentMethod || (type === "cod" ? "Cash on Delivery" : "UPI Instant")}</strong>
              </div>
              <div className="receipt-row status-row">
                <span className="receipt-label">Status:</span>
                <span className="receipt-status-badge">
                  <span className="status-dot"></span>
                  <span>{orderDetails.status || "CONFIRMED"}</span>
                </span>
              </div>
            </>
          )}
        </div>

        <div className="payment-success-actions">
          <Link href={`/orders/${orderId}`} className="action-btn-track">
            <span>Track Live Order</span>
            <span>→</span>
          </Link>
          <Link href="/shop" className="action-btn-shop">
            Order More Brews
          </Link>
        </div>
      </div>

      <style>{`
        .thank-you-layout {
          min-height: calc(100vh - 140px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 50px 20px 80px;
          background: #ffffff;
        }
        .thank-you-card {
          background: #ffffff;
          border: 1.5px solid #f1f5f9;
          border-radius: 28px;
          padding: 44px 36px;
          text-align: center;
          max-width: 520px;
          width: 100%;
          box-shadow: 0 20px 50px -10px rgba(15, 23, 42, 0.08);
          box-sizing: border-box;
        }
        .success-badge-circle {
          width: 72px;
          height: 72px;
          background: #ecfdf5;
          border: 2px solid #a7f3d0;
          color: #059669;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 800;
          margin: 0 auto 20px;
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.15);
        }
        .success-title {
          font-size: clamp(22px, 3.5vw, 28px);
          font-weight: 850;
          color: #0f172a;
          margin: 0 0 10px;
          letter-spacing: -0.02em;
        }
        .success-message {
          color: #64748b;
          font-size: 14.5px;
          line-height: 1.55;
          margin: 0;
        }
        .receipt-box {
          margin-top: 28px;
          padding: 20px 22px;
          background: #f8fafc;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
        }
        .receipt-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13.5px;
        }
        .receipt-label {
          color: #64748b;
          font-weight: 500;
        }
        .receipt-val {
          color: #0f172a;
          font-weight: 750;
        }
        .receipt-val.highlight {
          font-size: 16px;
          font-weight: 850;
          color: #0f172a;
        }
        .status-row {
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          margin-top: 2px;
        }
        .receipt-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ecfdf5;
          color: #059669;
          padding: 3px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 800;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
        }
        .payment-success-actions {
          margin-top: 32px;
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .action-btn-track {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 26px;
          background: #0f172a;
          color: #ffffff;
          text-decoration: none;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 800;
          transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
        }
        .action-btn-track:hover {
          background: #1e293b;
          transform: translateY(-1px);
        }
        .action-btn-shop {
          display: inline-flex;
          align-items: center;
          padding: 13px 24px;
          background: #ffffff;
          color: #0f172a;
          border: 1.5px solid #e2e8f0;
          text-decoration: none;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 750;
          transition: all 0.2s;
        }
        .action-btn-shop:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
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
    </>
  );
}
