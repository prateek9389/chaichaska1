"use client";

import { useState } from "react";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      q: "How does the monthly subscription plan work?",
      a: "Our monthly subscription sends your chosen blends directly to your door every month. You can swap blends, skip a month, or cancel anytime directly from your account page.",
    },
    {
      q: "Are the spices and tea leaves fully organic?",
      a: "Yes, 100%! We partner directly with organic-certified tea estates in Assam & Darjeeling and source premium natural whole spices without preservatives.",
    },
    {
      q: "Can I adjust the spice levels in my subscription?",
      a: "Absolutely. During checkout or in your dashboard, you can request custom ratios for ginger, cardamom, or sugar levels.",
    },
    {
      q: "What is the shelf life of the tea leaves?",
      a: "Since we pack immediately after processing in airtight nitrogen-sealed packages, our blends remain completely fresh for up to 12 months.",
    },
  ];

  const toggleFAQ = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" style={{ padding: "80px 40px", background: "#ffffff" }}>
      {/* Section Header */}
      <div style={{ textAlign: "center", marginBottom: "50px" }}>
        <h3
          style={{
            display: "inline-block",
            background: "#efe3d5",
            color: "#634023",
            padding: "5px 12px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 700,
            marginBottom: "12px",
            letterSpacing: "0.05em",
          }}
        >
          Support
        </h3>
        <h2 style={{ fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 800, color: "#2c1b0d" }}>
          Frequently Asked Questions
        </h2>
      </div>

      {/* Grid Container */}
      <div className="faq-grid">
        {/* Left Side: Image */}
        <div className="faq-image-container">
          <img
            src="/chai-ingredients.png"
            alt="Handcrafted Organic Chai Spices"
            className="faq-image"
          />
        </div>

        {/* Right Side: FAQ list */}
        <div className="faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  background: "#fbf9f6",
                  borderRadius: "14px",
                  border: "1px solid rgba(0, 0, 0, 0.04)",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  style={{
                    width: "100%",
                    padding: "20px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "#2c1b0d",
                  }}
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: "18px", transition: "transform 0.2s", transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                    ＋
                  </span>
                </button>
                {isOpen && (
                  <div
                    style={{
                      padding: "0 24px 20px 24px",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      color: "#5c4f47",
                      borderTop: "1px dashed rgba(0,0,0,0.04)",
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .faq-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 40px;
          align-items: center;
          max-width: 1000px;
          margin: 0 auto;
        }

        .faq-image-container {
          width: 100%;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .faq-image {
          width: 100%;
          height: auto;
          aspect-ratio: 1.15 / 1;
          object-fit: cover;
          display: block;
        }

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 900px) {
          .faq-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }
        }
      `}</style>
    </section>
  );
}
