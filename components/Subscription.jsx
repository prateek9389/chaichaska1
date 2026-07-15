"use client";

export default function Subscription() {
  return (
    <section
      id="subscription"
      style={{
        padding: 0,
        background: "#fbf9f6",
        overflow: "hidden",
      }}
    >
      <div className="sub-grid">
        {/* Left Content Column */}
        <div className="sub-left">
          {/* Eyebrow badge */}
          <div className="sub-eyebrow">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 6 }}
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.2 2 6a7 7 0 0 1-10 12z" />
              <path d="M9 22v-4" />
            </svg>
            100% NATURAL &amp; FRESH
          </div>

          {/* Heading */}
          <h2 className="sub-title">
            Good Chai. <br />
            <span style={{ color: "#8a583c" }}>Good Life.</span>
          </h2>

          {/* Description */}
          <p className="sub-desc">
            Sourced from organic family-owned gardens. Fresh whole spices, authentic
            recipes, and premium CTC tea leaves blended daily in small batches.
            No artificial coloring or preservatives - just pure, nourishing goodness in every sip.
          </p>

          {/* CTA Buttons */}
          <div className="sub-actions">
            <a href="#subscribe" className="sub-btn-primary">
              Subscribe Now
              <span className="arrow-circle">→</span>
            </a>
            <a href="#plans" className="sub-btn-secondary">
              Explore Plans
            </a>
          </div>

          {/* Key Features row */}
          <div className="sub-features">
            <div className="feature-item">
              <div className="feature-icon">🌿</div>
              <div>
                <h4 className="feature-label">100% Natural</h4>
                <p className="feature-sub">Pure whole spices</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🍵</div>
              <div>
                <h4 className="feature-label">Fresh &amp; Healthy</h4>
                <p className="feature-sub">Blended in batches</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🚚</div>
              <div>
                <h4 className="feature-label">Fast Delivery</h4>
                <p className="feature-sub">Right to your door</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Video Column (2px padding from top, bottom, and right) */}
        <div className="sub-right">
          <div className="sub-image-container">
            <video
              src="/sub-video.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="sub-main-image"
            />
            {/* Float Badge */}
            <div className="sub-badge">
              <div className="sub-badge-inner">
                <span className="badge-title">Chai Club</span>
                <span className="badge-price">₹299/mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local styles */}
      <style>{`
        .sub-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          align-items: stretch;
          gap: 0;
        }

        .sub-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 60px 40px;
          justify-content: center;
        }

        .sub-eyebrow {
          display: inline-flex;
          align-items: center;
          color: #5c7a4d;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.05em;
          margin-bottom: 20px;
        }

        .sub-title {
          font-size: clamp(32px, 4.5vw, 50px);
          font-weight: 800;
          color: #2c1b0d;
          line-height: 1.1;
          margin-bottom: 20px;
        }

        .sub-desc {
          font-size: 14.5px;
          color: #5c4f47;
          line-height: 1.55;
          margin-bottom: 30px;
          max-width: 500px;
        }

        .sub-actions {
          display: flex;
          gap: 16px;
          margin-bottom: 40px;
          flex-wrap: wrap;
        }

        .sub-btn-primary {
          background: #2c1b0d;
          color: #ffffff;
          padding: 12px 28px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 13.5px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: background 0.2s, transform 0.2s;
        }

        .sub-btn-primary:hover {
          background: #4e3629;
          transform: translateY(-2px);
        }

        .arrow-circle {
          display: inline-flex;
          width: 22px;
          height: 22px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .sub-btn-secondary {
          background: transparent;
          color: #2c1b0d;
          padding: 12px 28px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 13.5px;
          border: 1px solid rgba(44, 27, 13, 0.2);
          transition: background 0.2s, border-color 0.2s;
        }

        .sub-btn-secondary:hover {
          background: rgba(44, 27, 13, 0.04);
          border-color: rgba(44, 27, 13, 0.4);
        }

        .sub-features {
          display: flex;
          gap: 24px;
          width: 100%;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          padding-top: 24px;
          flex-wrap: wrap;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .feature-icon {
          font-size: 20px;
          width: 36px;
          height: 36px;
          background: rgba(92, 122, 77, 0.08);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justifyContent: center;
        }

        .feature-label {
          font-size: 13px;
          font-weight: 700;
          color: #2c1b0d;
        }

        .feature-sub {
          font-size: 11px;
          color: #777;
        }

        .sub-right {
          padding: 2px 2px 2px 0;
          display: flex;
          align-items: stretch;
        }

        .sub-image-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 440px;
          background: #000;
          border-radius: 0 16px 16px 0;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
        }

        .sub-main-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .sub-badge {
          position: absolute;
          top: 25px;
          right: 25px;
          width: 100px;
          height: 100px;
          background: #5c7a4d;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justifyContent: center;
          box-shadow: 0 10px 25px rgba(92, 122, 77, 0.3);
          border: 4px solid #ffffff;
          transform: rotate(-12deg);
          animation: badge-float 4s ease-in-out infinite alternate;
          z-index: 10;
        }

        .sub-badge-inner {
          text-align: center;
          color: #ffffff;
          display: flex;
          flex-direction: column;
        }

        .badge-title {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          opacity: 0.9;
        }

        .badge-price {
          font-size: 15px;
          font-weight: 800;
          margin-top: 2px;
        }

        @keyframes badge-float {
          0% {
            transform: rotate(-12deg) translateY(0);
          }
          100% {
            transform: rotate(-8deg) translateY(-8px);
          }
        }

        @media (max-width: 991px) {
          .sub-grid {
            grid-template-columns: 1fr;
          }
          .sub-right {
            padding: 0 2px 2px 2px;
          }
          .sub-image-container {
            border-radius: 0 0 16px 16px;
            min-height: 320px;
          }
        }
      `}</style>
    </section>
  );
}
