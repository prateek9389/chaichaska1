"use client";

export default function Reviews() {
  const reviews = [
    {
      name: "Aisha Sharma",
      rating: 5,
      text: "The Masala Chai subscription is a lifesaver! Every morning feels like a visit to a tapri, but with cleaner ingredients.",
      role: "Verified Buyer",
    },
    {
      name: "Rohan Kapoor",
      rating: 5,
      text: "Elaichi tea has just the right amount of cardamom warmth. The live hover video previews are amazing too!",
      role: "Tea Connoisseur",
    },
    {
      name: "Vikram Malhotra",
      rating: 5,
      text: "Tandoori Smoky Chai is simply spectacular. It has that authentic mud pot aroma that is hard to find anywhere else.",
      role: "Verified Buyer",
    },
  ];

  return (
    <section id="reviews" style={{ padding: "80px 40px", background: "#fbf9f6" }}>
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
          Testimonials
        </h3>
        <h2 style={{ fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 800, color: "#2c1b0d" }}>
          What Our Chai Lovers Say
        </h2>
      </div>

      <div className="reviews-grid">
        {reviews.map((rev, idx) => (
          <div key={idx} className="review-card">
            <div style={{ display: "flex", color: "#c99a2e", gap: 3, marginBottom: 12 }}>
              {Array.from({ length: rev.rating }).map((_, i) => (
                <span key={i}>★</span>
              ))}
            </div>
            <p className="review-text">"{rev.text}"</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 className="review-name">{rev.name}</h4>
              <span className="review-role">{rev.role}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .reviews-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        .review-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 30px;
          border: 1px solid rgba(0, 0, 0, 0.04);
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .review-card:hover {
          transform: translateY(-4px);
        }

        .review-text {
          font-size: 14px;
          color: #5c4f47;
          line-height: 1.6;
          font-style: italic;
          margin-bottom: 20px;
          flex-grow: 1;
        }

        .review-name {
          font-size: 14.5px;
          fontWeight: 700;
          color: #2c1b0d;
        }

        .review-role {
          font-size: 11px;
          color: #5c7a4d;
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .reviews-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
