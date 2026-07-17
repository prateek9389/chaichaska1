"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function PaymentDeclineContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const type = searchParams.get("type"); // "checkout" or "wallet"

  return (
    <div className="decline-layout">
      <div className="decline-card">
        <div className="decline-badge-circle">!</div>
        <h2 className="decline-title">Payment Declined or Cancelled</h2>
        <p className="decline-message">
          We couldn't process your payment. This might be due to a network issue, an invalid UPI pin, or you might have cancelled the transaction.
        </p>

        {orderId && (
          <div className="receipt-box" style={{ marginTop: "24px", padding: "16px", background: "#fbf9f6", borderRadius: "12px", border: "1px dashed rgba(0,0,0,0.1)" }}>
            <div className="receipt-row" style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#666" }}>Reference ID:</span>
              <strong>{orderId}</strong>
            </div>
          </div>
        )}

        <div style={{ marginTop: "32px", display: "flex", gap: "16px", justifyContent: "center" }}>
          {type === "wallet" ? (
            <Link href="/wallet" className="btn-retry" style={{ display: "inline-block", padding: "14px 32px", background: "#8a583c", color: "#fff", textDecoration: "none", borderRadius: "8px", fontWeight: "bold" }}>
              Try Again
            </Link>
          ) : (
            <Link href="/checkout" className="btn-retry" style={{ display: "inline-block", padding: "14px 32px", background: "#8a583c", color: "#fff", textDecoration: "none", borderRadius: "8px", fontWeight: "bold" }}>
              Retry Payment
            </Link>
          )}
          <Link href="/" style={{ display: "inline-block", padding: "14px 32px", background: "#fbf9f6", color: "#2c1b0d", border: "1px solid #ddd", textDecoration: "none", borderRadius: "8px", fontWeight: "bold" }}>
            Return Home
          </Link>
        </div>
      </div>

      <style>{`
        .decline-layout {
          min-height: calc(100vh - 200px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          background: #fcfaf7;
        }
        .decline-card {
          background: #fff;
          padding: 40px;
          border-radius: 24px;
          text-align: center;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(0,0,0,0.05);
        }
        .decline-badge-circle {
          width: 70px;
          height: 70px;
          background: #e74c3c;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 20px;
          font-weight: bold;
        }
        .decline-title {
          font-size: 24px;
          font-weight: 800;
          color: #2c1b0d;
          margin-bottom: 12px;
        }
        .decline-message {
          color: #666;
          font-size: 15px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

export default function PaymentDeclinePage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<div style={{ textAlign: "center", padding: "100px" }}>Loading...</div>}>
        <PaymentDeclineContent />
      </Suspense>
      <Footer />
    </>
  );
}
