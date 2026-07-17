"use client";

export default function Marquee() {
  const qualities = [
    "🌿 100% Organic Ingredients",
    "☕ Handcrafted Indian Blends",
    "🍃 Directly Sourced from Assam & Darjeeling",
    "✨ Authentic Spiced Masala Chai",
    "🥛 Rich, Creamy & Refreshing",
    "🌱 Sustainably Harvested",
    "🚚 Fast & Fresh Delivery",
    "❤️ Made with Love",
  ];

  const chaiTypes = [
    "Chaska Chai regular masala",
    "Elaichi Ishq cardamom chai",
    "Adrak Punch - extra ginger",
    "Kadak Baat strong double-brew",
    "Tulsi Sukoon - herbal",
    "Green Fix green tea",
    "Chaska Cuppa range",
    "Filter Fauji filter coffee",
    "Insta Josh instant coffee",
    "Kaala Kick black coffee",
    "Thanda Chaska cold coffee",
  ];

  const displayQualities = [...qualities, ...qualities];
  const displayChais = [...chaiTypes, ...chaiTypes];

  // Chai colors to loop through for the tea icon (darker colors for light background)
  const chaiColors = ["#8a3a00", "#c05a00", "#a04000", "#e67e22"];

  return (
    <div className="marquee-wrapper">
      {/* First Marquee: Right to Left */}
      <div className="marquee-container">
        <div className="marquee-content scroll-left">
          {displayQualities.map((item, idx) => (
            <span key={`quality-${idx}`} className="marquee-item">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Second Marquee: Left to Right */}
      <div className="marquee-container marquee-secondary">
        <div className="marquee-content scroll-right">
          {displayChais.map((item, idx) => {
            const color = chaiColors[idx % chaiColors.length];
            return (
              <span key={`chai-${idx}`} className="marquee-item marquee-item-chai">
                {/* Chai Colored Tea Cup Icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ overflow: "visible", flexShrink: 0 }}
                >
                  <path className="steam-line steam-1" d="M8 6c0-1.5 1-1.5 1-3" />
                  <path className="steam-line steam-2" d="M12 6c0-1.5 1-1.5 1-3" />
                  <path className="steam-line steam-3" d="M16 6c0-1.5 1-1.5 1-3" />
                  <path d="M17 9H7c0 0 0 5 5 5s5-5 5-5z" fill={color} fillOpacity="0.15" />
                  <path d="M17 11h1.5a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1-1.5 1.5H17" />
                  <path d="M5 18h14" />
                </svg>
                {item}
              </span>
            );
          })}
        </div>
      </div>

      <style>{`
        .marquee-wrapper {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .marquee-container {
          width: 100%;
          overflow: hidden;
          padding: 16px 0;
          display: flex;
          align-items: center;
        }

        .marquee-secondary {
          border-top: 1px dashed rgba(0, 0, 0, 0.1);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          background: #fdf5e9;
        }

        .marquee-content {
          display: flex;
          white-space: nowrap;
        }

        .scroll-left {
          animation: marquee-scroll-left 28s linear infinite;
        }

        .scroll-right {
          animation: marquee-scroll-right 28s linear infinite;
        }

        .marquee-item {
          font-size: 15px;
          font-weight: 600;
          color: #2c3e2e;
          padding: 0 40px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          letter-spacing: 0.02em;
        }

        .marquee-item-chai {
          font-size: 15px;
          color: #4a2c11;
          font-weight: 700;
        }

        @keyframes marquee-scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes marquee-scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
