"use client";

import { useState, useEffect } from "react";
import { getProducts } from "@/lib/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function ChaiShowcase() {
  const router = useRouter();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);


  const [teas, setTeas] = useState([]);
  
  useEffect(() => {
    getProducts().then(all => {
      // Show 8 products for 4x2 grid
      setTeas(all.slice(0, 8));
    });
  }, []);

  const handleAddToCart = (tea) => {
    if (!user) {
      router.push(`/login?redirect=/product/${tea.id}`);
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === tea.id);
      if (existing) {
        return prev.map((item) =>
          item.id === tea.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...tea, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateQuantity = (id, delta) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const handleCardClick = (e, id) => {
    if (e.target.tagName === "BUTTON" || e.target.closest(".add-to-cart-btn")) {
      return;
    }
    router.push(`/product/${id}`);
  };

  return (
    <section id="our-blends" style={{ padding: "60px 40px", background: "#ffffff" }}>
      <div>
        {/* Section Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              display: "inline-block",
              background: "#efe3d5",
              color: "#634023",
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Our Menu
          </div>
          <h2 style={{ fontSize: "clamp(24px, 3.5vw, 34px)", fontWeight: 800, color: "#111111" }}>
            Explore Our Premium Handcrafted Blends
          </h2>
          <p style={{ color: "#666666", fontSize: "14.5px", marginTop: "6px" }}>
            Freshly brewed and spiced traditional teas to elevate your senses.
          </p>
        </div>

        {/* Full Width Layout */}
        <div className="showcase-grid">
          <div className="cards-column">
            <div className="cards-grid">
              {teas.map((tea) => (
                <div
                  key={tea.id}
                  className="tea-card"
                  onClick={(e) => handleCardClick(e, tea.id)}
                  style={{ cursor: "pointer" }}
                >
                  <Link href={`/product/${tea.id}`}>
                    <img src={tea.image} alt={tea.name} className="tea-image" />
                  </Link>

                  {/* Header Row: Title & Mini Icon */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <Link href={`/product/${tea.id}`} style={{ textDecoration: "none" }}>
                      <h3 className="tea-title">{tea.name}</h3>
                    </Link>
                    <div className="tea-icon-mini" style={{ background: `${tea.color}15`, color: tea.color }}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ overflow: "visible" }}
                      >
                        <path d="M17 9H7c0 0 0 6 5 6s5-6 5-6z" />
                        <path d="M17 11h1.5a1.5 1.5 0 0 1 1.5 1.5v0a1.5 1.5 0 0 1-1.5 1.5H17" />
                        <path d="M5 18h14" />
                      </svg>
                    </div>
                  </div>

                  <p className="tea-desc">{tea.desc}</p>

                  {/* Price & Action */}
                  <div className="tea-footer">
                    <span className="tea-price">{tea.price}</span>
                    <button onClick={() => handleAddToCart(tea)} className="add-to-cart-btn">
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div
        className="cart-sidebar"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "400px",
          maxWidth: "100%",
          height: "100vh",
          background: "#ffffff",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
          zIndex: 1000,
          transform: isCartOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          padding: "30px 24px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#111111" }}>
            Your Cart ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
          </h3>
          <button
            onClick={() => setIsCartOpen(false)}
            style={{
              background: "transparent",
              fontSize: "22px",
              fontWeight: "bold",
              cursor: "pointer",
              color: "#111111",
              border: "none",
            }}
          >
            ✕
          </button>
        </div>

        {/* Cart Items List */}
        <div style={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: "center", marginTop: "60px", color: "#888" }}>
              <span style={{ fontSize: "40px", display: "block", marginBottom: "10px" }}>🛒</span>
              <p style={{ fontSize: "14px", fontWeight: 500 }}>Your cart is empty.</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  gap: "12px",
                  paddingBottom: "16px",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  alignItems: "center",
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: "60px", height: "60px", borderRadius: "8px", objectFit: "cover" }}
                />
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#111111" }}>{item.name}</h4>
                  <p style={{ fontSize: "13px", color: "#666", marginTop: "2px" }}>{item.price}</p>

                  {/* Quantity controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      style={{
                        width: "22px",
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#f0f0f0",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      style={{
                        width: "22px",
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#f0f0f0",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveFromCart(item.id)}
                  style={{
                    background: "transparent",
                    color: "#e2123a",
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "20px", marginTop: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "14.5px", fontWeight: 600, color: "#555" }}>Subtotal</span>
              <span style={{ fontSize: "18px", fontWeight: 800, color: "#111111" }}>
                ₹{cartItems.reduce((acc, item) => acc + parseInt(item.price.replace("₹", "")) * item.quantity, 0)}
              </span>
            </div>
            <button
              onClick={() => {
                if (!user) {
                  router.push("/login?redirect=/shop");
                  return;
                }
                const first = cartItems[0];
                if (first) router.push(`/checkout?productId=${first.id}&quantity=${first.quantity}`);
              }}
              style={{
                width: "100%",
                background: "#000",
                color: "#fff",
                padding: "14px",
                borderRadius: "999px",
                fontWeight: 600,
                fontSize: "14.5px",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#333")}
              onMouseLeave={(e) => (e.target.style.background = "#000")}
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>

      {/* Backdrop Overlay */}
      {isCartOpen && (
        <div
          onClick={() => setIsCartOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.25)",
            zIndex: 999,
          }}
        />
      )}

      {/* Styles */}
      <style>{`
        .showcase-grid {
          display: block;
          width: 100%;
        }

        .video-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .video-overlay {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 10;
        }

        .live-badge {
          background: #e2123a;
          color: #ffffff;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          box-shadow: 0 4px 10px rgba(226, 18, 58, 0.3);
          display: inline-block;
        }

        .cards-column {
          display: flex;
          flex-direction: column;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .tea-card {
          background: #ffffff;
          border-radius: 18px;
          padding: 16px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.01);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
        }

        .tea-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
        }

        .tea-image {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          object-fit: cover;
          margin-bottom: 16px;
        }

        .tea-icon-mini {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justifyContent: center;
          flex-shrink: 0;
        }

        .tea-title {
          font-size: 14.5px;
          font-weight: 700;
          color: #111111;
          margin-bottom: 8px;
          line-height: 1.2;
        }

        .tea-desc {
          font-size: 12.5px;
          color: #666666;
          line-height: 1.4;
          margin-bottom: 16px;
          flex-grow: 1;
        }

        .tea-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px dashed rgba(0, 0, 0, 0.06);
          flex-wrap: wrap;
          gap: 8px;
        }

        .tea-price {
          font-size: 14.5px;
          font-weight: 800;
          color: #111111;
          white-space: nowrap;
        }

        .add-to-cart-btn {
          background: #000000;
          color: #ffffff;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          transition: background 0.2s, transform 0.2s;
          white-space: nowrap;
        }

        .add-to-cart-btn:hover {
          background: #333333;
          transform: scale(1.03);
        }

        .add-to-cart-btn:active {
          transform: scale(0.97);
        }

        @media (max-width: 1200px) {
          .showcase-grid {
            grid-template-columns: 1fr;
          }
          .video-column {
            min-height: 350px;
          }
        }

        @media (max-width: 900px) {
          .cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
