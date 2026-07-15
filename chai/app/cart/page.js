"use client";

import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const { cartItems, getCartTotal, removeFromCart, updateQuantity, isLoaded } = useCart();
  const router = useRouter();

  if (!isLoaded) {
    return <div style={{ background: "#fcfaf7", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><h2>Loading Cart...</h2></div>;
  }

  const subtotal = getCartTotal();

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100vh", color: "#2c1b0d", width: "100vw", overflowX: "hidden" }}>
      <Navbar />

      <div style={{ width: "100%", maxWidth: "1180px", margin: "0 auto", padding: "120px 20px 60px" }}>
        <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 900, marginBottom: "8px" }}>Your Cart</h1>
        <p style={{ fontSize: "16px", color: "#555", marginBottom: "40px" }}>Review your selected items before checkout.</p>

        {cartItems.length === 0 ? (
          <div style={{ background: "#fff", padding: "60px", borderRadius: "20px", textAlign: "center", boxShadow: "0 15px 40px rgba(44, 27, 13, 0.05)" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "16px" }}>Your cart is empty</h2>
            <p style={{ color: "#666", marginBottom: "30px" }}>Looks like you haven't added any chai to your cart yet.</p>
            <button
              onClick={() => router.push("/#our-blends")}
              style={{
                background: "#2c1b0d",
                color: "#ffffff",
                padding: "16px 32px",
                borderRadius: "30px",
                fontSize: "16px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              Explore Our Teas
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "40px", flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Cart Items List */}
            <div style={{ flex: "1 1 600px" }}>
              <div style={{ background: "#fff", padding: "30px", borderRadius: "20px", boxShadow: "0 15px 40px rgba(44, 27, 13, 0.05)" }}>
                {cartItems.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "20px", padding: "20px 0", borderBottom: idx < cartItems.length - 1 ? "1px solid #eee" : "none", alignItems: "center" }}>
                    <img src={item.image} alt={item.name} style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "12px", background: "#f5f5f7" }} />
                    <div style={{ flexGrow: 1 }}>
                      <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 4px" }}>{item.name}</h3>
                      <p style={{ fontSize: "14px", color: "#666", margin: "0 0 8px" }}>Sugar: {item.sugar}</p>
                      {item.addonsList && item.addonsList.length > 0 ? (
                        <div style={{ marginBottom: "8px" }}>
                          {item.addonsList.map((a, i) => (
                            <p key={i} style={{ fontSize: "12px", color: "#8a583c", margin: "0 0 4px" }}>
                              + {a.name} (₹{a.priceVal})
                            </p>
                          ))}
                        </div>
                      ) : item.addons ? (
                        <p style={{ fontSize: "12px", color: "#8a583c", margin: "0 0 8px" }}>+ {item.addons}</p>
                      ) : null}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", border: "1px solid #ddd", borderRadius: "30px", padding: "4px 8px" }}>
                          <button onClick={() => updateQuantity(idx, item.quantity - 1)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "18px", width: "24px", color: "#666" }}>-</button>
                          <span style={{ fontSize: "14px", fontWeight: 700, padding: "0 12px" }}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(idx, item.quantity + 1)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "18px", width: "24px", color: "#666" }}>+</button>
                        </div>
                        <button onClick={() => removeFromCart(idx)} style={{ background: "transparent", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}>Remove</button>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {item.basePrice && (
                        <p style={{ fontSize: "13px", color: "#888", marginBottom: "4px" }}>
                          Chai: ₹{item.basePrice * item.quantity}
                        </p>
                      )}
                      <p style={{ fontSize: "18px", fontWeight: 800 }}>
                        Total: ₹{(parseInt(String(item.price).replace(/[^0-9]/g, "")) || 0) * item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Summary */}
            <div style={{ flex: "1 1 350px" }}>
              <div style={{ background: "#fff", padding: "30px", borderRadius: "20px", boxShadow: "0 15px 40px rgba(44, 27, 13, 0.05)" }}>
                <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "24px" }}>Order Summary</h3>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", fontSize: "15px", color: "#555" }}>
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", fontSize: "15px", color: "#555" }}>
                  <span>Delivery</span>
                  <span>Calculated at checkout</span>
                </div>
                <div style={{ borderTop: "2px dashed #eee", margin: "20px 0" }}></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", fontSize: "18px", fontWeight: 800 }}>
                  <span>Estimated Total</span>
                  <span>₹{subtotal}</span>
                </div>
                <button
                  onClick={() => router.push("/checkout")}
                  style={{
                    width: "100%",
                    background: "#27ae60",
                    color: "#ffffff",
                    padding: "18px",
                    borderRadius: "30px",
                    fontSize: "16px",
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 10px 20px rgba(39, 174, 96, 0.2)"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
