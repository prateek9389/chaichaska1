"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { onProductsSnapshot } from "@/lib/firestore";

export default function ShopPage() {
  const router = useRouter();
  const { user } = useAuth();
  // Products fetched from Firestore
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onProductsSnapshot((items) => {
      setProducts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filters State
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [selectedCaffeine, setSelectedCaffeine] = useState("All");
  const [selectedSweetness, setSelectedSweetness] = useState("All");
  const [selectedSteepTime, setSelectedSteepTime] = useState("All");
  const [selectedPairing, setSelectedPairing] = useState("All");

  // Mobile Filter Drawer Toggle
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Category filter
      if (selectedCategory !== "All" && p.category !== selectedCategory) return false;

      // 2. Price filter
      if (selectedPrice !== "All") {
        if (selectedPrice === "under150" && p.priceNum >= 150) return false;
        if (selectedPrice === "150-200" && (p.priceNum < 150 || p.priceNum > 200)) return false;
        if (selectedPrice === "over200" && p.priceNum <= 200) return false;
      }

      // 3. Caffeine filter
      if (selectedCaffeine !== "All" && p.caffeine !== selectedCaffeine) return false;

      // 4. Sweetness filter
      if (selectedSweetness !== "All" && p.sweetness !== selectedSweetness) return false;

      // 5. Steep Time filter
      if (selectedSteepTime !== "All" && p.steepTime !== selectedSteepTime) return false;

      // 6. Pairing filter
      if (selectedPairing !== "All" && p.pairing !== selectedPairing) return false;

      // Search query filter
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      return true;
    });
  }, [
    products,
    selectedCategory,
    selectedPrice,
    selectedCaffeine,
    selectedSweetness,
    selectedSteepTime,
    selectedPairing,
    searchQuery,
  ]);

  const handleResetFilters = () => {
    setSelectedCategory("All");
    setSelectedPrice("All");
    setSelectedCaffeine("All");
    setSelectedSweetness("All");
    setSelectedSteepTime("All");
    setSelectedPairing("All");
    setSearchQuery("");
  };

  return (
    <div style={{ background: "#fcfaf7", minHeight: "100vh", color: "#2c1b0d", overflowX: "hidden" }}>
      <Navbar />

      {/* Hero Banner Section */}
      <section className="shop-banner">
        <div className="banner-overlay" />
        <div className="banner-content">
          <span className="banner-tag">AUTHENTIC CHAI COLLECTION</span>
          <h1 className="banner-title">The Royal Tea House</h1>
          <p className="banner-subtitle">
            Sip premium loose-leaf estate teas carefully hand-blended with fresh garden herbs and native spices.
          </p>
        </div>
      </section>

      {/* Main Shop Container */}
      <div className="shop-grid-container">
        
        {/* Left Filters Sidebar */}
        <aside className={`shop-sidebar ${mobileFilterOpen ? "active" : ""}`}>
          <div className="sidebar-header-row">
            <h3 className="filter-heading">Filters</h3>
            <button className="reset-btn" onClick={handleResetFilters}>
              Reset All
            </button>
            <button className="close-filter-mobile" onClick={() => setMobileFilterOpen(false)}>✕</button>
          </div>

          {/* Filter 1: Categories */}
          <div className="filter-section">
            <h4 className="filter-title">Category</h4>
            <div className="filter-links">
              {["All", "Chai", "Coffee", "Drinks", "Water"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setMobileFilterOpen(false);
                  }}
                  className={`filter-btn ${selectedCategory === cat ? "active" : ""}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>


        </aside>

        {/* Right Product Grid Column */}
        <main className="shop-main-content">
          
          {/* Controls toolbar */}
          <div className="toolbar-controls">
            <div className="search-wrap">
              <input
                type="text"
                placeholder="Search premium teas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="toolbar-actions">
              <span className="results-count">Showing <strong>{filteredProducts.length}</strong> of {products.length} products</span>
              <button className="mobile-filter-trigger-btn" onClick={() => setMobileFilterOpen(true)}>
                Filters ☰
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Brewing your collection...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <h3>No blends matched your filters</h3>
              <p>Try resetting filters or adjusting search parameters to explore our custom brews.</p>
              <button className="reset-empty-btn" onClick={handleResetFilters}>
                View All Blends
              </button>
            </div>
          ) : (
            <div className="shop-product-grid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="shop-card-wrapper">
                  <div
                    className="shop-card-link-block"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      router.push(`/product/${product.id}`);
                    }}
                  >
                    <div className="shop-card-img-box">
                      <img src={product.image} alt={product.name} className="shop-card-img" />
                      <span className="card-rating-badge">★ {product.rating}</span>
                      <span className="card-category-badge">{product.category}</span>
                    </div>

                    <div className="shop-card-info">
                      <h3 className="shop-card-title">{product.name}</h3>
                      <p className="shop-card-desc">{product.desc}</p>
                      
                      <div className="shop-card-footer">
                        <span className="shop-card-price">{product.price}</span>
                        <span className="shop-card-arrow">Order Now →</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <Footer />

      {/* Styled JSX */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Shop Banner Styling */
        .shop-banner {
          position: relative;
          width: 100vw;
          min-height: 420px;
          background: linear-gradient(135deg, #1e1107 0%, #3a2210 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #ffffff;
          padding: 140px 24px 60px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .banner-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1500&q=80") center center/cover no-repeat;
          opacity: 0.35;
          z-index: 1;
          animation: kenBurns 24s infinite ease-in-out;
        }

        @keyframes kenBurns {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .banner-content {
          position: relative;
          z-index: 2;
          max-width: 750px;
        }

        .banner-tag {
          font-size: 11px;
          letter-spacing: 2px;
          font-weight: 800;
          color: #f1c40f;
          display: block;
          margin-bottom: 12px;
          opacity: 0;
          animation: slideUpFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .banner-title {
          font-size: clamp(32px, 5vw, 48px);
          font-weight: 900;
          line-height: 1.15;
          margin-bottom: 16px;
          color: #ffffff;
          opacity: 0;
          animation: slideUpFade 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s;
        }

        .banner-subtitle {
          font-size: clamp(14px, 2vw, 16px);
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
          opacity: 0;
          animation: slideUpFade 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.4s;
        }

        @keyframes slideUpFade {
          from {
            transform: translateY(24px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Shop Grid Layout */
        .shop-grid-container {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 30px;
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
          padding: 40px 24px;
          box-sizing: border-box;
        }

        /* Sidebar Filters */
        .shop-sidebar {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(0,0,0,0.05);
          height: fit-content;
          align-self: start;
        }

        .sidebar-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          padding-bottom: 14px;
        }

        .filter-heading {
          font-size: 18px;
          font-weight: 800;
          color: #2c1b0d;
        }

        .reset-btn {
          background: transparent;
          border: none;
          color: #8a583c;
          font-weight: 700;
          font-size: 12.5px;
          cursor: pointer;
        }

        .close-filter-mobile {
          display: none;
          background: transparent;
          border: none;
          font-size: 20px;
          color: #666;
          cursor: pointer;
        }

        .filter-section {
          margin-bottom: 24px;
          border-bottom: 1px dashed rgba(0,0,0,0.06);
          padding-bottom: 18px;
        }

        .filter-section:last-child {
          margin-bottom: 0;
          border-bottom: none;
          padding-bottom: 0;
        }

        .filter-title {
          font-size: 13.5px;
          font-weight: 800;
          margin-bottom: 12px;
          color: #2c1b0d;
          letter-spacing: 0.3px;
        }

        .filter-links {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-btn {
          background: transparent;
          border: none;
          text-align: left;
          font-size: 13px;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          color: #555;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          background: rgba(44, 27, 13, 0.03);
          color: #2c1b0d;
        }

        .filter-btn.active {
          background: #2c1b0d;
          color: #ffffff;
          font-weight: 700;
        }

        /* Right Content Columns */
        .shop-main-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .toolbar-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          background: #ffffff;
          padding: 16px 24px;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.04);
        }

        .search-wrap {
          flex-grow: 1;
          max-width: 400px;
        }

        .search-input {
          width: 100%;
          border: 1.5px solid rgba(44, 27, 13, 0.1);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13.5px;
          color: #2c1b0d;
          background: #fbf9f6;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #2c1b0d;
        }

        .toolbar-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .results-count {
          font-size: 13.5px;
          color: #666;
        }

        .mobile-filter-trigger-btn {
          display: none;
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 12.5px;
          cursor: pointer;
        }

        /* Loading state */
        .loading-state {
          text-align: center;
          padding: 80px 24px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.04);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(44, 27, 13, 0.1);
          border-top-color: #8a583c;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-state p {
          font-size: 14px;
          color: #888;
          font-weight: 600;
        }

        /* Product Grid */
        .shop-product-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .shop-card-wrapper {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.04);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.01);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s;
        }

        .shop-card-wrapper:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 30px rgba(44, 27, 13, 0.08);
        }

        .shop-card-link-block {
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .shop-card-img-box {
          width: 100%;
          aspect-ratio: 1.1 / 1;
          overflow: hidden;
          position: relative;
          background: #f5f5f7;
        }

        .shop-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.4s ease;
        }

        .shop-card-wrapper:hover .shop-card-img {
          transform: scale(1.04);
        }

        .card-rating-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: #ffffff;
          color: #f1c40f;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }

        .card-category-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(44, 27, 13, 0.85);
          color: #ffffff;
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          backdrop-filter: blur(4px);
        }

        .shop-card-info {
          padding: 18px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .shop-card-title {
          font-size: 15px;
          font-weight: 800;
          color: #2c1b0d;
          margin-bottom: 6px;
          line-height: 1.3;
        }

        .shop-card-desc {
          font-size: 12.5px;
          color: #666;
          line-height: 1.5;
          margin-bottom: 16px;
          flex-grow: 1;
        }

        .shop-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px dashed rgba(0,0,0,0.05);
          padding-top: 12px;
          margin-top: auto;
        }

        .shop-card-price {
          font-size: 14.5px;
          font-weight: 900;
          color: #8a583c;
        }

        .shop-card-arrow {
          font-size: 11.5px;
          font-weight: 700;
          color: #2c1b0d;
        }

        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 60px 24px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.04);
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .empty-state p {
          font-size: 14px;
          color: #777;
          margin-bottom: 20px;
        }

        .reset-empty-btn {
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        /* Responsive */
        @media (max-width: 990px) {
          .shop-product-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .shop-grid-container {
            grid-template-columns: 1fr;
            padding: 24px 16px;
          }

          .mobile-filter-trigger-btn {
            display: block;
          }

          /* Mobile filter drawer slide up */
          .shop-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            height: 100dvh;
            max-height: 100vh;
            z-index: 3000;
            background: #ffffff;
            border-radius: 0;
            padding: 24px;
            transform: translateY(100%);
            transition: transform 0.3s ease;
            overflow-y: auto;
            display: block !important;
          }

          .shop-sidebar.active {
            transform: translateY(0);
          }

          .close-filter-mobile {
            display: block;
          }

          .toolbar-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .search-wrap {
            max-width: 100%;
          }

          .toolbar-actions {
            justify-content: space-between;
          }

          .shop-product-grid {
            grid-template-columns: 1fr;
            gap: 18px;
          }
        }
      ` }} />
    </div>
  );
}
