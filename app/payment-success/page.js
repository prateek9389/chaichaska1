"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const type = searchParams.get("type"); // "checkout" or "wallet"

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

        <div className="receipt-box" style={{ marginTop: "24px", padding: "16px", background: "#fbf9f6", borderRadius: "12px", border: "1px dashed rgba(0,0,0,0.1)" }}>
          <div className="receipt-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#666" }}>Reference ID:</span>
            <strong>{orderId}</strong>
          </div>
          <div className="receipt-row" style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#666" }}>Status:</span>
            <strong style={{ color: "#27ae60" }}>PAID</strong>
          </div>
        </div>

        <div style={{ marginTop: "32px" }}>
          {type === "wallet" ? (
            <Link href="/wallet" className="btn-continue-checkout" style={{ display: "inline-block", padding: "14px 32px", background: "#8a583c", color: "#fff", textDecoration: "none", borderRadius: "8px", fontWeight: "bold" }}>
              Return to Wallet
            </Link>
          ) : (
            <Link href="/" className="btn-continue-checkout" style={{ display: "inline-block", padding: "14px 32px", background: "#8a583c", color: "#fff", textDecoration: "none", borderRadius: "8px", fontWeight: "bold" }}>
              Return to Home
            </Link>
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
