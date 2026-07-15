"use client";

import { useState } from "react";

export default function Craftsmanship() {
  const steps = [
    {
      id: 1,
      title: "1. Leaf Sourcing",
      desc: "Hand-picked orthodox leaves and rich CTC granules sourced directly from rain-fed Assam gardens.",
      color: "#5c7a4d",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="svg-sway">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.2 2 6a7 7 0 0 1-10 12z" />
          <path d="M9 22v-4" />
        </svg>
      ),
    },
    {
      id: 2,
      title: "2. Spice Selection",
      desc: "Fresh pods of cardamom, ginger roots, cinnamon bark, and cloves selected for our signature blends.",
      color: "#e67e22",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="svg-rotate">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      id: 3,
      title: "3. Sun-Drying",
      desc: "Natural outdoor sun drying process to preserve essential oils and lock in aroma.",
      color: "#d35400",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="svg-sway">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ),
    },
    {
      id: 4,
      title: "4. Hand Crushing",
      desc: "Spices crushed using traditional mortar and pestle to open fibers and release oils.",
      color: "#2980b9",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="svg-rotate">
          <path d="M6 3h12v3H6zM9 6v10H6v3h12v-3h-3V6" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      ),
    },
    {
      id: 5,
      title: "5. Milk Formulation",
      desc: "Balanced formulation of premium organic whole milk and filtered spring water.",
      color: "#16a085",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="svg-sway">
          <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z" />
        </svg>
      ),
    },
    {
      id: 6,
      title: "6. Slow Decoction",
      desc: "Slow simmer brewing method to fully draw spice infusions and rich tea liquors.",
      color: "#c99a2e",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="svg-steam">
          <path className="steam-line steam-1" d="M8 6c0-1.5 1-1.5 1-3" />
          <path className="steam-line steam-2" d="M12 6c0-1.5 1-1.5 1-3" />
          <path className="steam-line steam-3" d="M16 6c0-1.5 1-1.5 1-3" />
          <path d="M17 9H7c0 0 0 6 5 6s5-6 5-6z" fill="currentColor" fillOpacity="0.1" />
          <path d="M17 11h1.5a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1-1.5 1.5H17" />
          <path d="M5 18h14" />
        </svg>
      ),
    },
    {
      id: 7,
      title: "7. Smoky Clay Finish",
      desc: "Pouring the hot tea in fired clay cups (kulhads) to absorb natural earthy notes.",
      color: "#7f8c8d",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="svg-sway">
          <path d="M5 10h14L17 19H7L5 10z" />
          <path d="M6 10c0-3 3-4 6-4s6 1 6 4" />
        </svg>
      ),
    },
    {
      id: 8,
      title: "8. Vacuum Packing",
      desc: "Immediate packaging in oxygen-sealed pouches to preserve freshness and taste.",
      color: "#27ae60",
      iconSvg: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="svg-rotate">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      ),
    },
  ];

  // Triplicate array for smooth infinite scrolling
  const carouselItems = [...steps, ...steps, ...steps];

  return (
    <section id="craftsmanship" style={{ padding: "80px 0", background: "#ffffff", overflow: "hidden" }}>
      <div style={{ textAlign: "center", marginBottom: "40px", padding: "0 20px" }}>
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
          Our Craft
        </h3>
        <h2 style={{ fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 800, color: "#2c1b0d" }}>
          How We Handcraft the Perfect Cup
        </h2>
        <p style={{ color: "#777777", fontSize: "14px", marginTop: "5px" }}>
          Hover on any card to pause and explore the steps in detail.
        </p>
      </div>

      {/* Infinite Scrolling Track */}
      <div className="craft-carousel-container">
        <div className="craft-carousel-track">
          {carouselItems.map((step, idx) => (
            <div key={idx} className="craft-card">
              {/* SVG Icon Container */}
              <div className="craft-icon-wrapper" style={{ background: `${step.color}15`, color: step.color }}>
                {step.iconSvg}
              </div>
              <h3 className="craft-title">{step.title}</h3>
              <p className="craft-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Local Styles & Keyframes */}
      <style>{`
        .craft-carousel-container {
          width: 100%;
          overflow: hidden;
          display: flex;
          position: relative;
          padding: 10px 0;
        }

        .craft-carousel-track {
          display: flex;
          width: max-content;
          gap: 24px;
          animation: scroll-craft 45s linear infinite;
        }

        /* Pause auto-scroll on hover */
        .craft-carousel-container:hover .craft-carousel-track {
          animation-play-state: paused;
        }

        .craft-card {
          width: 320px;
          background: #fbf9f6;
          border-radius: 20px;
          padding: 30px;
          border: 1px solid rgba(0, 0, 0, 0.04);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s, color 0.3s, box-shadow 0.3s;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          cursor: pointer;
        }

        /* Hover card becomes Dark Chocolate with white text and sways icon */
        .craft-card:hover {
          background: #2c1b0d;
          color: #ffffff;
          border-color: #2c1b0d;
          transform: translateY(-8px) scale(1.03);
          box-shadow: 0 15px 30px rgba(44, 27, 13, 0.15);
        }

        .craft-card:hover .craft-title {
          color: #ffffff;
        }

        .craft-card:hover .craft-desc {
          color: rgba(255, 255, 255, 0.9);
        }

        .craft-card:hover .craft-icon-wrapper {
          background: rgba(255, 255, 255, 0.15) !important;
          color: #ffffff !important;
        }

        .craft-icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justifyContent: center;
          margin-bottom: 20px;
          transition: background 0.3s, color 0.3s;
        }

        .craft-title {
          font-size: 17px;
          font-weight: 700;
          color: #2c1b0d;
          margin-bottom: 12px;
          transition: color 0.3s;
        }

        .craft-desc {
          font-size: 13.5px;
          color: #5c4f47;
          line-height: 1.5;
          transition: color 0.3s;
        }

        /* Infinite marquee scroll animation */
        @keyframes scroll-craft {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-344px * 8)); /* Card width + gap * items count */
          }
        }

        /* Micro-animations for SVGs */
        .svg-sway {
          animation: sway 3s ease-in-out infinite alternate;
        }

        .svg-rotate {
          animation: rotate-spice 6s linear infinite;
        }

        .svg-steam .steam-line {
          stroke-dasharray: 6;
          stroke-dashoffset: 12;
          animation: raise-steam 2s linear infinite;
        }

        .svg-steam .steam-2 {
          animation-delay: 0.4s;
        }

        .svg-steam .steam-3 {
          animation-delay: 0.8s;
        }

        @keyframes sway {
          0% { transform: rotate(-8deg); }
          100% { transform: rotate(8deg); }
        }

        @keyframes rotate-spice {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes raise-steam {
          0% { stroke-dashoffset: 12; opacity: 0; }
          50% { opacity: 0.8; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}</style>
    </section>
  );
}
