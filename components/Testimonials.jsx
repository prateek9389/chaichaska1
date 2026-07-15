"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const reviews = [
  {
    quote:
      "I've tried many pizza places, but nothing compares to this. The crust is perfectly crispy, the cheese melts in your mouth, and the toppings are always fresh and flavourful.",
    name: "Ayesha K.",
    role: "Food Blogger, Mumbai",
    bg: "#d7e4c0",
  },
  {
    quote:
      "Every bite feels like a trip to Italy. The ingredients are always fresh, the sauce is rich, and the flavors are just right. Plus, the delivery is super fast.",
    name: "Rahul Mehra",
    role: "Pizza Enthusiast",
    bg: "#f3cfc9",
  },
  {
    quote:
      "I love the variety of options and how each pizza is crafted with care. The crust has the perfect balance of crunch and chew, and the toppings are always generously spread.",
    name: "Emily Robinson",
    role: "Marketing Executive",
    bg: "#eddca0",
  },
];

export default function Testimonials() {
  const rootRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".rev-title", {
        y: 30,
        opacity: 0,
        duration: 0.7,
        scrollTrigger: { trigger: rootRef.current, start: "top 78%" },
      });
      gsap.from(".rev-card", {
        y: 50,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: ".rev-grid", start: "top 80%" },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="reviews" ref={rootRef} style={{ padding: "90px 0" }}>
      <div className="container">
        <div className="rev-title" style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 46px" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Testimonials
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: 700 }}>
            What Our <span style={{ color: "var(--red)", fontStyle: "italic" }}>Customers</span> Are Saying!
          </h2>
          <p style={{ marginTop: 14, color: "var(--ink-soft)" }}>
            We love making delicious pizzas, but hearing how much you enjoy
            them is the real reward.
          </p>
        </div>

        <div className="rev-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {reviews.map((r) => (
            <div
              key={r.name}
              className="rev-card"
              style={{
                background: r.bg,
                borderRadius: 22,
                padding: "26px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 220,
              }}
            >
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--ink)" }}>“{r.quote}”</p>
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "var(--ink)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {r.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .rev-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
