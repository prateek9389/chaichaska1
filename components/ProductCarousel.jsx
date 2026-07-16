"use client";

import { useState, useEffect } from "react";
import { getProducts } from "@/lib/firestore";
import Link from "next/link";

export default function ProductCarousel() {
  const [teas, setTeas] = useState([]);

  useEffect(() => {
    getProducts().then(all => setTeas(all));
  }, []);

  // Duplicate items to ensure infinite seamless scrolling loop
  const carouselItems = [...teas, ...teas, ...teas];

  return (
    <section id="product-carousel-section" style={{ padding: "60px 0", background: "#ffffff", overflow: "hidden" }}>
      <div style={{ textAlign: "center", marginBottom: "35px", padding: "0 20px" }}>
        <h2 style={{ fontSize: "clamp(22px, 3vw, 28px)", fontWeight: 800, color: "#2c1b0d" }}>
          Trending Blends
        </h2>
        <p style={{ color: "#777777", fontSize: "14px", marginTop: "5px" }}>
          Discover our most popular handcrafted teas.
        </p>
      </div>

      {/* Infinite scrolling carousel container */}
      <div className="carousel-container">
        <div className="carousel-track">
          {carouselItems.map((tea, idx) => {
            const uniqueId = `${tea.id}-${idx}`;
            return (
              <div
                key={uniqueId}
                className="carousel-card"
              >
                <Link href={`/product/${tea.id}`} style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", height: "100%" }}>
                  <div className="card-media-wrapper">
                    <img src={tea.image} alt={tea.name} className="card-media" />
                  </div>
                  <div className="card-details">
                    <h3 className="card-name">{tea.name}</h3>
                    <div className="card-footer">
                      <span className="card-price">{tea.price}</span>
                      <button className="card-btn">Order Now</button>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Local Styles */}
      <style>{`
        .carousel-container {
          width: 100%;
          overflow: hidden;
          display: flex;
          position: relative;
          padding: 10px 0;
        }

        .carousel-track {
          display: flex;
          width: max-content;
          gap: 24px;
          animation: scroll-carousel 40s linear infinite;
        }

        .carousel-container:hover .carousel-track {
          animation-play-state: paused;
        }

        .carousel-card {
          width: 250px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.015);
          overflow: hidden;
          flex-shrink: 0;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .carousel-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 12px 25px rgba(44, 27, 13, 0.08);
          border-color: rgba(44, 27, 13, 0.15);
        }

        .card-media-wrapper {
          width: 100%;
          aspect-ratio: 1 / 1;
          position: relative;
          background: #000000;
          overflow: hidden;
        }

        .card-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .card-details {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .card-name {
          font-size: 14.5px;
          font-weight: 700;
          color: #2c1b0d;
          margin-bottom: 12px;
          line-height: 1.25;
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px dashed rgba(0, 0, 0, 0.05);
        }

        .card-price {
          font-size: 14px;
          font-weight: 800;
          color: #8a583c;
        }

        .card-btn {
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .card-btn:hover {
          background: #4e3629;
        }

        @keyframes scroll-carousel {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-274px * 6)); /* Card width + gap * items count */
          }
        }
      `}</style>
    </section>
  );
}
