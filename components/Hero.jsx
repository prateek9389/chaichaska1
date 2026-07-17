"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Hero() {
  const rootRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".hero-eyebrow", { y: 20, opacity: 0, duration: 0.6 })
        .from(".hero-title", { y: 30, opacity: 0, duration: 0.8 }, "-=0.3")
        .from(".hero-sub", { y: 20, opacity: 0, duration: 0.7 }, "-=0.5")
        .from(".hero-cta", { y: 20, opacity: 0, duration: 0.6 }, "-=0.5")
        .from(".hero-clients", { y: 15, opacity: 0, duration: 0.6 }, "-=0.4");
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="home"
      ref={rootRef}
      className="hero-section"
      style={{
        position: "relative",
        minHeight: "95vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflow: "hidden",
        padding: "175px 20px 40px 20px",
        background: "transparent",
      }}
    >


      {/* Subtle top-only overlay to ensure readability */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 45%)",
          zIndex: 2,
        }}
      />

      <div
        className="container"
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 800,
        }}
      >
        {/* Eyebrow badge removed */}

        {/* Heading */}
        <h1
          className="hero-title"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(24px, 5.2vw, 60px)",
            fontWeight: 800,
            lineHeight: 1.2,
            color: "#111111",
            letterSpacing: "-0.02em",
            marginBottom: 10,
            maxWidth: 820,
          }}
        >
          <span style={{ display: "block", whiteSpace: "nowrap" }}>Authentic Handcrafted</span>
          <span style={{ color: "#8a583c", display: "block", whiteSpace: "nowrap" }}>Indian Chai</span>
        </h1>

        {/* Subtitle removed */}

        {/* CTA Button */}
        <a
          href="/shop"
          className="hero-cta"
          style={{
            background: "#8a583c",
            color: "#ffffff",
            padding: "14px 30px",
            borderRadius: "999px",
            fontSize: 15,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            marginTop: 24,
            marginBottom: 32,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.03)";
            e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Order Now
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ overflow: "visible", display: "inline-block" }}
          >
            <path className="steam-line steam-1" d="M8 6c0-1.5 1-1.5 1-3" />
            <path className="steam-line steam-2" d="M12 6c0-1.5 1-1.5 1-3" />
            <path className="steam-line steam-3" d="M16 6c0-1.5 1-1.5 1-3" />
            <path d="M17 9H7c0 0 0 6 5 6s5-6 5-6z" />
            <path d="M17 11h1.5a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1-1.5 1.5H17" />
            <path d="M5 18h14" />
          </svg>
        </a>

        <style>{`
          @media (max-width: 600px) {
            .desc-desktop {
              display: none;
            }
            .hero-section {
              padding: 120px 16px 20px 16px !important;
              min-height: 72vh !important;
            }
            .hero-cta {
              padding: 10px 20px !important;
              font-size: 13.5px !important;
            }
          }
        `}</style>


      </div>
    </section>
  );
}
