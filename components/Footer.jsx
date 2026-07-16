"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getContactInfo } from "@/lib/firestore";

export default function Footer() {
  const [contact, setContact] = useState({
    address1: "102 Tea Estate lane, Assam Garden,",
    address2: "India 781001",
    phone: "+91 98765 43210",
    email: "hello@chaico.com"
  });

  useEffect(() => {
    getContactInfo().then(setContact).catch(console.error);
  }, []);

  return (
    <footer
      id="contact"
      style={{
        background: "#2c1b0d",
        color: "#fdf5e9",
        padding: "80px 40px 40px",
        borderRadius: "36px 36px 0 0",
      }}
    >
      <div className="footer-grid">
        <div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 24, fontWeight: 800, color: "#ffffff" }}>
            {contact.brandName || "ChaiCo."}
          </div>
          <p style={{ marginTop: 14, fontSize: 13.5, opacity: 0.85, lineHeight: 1.7, maxWidth: 260 }}>
            {contact.brandDesc || "Freshly brewed spice teas and organic loose blends sourced straight from certified tea farms. Delivered hot and fresh."}
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: 13, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em", color: "#ffffff" }}>
            HQ Address
          </h4>
          <p style={{ fontSize: 13.5, opacity: 0.85, lineHeight: 1.8 }}>
            {contact.address1}
            <br />
            {contact.address2}
            <br />
            {contact.phone}
            <br />
            {contact.email}
          </p>
        </div>

        <div>
          <h4 style={{ fontSize: 13, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.06em", color: "#ffffff" }}>
            Quick Links
          </h4>
          <p style={{ fontSize: 13.5, opacity: 0.85, lineHeight: 2 }}>
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Home</Link>
            <br />
            <Link href="/shop" style={{ color: "inherit", textDecoration: "none" }}>Shop</Link>
            <br />
            <Link href="/orders" style={{ color: "inherit", textDecoration: "none" }}>My Orders</Link>
            <br />
            <Link href="/chaimaker" style={{ color: "inherit", textDecoration: "none", fontWeight: "bold", color: "#f1c40f" }}>⚡ Brewmaster Panel</Link>
            <br />
            <Link href="/admin" style={{ color: "inherit", textDecoration: "none", fontWeight: "bold", color: "#e74c3c" }}>🛡️ Admin Panel</Link>
          </p>
        </div>


      </div>

      <div
        style={{
          marginTop: 60,
          paddingTop: 20,
          borderTop: "1px solid rgba(253,245,233,0.1)",
          textAlign: "center",
          fontSize: 12,
          opacity: 0.65,
        }}
      >
        © 2026 Chai chuska. All rights reserved. Built with love for tea.
      </div>

      <style>{`
        .footer-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          gap: 40px;
          max-width: 1000px;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 600px) {
          .footer-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </footer>
  );
}
