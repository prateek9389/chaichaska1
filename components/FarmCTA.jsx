"use client";

export default function FarmCTA() {
  return (
    <section
      id="farm-cta"
      style={{
        position: "relative",
        padding: "150px 20px",
        minHeight: "620px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#000000",
      }}
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
          opacity: 0.8,
        }}
      >
        <source src="/farm-fresh.mp4" type="video/mp4" />
      </video>

      {/* Dark Radial + Linear Overlay for Premium Readability */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(circle, rgba(20, 10, 5, 0.4) 0%, rgba(10, 5, 2, 0.85) 100%)",
          zIndex: 2,
        }}
      />

      {/* Centered Content */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          textAlign: "center",
          maxWidth: "680px",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#efe3d5",
            padding: "6px 14px",
            borderRadius: "999px",
            fontSize: "11.5px",
            fontWeight: 600,
            marginBottom: "18px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Directly Sourced
        </div>

        <h2
          style={{
            fontSize: "clamp(28px, 4.5vw, 42px)",
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#ffffff",
            marginBottom: "16px",
            letterSpacing: "-0.01em",
          }}
        >
          Tea is Fresh From Farms
        </h2>

        <p
          style={{
            fontSize: "clamp(14px, 1.8vw, 16px)",
            lineHeight: 1.6,
            color: "#efe3d5",
            opacity: 0.9,
            marginBottom: "32px",
          }}
        >
          Every leaf is hand-picked directly from the lush, sun-kissed gardens of
          Assam and Darjeeling. Freshly processed and packaged immediately to preserve
          natural richness, delivering the authentic aroma and taste in every single cup.
        </p>

        {/* CTA Button with Animated Tea Icon */}
        <a
          href="#buy-teas"
          style={{
            background: "#ffffff",
            color: "#4e3629",
            padding: "14px 32px",
            borderRadius: "999px",
            fontSize: "14.5px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            border: "none",
            boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.03)";
            e.currentTarget.style.boxShadow = "0 12px 24px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.2)";
          }}
        >
          Buy Now
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ overflow: "visible", display: "inline-block" }}
          >
            <path className="steam-line steam-1" d="M8 6c0-1.5 1-1.5 1-3" />
            <path className="steam-line steam-2" d="M12 6c0-1.5 1-1.5 1-3" />
            <path className="steam-line steam-3" d="M16 6c0-1.5 1-1.5 1-3" />
            <path d="M17 9H7c0 0 0 5 5 5s5-5 5-5z" fill="#4e3629" fillOpacity="0.1" />
            <path d="M17 11h1.5a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1-1.5 1.5H17" />
            <path d="M5 18h14" />
          </svg>
        </a>
      </div>
    </section>
  );
}
