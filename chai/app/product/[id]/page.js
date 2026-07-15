"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProductById, getProducts, getAddons, submitProductFeedback, getApprovedFeedbackForProduct } from "@/lib/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

export default function ProductDetailPage({ params }) {
  const productId = params.id;
  const router = useRouter();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [addons, setAddons] = useState([]);
  const [crossSellTeas, setCrossSellTeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const p = await getProductById(productId);
        const a = await getAddons();
        const all = await getProducts();
        
        let finalP = p || all.find(item => item.id === productId) || all[0];
        if (finalP && !finalP.gallery) {
          finalP.gallery = [
            { type: "image", url: finalP.image || "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg" },
            { type: "video", url: "/sub-video.mp4" }
          ];
        }
        setProduct(finalP);
        setAddons(a);
        setCrossSellTeas(all.filter(t => String(t.id) !== String(productId)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productId]);

  // Active Gallery Media
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const [sugarLevel, setSugarLevel] = useState("with"); // "none" | "with"

  const handleNextMedia = () => {
    setActiveMediaIndex((prev) => (prev + 1) % product.gallery.length);
  };

  const handlePrevMedia = () => {
    setActiveMediaIndex((prev) => (prev - 1 + product.gallery.length) % product.gallery.length);
  };

  // Subscription Type selection
  const [purchaseType, setPurchaseType] = useState("one-time");

  // Quantity selection
  const [quantity, setQuantity] = useState(1);

  // Addons Modal State
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState("sugar"); // "sugar" | "addons"
  const [selectedAddons, setSelectedAddons] = useState([]);

  // Review System State
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (product) {
      getApprovedFeedbackForProduct(product.id).then(setReviews).catch(console.error);
    }
  }, [product]);

  const handleSubmitReview = async () => {
    if (!user) {
      alert("Please login to submit a review.");
      router.push("/login?redirect=/product/" + productId);
      return;
    }
    if (reviewRating < 1 || reviewRating > 5) return;
    setSubmittingReview(true);
    try {
      await submitProductFeedback({
        productId: product.id,
        productName: product.name,
        userId: user.uid,
        userName: user.email.split('@')[0],
        rating: reviewRating,
        comment: reviewComment
      });
      setSuccessMessage("Submitted");
      setShowReviewModal(false);
      setReviewComment("");
      setReviewRating(5);
    } catch (e) {
      setSuccessMessage("Error submitting review. Please try again.");
    }
    setSubmittingReview(false);
  };


  const { addToCart } = useCart();

  // Actions
  const handlePurchase = () => {
    setModalStep("sugar");
    setIsAddonModalOpen(true);
  };

  const toggleAddon = (addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      }
      return [...prev, addon];
    });
  };

  const handleFinishCheckout = () => {
    const addonIds = selectedAddons.map((a) => a.id).join(",");
    
    const basePrice = parseInt(String(product.price).replace(/[^0-9]/g, "")) || 0;
    const addonsTotal = selectedAddons.reduce((sum, a) => {
      return sum + (parseInt(String(a.price).replace(/[^0-9]/g, "")) || 0);
    }, 0);
    const finalPrice = basePrice + addonsTotal;

    const itemToAdd = {
      id: product.id,
      name: product.name,
      price: `₹${finalPrice}`,
      basePrice: basePrice,
      image: product.image || product.gallery?.[0]?.url,
      quantity: quantity,
      sugar: sugarLevel,
      addons: selectedAddons.map(a => a.name).join(", "),
      addonsList: selectedAddons.map(a => ({ name: a.name, price: a.price, priceVal: parseInt(String(a.price).replace(/[^0-9]/g, "")) || 0 })),
    };

    if (purchaseType === "subscription") {
      router.push(`/subscribe?productId=${product.id}&addons=${addonIds}&sugar=${sugarLevel}`);
    } else {
      addToCart(itemToAdd);
      router.push(`/checkout`);
    }
    setIsAddonModalOpen(false);
  };

  const [openFaq, setOpenFaq] = useState(null);

  if (loading) return <div style={{ background: "#fcfaf7", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><h2>Brewing Details...</h2></div>;
  if (!product) return <div style={{ background: "#fcfaf7", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><h2>Product not found</h2></div>;

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100vh", color: "#2c1b0d", width: "100vw", overflowX: "hidden" }}>
      <Navbar />

      {/* Full Width product detail wrap */}
      <div className="product-page-container-full">
        {/* Breadcrumbs */}
        <div className="breadcrumbs">
          <Link href="/">Home</Link> &gt; <Link href="#our-blends">Teas</Link> &gt; <span className="active-crumb">{product.name}</span>
        </div>

        {/* Flat Nordic Layout Container for custom mobile ordering */}
        <div className="nordic-layout-container">
          
          {/* Column 2: Gallery (Center) - order: 1 on mobile */}
          <div className="nordic-gallery">
            <div className="nordic-main-media-wrapper">
              {/* Carousel Left Arrow */}
              <button className="carousel-nav-btn left-nav" onClick={handlePrevMedia}>
                ‹
              </button>

              {product.gallery[activeMediaIndex].type === "video" ? (
                <video
                  src={product.gallery[activeMediaIndex].url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="nordic-main-media"
                />
              ) : (
                <img
                  src={product.gallery[activeMediaIndex].url}
                  alt={product.name}
                  className="nordic-main-media"
                />
              )}

              {/* Carousel Right Arrow */}
              <button className="carousel-nav-btn right-nav" onClick={handleNextMedia}>
                ›
              </button>
            </div>

            {/* Thumbnail selector */}
            <div className="nordic-thumbnails">
              {product.gallery.map((media, idx) => (
                <div
                  key={idx}
                  className={`nordic-thumbnail-card ${idx === activeMediaIndex ? "active" : ""}`}
                  onClick={() => setActiveMediaIndex(idx)}
                >
                  {media.type === "video" ? (
                    <video src={media.url} muted playsInline className="nordic-thumb-media" />
                  ) : (
                    <img src={media.url} alt="thumb" className="nordic-thumb-media" />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Sugar selection is now inside the add-to-cart/buy-now modal flow */}

          {/* Column 3: Details (Right) - order: 4 on mobile */}
          <div className="nordic-details">
            <div className="nordic-meta">
              <span className="nordic-reviews">184 Reviews</span>
              <span className="divider">|</span>
              <span className="nordic-rating">4.8 ★★★★★</span>
            </div>

            <h1 className="nordic-title">{product.name}</h1>
            <p className="nordic-desc">{product.desc}</p>

            <div className="nordic-price-box">
              <span className="current-price">{product.price}</span>
              <span className="original-price">₹299</span>
              <span className="sale-badge">SAVE 50%</span>
            </div>

            {/* Buying configuration options */}
            <div className="purchase-options" style={{ width: "100%", marginBottom: "20px" }}>
              <div
                className={`option-card ${purchaseType === "one-time" ? "selected" : ""}`}
                onClick={() => setPurchaseType("one-time")}
              >
                <div className="radio-dot" />
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "#2c1b0d" }}>One-Time Purchase</h4>
                </div>
                <span style={{ fontWeight: 800, color: "#2c1b0d" }}>{product.price}</span>
              </div>

              <div
                className={`option-card ${purchaseType === "subscription" ? "selected" : ""}`}
                onClick={() => setPurchaseType("subscription")}
              >
                <div className="radio-dot" />
                <div style={{ flexGrow: 1 }}>
                  <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "#2c1b0d" }}>Subscribe &amp; Save</h4>
                </div>
                <span style={{ fontWeight: 800, color: "#5c7a4d" }}>₹299/mo</span>
              </div>
            </div>

            {/* Quantity Selector & Purchase buttons */}
            <div style={{ display: "flex", gap: "10px", width: "100%", flexWrap: "wrap" }}>
              <div className="qty-selector">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="qty-btn">-</button>
                <span className="qty-val">{quantity}</span>
                <button onClick={() => setQuantity((q) => q + 1)} className="qty-btn">+</button>
              </div>

              <button onClick={handlePurchase} className="nordic-btn-add" style={{ flexGrow: 1 }}>
                ADD TO CART
              </button>
              <button onClick={handlePurchase} className="nordic-btn-buy" style={{ flexGrow: 1 }}>
                BUY NOW
              </button>
            </div>

            {/* Trust Badges */}
            <div className="nordic-trust-row">
              <div className="trust-item">🔒 Secure Payments</div>
              <div className="trust-item">🚚 Free Shipping</div>
              <div className="trust-item">🍃 100% Organic</div>
              <div className="trust-item">☕️ Handcrafted Fresh</div>
            </div>

            {/* Bullet Points */}
            {product.bullets && product.bullets.length > 0 && (
              <ul className="nordic-bullets">
                {product.bullets.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* CUSTOMER REVIEWS GRID */}
        <section className="nordic-reviews-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "15px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 800 }}>HEAR FROM OUR CUSTOMERS</h2>
            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "#8a583c" }}>★ 4.8/5.0</span>
              <button 
                onClick={() => {
                  if (!user) {
                    alert("Please login to write a review.");
                    router.push("/login?redirect=/product/" + productId);
                  } else {
                    setShowReviewModal(true);
                  }
                }}
                style={{ background: "#5c7a4d", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
              >
                Write a Review
              </button>
            </div>
          </div>

          {reviews.length === 0 ? (
            <p style={{ color: "#777", fontSize: "14px", fontStyle: "italic" }}>No approved reviews yet. Be the first to share your thoughts!</p>
          ) : (
            <div className="reviews-tab-grid">
              {reviews.map(r => (
                <div className="review-tab-card" key={r.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                    <strong>{r.userName} {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</strong>
                    <span className="verified-badge">Verified</span>
                  </div>
                  {r.comment && <p className="quote-tab">"{r.comment}"</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FAQ ACCORDIONS */}
        <section className="nordic-faq-section">
          <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "24px" }}>Frequently Asked Questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { q: "Customization?", a: "You can click any ingredient in the left sidebar to dynamically add them to your tea." },
              { q: "Shipping Info?", a: "Standard free shipping takes 2-4 business days across India." },
              { q: "Storage & Care?", a: "Store in a cool dry place. Once opened, seal in airtight containers." }
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="faq-accordion-card">
                  <button onClick={() => setOpenFaq(isOpen ? null : idx)} className="faq-acc-btn">
                    <span>{faq.q}</span>
                    <span>{isOpen ? "✕" : "＋"}</span>
                  </button>
                  {isOpen && <p className="faq-acc-ans">{faq.a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* YOU MIGHT ALSO LIKE CAROUSEL */}
        <section className="cross-sell-section" style={{ background: "#ffffff", borderRadius: "24px", marginTop: "40px" }}>
          <h2 className="cross-sell-heading">YOU MIGHT ALSO LIKE</h2>
          <div className="cross-sell-carousel">
            {crossSellTeas.slice(0, 5).map((tea) => (
              <Link href={`/product/${tea.id}`} key={tea.id} style={{ textDecoration: "none" }}>
                <div className="cross-sell-card">
                  <div className="cross-sell-img-container">
                    <img src={tea.image} alt={tea.name} className="cross-sell-img" />
                  </div>
                  <h3 className="cross-sell-name">{tea.name}</h3>
                  <div className="cross-sell-footer">
                    <span className="cross-sell-price">{tea.price}</span>
                    <span className="cross-sell-arrow">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

      <Footer />
      </div>

      {/* Add-ons & Sugar Selection Popup Modal */}
      {isAddonModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <button onClick={() => setIsAddonModalOpen(false)} className="modal-close-btn">
              ✕
            </button>

            {modalStep === "sugar" ? (
              <div style={{ textAlign: "center", padding: "10px" }}>
                <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#2c1b0d", marginBottom: "8px" }}>
                  Customize Sugar
                </h3>
                <p style={{ fontSize: "14px", color: "#666", marginBottom: "30px" }}>
                  Please select your preferred sugar level for this brew:
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "15px" }}>
                  <button
                    onClick={() => {
                      setSugarLevel("none");
                      setModalStep("addons");
                    }}
                    className="sugar-modal-btn"
                  >
                    <span style={{ fontSize: "32px", display: "block", marginBottom: "10px" }}>❌</span>
                    <span style={{ fontSize: "15px", fontWeight: 700 }}>No Sugar</span>
                  </button>
                  <button
                    onClick={() => {
                      setSugarLevel("with");
                      setModalStep("addons");
                    }}
                    className="sugar-modal-btn"
                  >
                    <span style={{ fontSize: "32px", display: "block", marginBottom: "10px" }}>🍬</span>
                    <span style={{ fontSize: "15px", fontWeight: 700 }}>With Sugar</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#2c1b0d", marginBottom: "8px", textAlign: "center" }}>
                  Quick Add Add-ons
                </h3>
                <p style={{ fontSize: "13px", color: "#666", textAlign: "center", marginBottom: "24px" }}>
                  Chai is incomplete without hot cookies and butter toasts. Complete your brew!
                </p>

                {/* Addons Grid */}
                <div className="addons-grid">
                  {addons.map((addon) => {
                    const isSelected = selectedAddons.some((a) => a.id === addon.id);
                    return (
                      <div key={addon.id} className={`addon-card ${isSelected ? "selected" : ""}`}>
                        <img src={addon.image} alt={addon.name} className="addon-img" />
                        <div style={{ padding: "12px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                          <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#2c1b0d", flexGrow: 1 }}>{addon.name}</h4>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 800, color: "#8a583c" }}>{addon.price}</span>
                            <button
                              onClick={() => toggleAddon(addon)}
                              style={{
                                background: isSelected ? "#5c7a4d" : "#2c1b0d",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "999px",
                                padding: "4px 10px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {isSelected ? "Added ✓" : "Add +"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Checkout Finalize */}
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", marginTop: "24px", paddingTop: "20px", textAlign: "center", display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button onClick={() => setModalStep("sugar")} className="btn-finalize-order" style={{ background: "#f5f5f7", color: "#2c1b0d", border: "1.5px solid rgba(44, 27, 13, 0.15)" }}>
                    ← Back
                  </button>
                  <button onClick={handleFinishCheckout} className="btn-finalize-order" style={{ flexGrow: 1 }}>
                    Continue to Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Old Product Reviews Section Removed */}

      {/* Write Review Modal */}
      {showReviewModal && (
        <div className="modal-backdrop" onClick={() => !submittingReview && setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <button className="modal-close" onClick={() => !submittingReview && setShowReviewModal(false)}>×</button>
            <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#2c1b0d", marginBottom: "8px" }}>Rate & Review</h3>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "24px" }}>Share your feedback about {product?.name}</p>

            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
              {[1,2,3,4,5].map(star => (
                <span 
                  key={star} 
                  onClick={() => setReviewRating(star)}
                  style={{ 
                    fontSize: "32px", 
                    cursor: "pointer", 
                    color: star <= reviewRating ? "#f1c40f" : "#ddd",
                    transition: "color 0.2s"
                  }}
                >
                  ★
                </span>
              ))}
            </div>

            <textarea 
              placeholder="What did you like or dislike?"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows="4"
              style={{
                width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #eee",
                fontSize: "14px", resize: "none", marginBottom: "24px", fontFamily: "inherit", outline: "none"
              }}
            />

            <button 
              onClick={handleSubmitReview}
              disabled={submittingReview}
              style={{
                width: "100%", padding: "14px", background: "#2c1b0d", color: "#fff",
                border: "none", borderRadius: "999px", fontWeight: 700, fontSize: "14px",
                cursor: submittingReview ? "not-allowed" : "pointer", opacity: submittingReview ? 0.7 : 1
              }}
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successMessage && (
        <div className="modal-backdrop" onClick={() => setSuccessMessage("")}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>{successMessage.includes("Error") ? "❌" : "✅"}</div>
            <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#2c1b0d", marginBottom: "12px" }}>
              {successMessage.includes("Error") ? "Oops!" : "Success"}
            </h3>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "24px", lineHeight: "1.5" }}>{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage("")}
              style={{
                width: "100%", padding: "12px", background: successMessage.includes("Error") ? "#e74c3c" : "#5c7a4d", color: "#fff",
                border: "none", borderRadius: "999px", fontWeight: 700, cursor: "pointer", transition: "0.2s"
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}


      {/* Styled JSX */}
      <style suppressHydrationWarning>{`
        .product-page-container-full {
          width: 100%;
          padding: 110px 40px 30px;
          box-sizing: border-box;
        }

        .breadcrumbs {
          font-size: 13px;
          color: #777;
          margin-bottom: 24px;
        }

        .breadcrumbs a {
          color: inherit;
          text-decoration: none;
        }

        .breadcrumbs a:hover {
          color: #2c1b0d;
        }

        .active-crumb {
          color: #2c1b0d;
          font-weight: 600;
        }

        /* 2-Column Grid Layout on Desktop */
        .nordic-layout-container {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          grid-template-areas:
            "gallery details";
          gap: 20px;
          background: #ffffff;
          border-radius: 24px;
          padding: 30px;
          box-shadow: 0 4px 30px rgba(0,0,0,0.02);
          width: 100%;
          box-sizing: border-box;
        }

        /* Sugar selection */
        .swatch-selection-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 8px;
        }

        .swatch-select-item {
          background: #ffffff;
          border: 1.5px solid rgba(44, 27, 13, 0.08);
          border-radius: 8px;
          padding: 8px 2px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          color: #2c1b0d;
          transition: all 0.2s ease;
          text-align: center;
        }

        .swatch-select-item.selected {
          background: #2c1b0d;
          color: #ffffff;
          border-color: #2c1b0d;
        }

        .customizer-options-row {
          grid-area: sugar-milk;
          display: flex;
          gap: 16px;
          width: 100%;
          margin-top: 24px;
          border-top: 1px solid rgba(0,0,0,0.06);
          padding-top: 18px;
        }

        /* Column 2: Gallery */
        .nordic-gallery {
          grid-area: gallery;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .nordic-main-media-wrapper {
          width: 100%;
          max-width: 580px;
          margin: 0 auto;
          aspect-ratio: 1 / 1;
          border-radius: 16px;
          overflow: hidden;
          background: #f5f5f7;
          position: relative;
          box-shadow: 0 8px 25px rgba(0,0,0,0.04);
        }

        .nordic-main-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* Carousel Navigation Buttons */
        .carousel-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.8);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2c1b0d;
          z-index: 5;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
          transition: background 0.2s, transform 0.2s;
        }

        .carousel-nav-btn:hover {
          background: #ffffff;
          transform: translateY(-50%) scale(1.08);
        }

        .left-nav {
          left: 12px;
        }

        .right-nav {
          right: 12px;
        }

        .nordic-thumbnails {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .nordic-thumbnail-card {
          width: 64px;
          height: 64px;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          background: #f5f5f7;
          transition: border-color 0.2s;
        }

        .nordic-thumbnail-card.active {
          border-color: #2c1b0d;
        }

        .nordic-thumb-media {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Bouncing Added Spices directly inside the Center Image */
        .bouncing-ingredient-item {
          position: absolute;
          top: 50%;
          left: 50%;
          color: #ffffff;
          background: #2c1b0d;
          padding: 12px 24px;
          border-radius: 99px;
          font-weight: 800;
          box-shadow: 0 15px 35px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
          animation: flyInAndBounce 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes flyInAndBounce {
          0% { transform: translate(-350px, 0) scale(0.2); opacity: 0; }
          40% { transform: translate(-50%, -50%) scale(1.35); opacity: 1; }
          60% { transform: translate(-50%, -65%) scale(0.95); }
          80% { transform: translate(-50%, -45%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }

        /* Column 3: Details */
        .nordic-details {
          grid-area: details;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .nordic-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #888;
          margin-bottom: 12px;
        }

        .nordic-rating {
          color: #f1c40f;
        }

        .nordic-title {
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 12px;
          color: #2c1b0d;
        }

        .nordic-desc {
          font-size: 14.5px;
          line-height: 1.55;
          color: #666;
          margin-bottom: 24px;
        }

        .nordic-price-box {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .current-price {
          font-size: 24px;
          font-weight: 800;
          color: #2c1b0d;
        }

        .original-price {
          font-size: 17px;
          color: #999;
          text-decoration: line-through;
        }

        .sale-badge {
          background: #27ae60;
          color: #ffffff;
          font-size: 10.5px;
          font-weight: 800;
          padding: 3px 6px;
          border-radius: 4px;
        }

        .purchase-options {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .option-card {
          display: flex;
          align-items: center;
          border: 1.5px solid rgba(44, 27, 13, 0.08);
          padding: 12px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          gap: 10px;
        }

        .option-card.selected {
          border-color: #2c1b0d;
          background: rgba(44, 27, 13, 0.02);
        }

        .radio-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #2c1b0d;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .option-card.selected .radio-dot::after {
          content: "";
          position: absolute;
          width: 6px;
          height: 6px;
          background: #2c1b0d;
          border-radius: 50%;
        }

        .qty-selector {
          display: flex;
          align-items: center;
          border: 1.5px solid rgba(44, 27, 13, 0.12);
          border-radius: 8px;
          height: 44px;
        }

        .qty-btn {
          width: 32px;
          height: 100%;
          background: transparent;
          border: none;
          font-size: 15px;
          cursor: pointer;
          color: inherit;
        }

        .qty-val {
          padding: 0 10px;
          font-weight: 700;
          font-size: 13.5px;
        }

        .nordic-btn-add {
          background: transparent;
          color: #2c1b0d;
          border: 2px solid #2c1b0d;
          border-radius: 8px;
          height: 44px;
          padding: 0 18px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .nordic-btn-add:hover {
          background: rgba(44, 27, 13, 0.04);
        }

        .nordic-btn-buy {
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          height: 44px;
          padding: 0 20px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .nordic-btn-buy:hover {
          background: #4e3629;
        }

        .nordic-trust-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 24px;
          border-top: 1px solid #eee;
          padding-top: 16px;
          width: 100%;
        }

        .trust-item {
          font-size: 11.5px;
          font-weight: 600;
          color: #666;
        }

        .nordic-bullets {
          margin-top: 20px;
          padding-left: 20px;
          color: #5c4f47;
          font-size: 13.5px;
          line-height: 1.7;
        }

        /* Reviews Grid */
        .nordic-reviews-section {
          background: #ffffff;
          border-radius: 24px;
          padding: 30px;
          margin-top: 30px;
        }

        .reviews-tab-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .review-tab-card {
          background: #fbf9f6;
          border-radius: 14px;
          padding: 20px;
          border: 1px solid rgba(0,0,0,0.03);
        }

        .verified-badge {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 4px;
        }

        .quote-tab {
          font-size: 13px;
          line-height: 1.5;
          color: #5c4f47;
          margin-top: 6px;
        }

        /* FAQ */
        .nordic-faq-section {
          background: #ffffff;
          border-radius: 24px;
          padding: 30px;
          margin-top: 30px;
        }

        .faq-accordion-card {
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 12px;
          overflow: hidden;
          background: #fbf9f6;
        }

        .faq-acc-btn {
          width: 100%;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          background: transparent;
          border: none;
          font-weight: 700;
          color: #2c1b0d;
          font-size: 14px;
          cursor: pointer;
        }

        .faq-acc-ans {
          padding: 0 20px 16px;
          font-size: 13px;
          color: #666;
          line-height: 1.5;
        }

        /* Cross Selling Carousel */
        .cross-sell-section {
          padding: 40px;
          border-top: 1px solid rgba(0,0,0,0.06);
          background: #ffffff;
        }

        .cross-sell-heading {
          font-size: 20px;
          font-weight: 800;
          color: #2c1b0d;
          margin-bottom: 20px;
        }

        .cross-sell-carousel {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          width: 100%;
        }

        .cross-sell-card {
          background: #fbf9f6;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.04);
          padding: 10px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s;
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .cross-sell-card:hover {
          transform: translateY(-5px);
          border-color: rgba(44, 27, 13, 0.15);
        }

        .cross-sell-img-container {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .cross-sell-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .cross-sell-name {
          font-size: 13px;
          font-weight: 700;
          color: #2c1b0d;
          margin-bottom: 6px;
        }

        .cross-sell-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 6px;
          border-top: 1px dashed rgba(0,0,0,0.05);
        }

        .cross-sell-price {
          font-size: 12.5px;
          font-weight: 800;
          color: #8a583c;
        }

        .cross-sell-arrow {
          font-size: 11px;
          color: #8a583c;
          font-weight: bold;
        }

        /* Modal Backdrop */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: #ffffff;
          width: 100%;
          max-width: 620px;
          border-radius: 20px;
          padding: 30px;
          position: relative;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15);
        }

        .modal-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          background: transparent;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #777;
        }

        .addons-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .addon-card {
          border: 1.5px solid rgba(0,0,0,0.06);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          background: #fbf9f6;
          transition: all 0.2s ease;
        }

        .addon-card.selected {
          border-color: #5c7a4d;
          background: rgba(92, 122, 77, 0.02);
        }

        .addon-img {
          width: 80px;
          height: auto;
          aspect-ratio: 1 / 1;
          object-fit: cover;
        }

        .btn-finalize-order {
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          padding: 12px 40px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          max-width: 300px;
          transition: background 0.2s;
        }

        .btn-finalize-order:hover {
          background: #4e3629;
        }

        /* Mobile Responsive Configurations */
        @media (max-width: 990px) {
          .nordic-layout-container {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "gallery details"
              "sidebar sugar-milk";
          }
        }

        @media (max-width: 768px) {
          /* Mobile Stack Order: 1. Gallery -> 2. Sidebar Customizer (Horizontal Carousel) -> 3. Sugar & Milk Selection -> 4. Full Content Details */
          .product-page-container-full {
            padding: 90px 0px 20px 0px !important;
          }

          .breadcrumbs {
            padding: 0 16px;
            margin-bottom: 16px;
          }

          .nordic-layout-container {
            display: flex;
            flex-direction: column;
            padding: 16px 12px;
            gap: 24px;
            border-radius: 0px !important;
          }

          .nordic-gallery {
            order: 1;
            width: 100%;
          }

          .sidebar-customizer {
            order: 2;
            width: 100%;
            padding: 16px;
          }

          /* Convert ingredients list to horizontal scrolling carousel on mobile */
          .ingredients-vertical-list {
            display: flex;
            flex-direction: row;
            overflow-x: auto;
            gap: 12px;
            padding: 8px 4px;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none; /* Hide default scrollbars */
          }

          .ingredients-vertical-list::-webkit-scrollbar {
            display: none;
          }

          .ingredient-vertical-btn {
            flex: 0 0 210px;
            scroll-snap-align: start;
          }

          .customizer-options-row {
            order: 3;
            width: 100%;
            margin-top: 0;
            border-top: 1px solid rgba(0,0,0,0.06);
            padding-top: 18px;
            flex-direction: column;
            gap: 16px;
          }

          .nordic-details {
            order: 4;
            width: 100%;
          }

          .cross-sell-carousel {
            grid-template-columns: repeat(2, 1fr);
          }

          .reviews-tab-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 580px) {
          .modal-content {
            width: 92%;
            max-height: 85vh;
            overflow-y: auto;
            padding: 20px 16px;
          }
          .addons-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }

        .sugar-modal-btn {
          background: #ffffff;
          border: 2px solid rgba(44, 27, 13, 0.08);
          border-radius: 12px;
          padding: 20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          color: #2c1b0d;
          transition: all 0.2s ease;
        }
        .sugar-modal-btn:hover {
          border-color: #2c1b0d;
          background: rgba(44, 27, 13, 0.02);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
