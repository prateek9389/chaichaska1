"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PizzaGraphic from "./PizzaGraphic";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const items = [
  { name: "Vegetable Pizza", price: "13.99", bg: "#d7e4c0", seed: 3 },
  { name: "Mushroom Pizza", price: "15.99", bg: "#f3cfc9", seed: 4 },
  { name: "Mix Veg Pizza", price: "13.99", bg: "#eddca0", seed: 5 },
];

function MenuCard({ item, index }) {
  const [qty, setQty] = useState(1);
  return (
    <div
      className="menu-card"
      style={{
        background: "#fff",
        borderRadius: 26,
        overflow: "hidden",
        boxShadow: "0 20px 40px -20px rgba(36,26,21,0.25)",
      }}
    >
      <div
        style={{
          background: item.bg,
          padding: "38px 20px 0",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <PizzaGraphic size={170} toppingSeed={item.seed} />
      </div>
      <div style={{ padding: "20px 22px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>
            {item.name}
          </h3>
          <span style={{ color: "var(--red)", fontWeight: 700 }}>${item.price}</span>
        </div>
        <p style={{ marginTop: 8, fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
          Double pepperoni, mozzarella, spicy marinara, crushed red pepper, black olives.
        </p>
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--cream-deep)",
              borderRadius: 999,
              padding: "6px 12px",
            }}
          >
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              style={{ background: "transparent", fontSize: 16, fontWeight: 700 }}
            >
              −
            </button>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              style={{ background: "transparent", fontSize: 16, fontWeight: 700, color: "var(--red)" }}
            >
              +
            </button>
          </div>
          <button className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 13 }}>
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Menu() {
  const rootRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".menu-title", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        scrollTrigger: { trigger: rootRef.current, start: "top 75%" },
      });
      gsap.from(".menu-card", {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: ".menu-grid", start: "top 78%" },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="menu" ref={rootRef} style={{ padding: "90px 0", background: "var(--cream-deep)" }}>
      <div className="container">
        <div className="menu-title" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 50px" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            The Menu
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: 700 }}>
            Your <span style={{ color: "var(--red)", fontStyle: "italic" }}>Delicious</span> Pizza Starts Here
          </h2>
          <p style={{ marginTop: 14, color: "var(--ink-soft)" }}>
            Gather your friends and family and enjoy the best pizza in town.
            Freshly made and delivered hot!
          </p>
        </div>

        <div
          className="menu-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 26,
          }}
        >
          {items.map((item, i) => (
            <MenuCard item={item} index={i} key={item.name} />
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 46 }}>
          <a href="#order" className="btn btn-dark">
            View Our Menu
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .menu-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
