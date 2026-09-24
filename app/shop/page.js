"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { onProductsSnapshot } from "@/lib/firestore";

// Curated vibrant gradient palettes matching reference UI aesthetic
const GRADIENT_PALETTES = [
  {
    bg: "linear-gradient(150deg, #ecfccb 0%, #bef264 45%, #65a30d 100%)",
    glow: "rgba(132, 204, 22, 0.25)",
    tag: "#4d7c0f",
  }, // Lush Lime (Reference Card 1)
  {
    bg: "linear-gradient(150deg, #ffedd5 0%, #fed7aa 45%, #ea580c 100%)",
    glow: "rgba(234, 88, 12, 0.25)",
    tag: "#c2410c",
  }, // Sunset Amber (Reference Card 2)
  {
    bg: "linear-gradient(150deg, #f5f3ff 0%, #ddd6fe 45%, #7c3aed 100%)",
    glow: "rgba(124, 58, 237, 0.25)",
    tag: "#6d28d9",
  }, // Velvet Lavender (Reference Card 3)
  {
    bg: "linear-gradient(150deg, #fce7f3 0%, #fbcfe8 45%, #db2777 100%)",
    glow: "rgba(219, 39, 119, 0.25)",
    tag: "#be185d",
  }, // Rose Petal
  {
    bg: "linear-gradient(150deg, #e0f2fe 0%, #bae6fd 45%, #0284c7 100%)",
    glow: "rgba(2, 132, 199, 0.25)",
    tag: "#0369a1",
  }, // Azure Mist
  {
    bg: "linear-gradient(150deg, #fef9c3 0%, #fde047 45%, #ca8a04 100%)",
    glow: "rgba(202, 138, 4, 0.25)",
    tag: "#a16207",
  }, // Honey Cardamom
];

function getCardPalette(index, category) {
  if (category === "Chai") return GRADIENT_PALETTES[1]; // Amber
  if (category === "Coffee") return GRADIENT_PALETTES[0]; // Lime / Olive
  if (category === "Drinks") return GRADIENT_PALETTES[2]; // Lavender
  if (category === "Water") return GRADIENT_PALETTES[4]; // Azure
  return GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
}

export default function ShopPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
  } = useCart();

  // Bottom 80% slider drawer state
  const [trayDrawerOpen, setTrayDrawerOpen] = useState(false);

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    setShowInstallModal(true);
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === "accepted") {
          setDeferredPrompt(null);
          setShowInstallModal(false);
        }
      } catch (e) {
        console.warn("Direct install prompt error:", e);
      }
    }
  };

  // Notification / Flying item state
  const [trayToast, setTrayToast] = useState(null);
  const [flyingItems, setFlyingItems] = useState([]);
  const [cartGradientActive, setCartGradientActive] = useState(false);
  const gradientTimerRef = useRef(null);

  // Luxury Preloader State with 1-second Curtain Roll Reveal
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem("chai_products_cache");
    if (cached) {
      try {
        setProducts(JSON.parse(cached));
        setLoading(false);
      } catch (e) {
        console.error(e);
      }
    }

    const unsubscribe = onProductsSnapshot((items) => {
      setProducts(items);
      setLoading(false);
      try {
        sessionStorage.setItem("chai_products_cache", JSON.stringify(items));
      } catch (e) {}
    });
    return () => unsubscribe();
  }, []);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [selectedRating, setSelectedRating] = useState("All");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [viewGrouping, setViewGrouping] = useState(false); // group by category when All

  // Mobile Filter Drawer Toggle
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Categories list extracted from data
  const availableCategories = useMemo(() => {
    const set = new Set(["All", "Chai", "Coffee", "Drinks", "Water", "Sandwich", "Snacks", "Toast", "Maggi"]);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Product Counts by category
  const categoryCounts = useMemo(() => {
    const counts = { All: products.length };
    products.forEach((p) => {
      const cat = p.category || "Other";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (p.name || "").toLowerCase().includes(q);
        const descMatch = (p.desc || "").toLowerCase().includes(q);
        const catMatch = (p.category || "").toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }

      // 2. Category filter
      if (selectedCategory !== "All" && p.category !== selectedCategory) {
        return false;
      }

      // 3. Price filter
      const priceNum =
        p.priceNum || parseInt(String(p.price).replace(/[^0-9]/g, "")) || 0;
      if (selectedPrice === "under100" && priceNum >= 100) return false;
      if (selectedPrice === "100-200" && (priceNum < 100 || priceNum > 200))
        return false;
      if (selectedPrice === "over200" && priceNum <= 200) return false;

      // 4. Rating filter
      const rating = parseFloat(p.rating) || 4.5;
      if (selectedRating === "4.8" && rating < 4.8) return false;
      if (selectedRating === "4.5" && rating < 4.5) return false;
      if (selectedRating === "4.0" && rating < 4.0) return false;

      // 5. In Stock filter
      if (inStockOnly && p.inStock === false) return false;

      return true;
    });
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedPrice,
    selectedRating,
    inStockOnly,
  ]);

  // Grouped by category when selectedCategory === "All" and viewGrouping is true
  const groupedProducts = useMemo(() => {
    if (selectedCategory !== "All" && !viewGrouping) return null;
    const groups = {};
    filteredProducts.forEach((p) => {
      const cat = p.category || "Special Blends";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProducts, selectedCategory, viewGrouping]);

  // Handle Add to Tray with fly-to-cart clone animation and cart gradient pulse
  const handleAddToTray = (e, product) => {
    if (e && e.stopPropagation) e.stopPropagation();

    const basePrice =
      parseInt(String(product.price).replace(/[^0-9]/g, "")) || 0;

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      basePrice: basePrice,
      image: product.image,
      quantity: 1,
      sugar: "Regular",
    });

    // Calculate source coordinates from the product image or button clicked
    let startX = typeof window !== "undefined" ? window.innerWidth / 2 : 200;
    let startY = typeof window !== "undefined" ? window.innerHeight / 2 : 300;
    if (e && e.currentTarget) {
      const card = e.currentTarget.closest ? e.currentTarget.closest(".ref-card-outer") : null;
      const img = card ? card.querySelector(".ref-card-img") : null;
      const targetElem = img || e.currentTarget;
      const rect = targetElem.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    }

    // Target coordinates: bottom center dock where floating tray sits
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
    const targetX = typeof window !== "undefined" ? window.innerWidth / 2 : 200;
    const targetY = typeof window !== "undefined" ? window.innerHeight - (isMobile ? 100 : 50) : 600;

    const flyId = Date.now() + Math.random();
    setFlyingItems((prev) => [
      ...prev,
      {
        id: flyId,
        image: product.image,
        name: product.name,
        startX,
        startY,
        targetX,
        targetY,
      },
    ]);

    // Remove flying clone after flight finishes
    setTimeout(() => {
      setFlyingItems((prev) => prev.filter((item) => item.id !== flyId));
    }, 700);

    // Trigger dynamic gradient animation on bottom cart section
    setCartGradientActive(true);
    if (gradientTimerRef.current) clearTimeout(gradientTimerRef.current);
    gradientTimerRef.current = setTimeout(() => {
      setCartGradientActive(false);
    }, 1800);
  };

  const handleShareProduct = (e, product) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/product/${product.id}`;
      if (navigator.share) {
        navigator
          .share({
            title: product.name,
            text: `Order fresh ${product.name} from Chai Chaska!`,
            url: url,
          })
          .catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        setTrayToast({
          name: "Link copied to clipboard!",
          price: "Ready to share",
          image: product.image,
        });
        setTimeout(() => setTrayToast(null), 2500);
      }
    }
  };

  const handleResetFilters = () => {
    setSelectedCategory("All");
    setSelectedPrice("All");
    setSelectedRating("All");
    setInStockOnly(false);
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedCategory !== "All" ||
    selectedPrice !== "All" ||
    selectedRating !== "All" ||
    inStockOnly ||
    searchQuery.trim() !== "";

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.055,
        delayChildren: 0.04,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 28, scale: 0.96 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 22,
      },
    },
  };

  return (
    <div className="shop-page-wrapper">
      {/* Luxury Curtain Roll Preloader (1s Reveal) */}
      <AnimatePresence>
        {showPreloader && (
          <motion.div
            key="curtain-preloader"
            className="curtain-preloader-root"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.8 }}
          >
            {/* Top Curtain Panel (Rolls Upward) */}
            <motion.div
              className="curtain-half curtain-top"
              initial={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
            >
              <div className="curtain-fabric-pattern" />
              <div className="curtain-gold-trim bottom-trim" />
            </motion.div>

            {/* Bottom Curtain Panel (Rolls Downward) */}
            <motion.div
              className="curtain-half curtain-bottom"
              initial={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
            >
              <div className="curtain-fabric-pattern" />
              <div className="curtain-gold-trim top-trim" />
            </motion.div>

            {/* Center Brand Emblem & Progress */}
            <motion.div
              className="curtain-center-crest"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <div className="curtain-logo-wrap">
                <img src="/logo.png" alt="Chai Chaska" className="curtain-logo-img" />
                <div className="curtain-steam-pulse" />
              </div>

              <h1 className="curtain-brand-title">CHAI CHASKA</h1>
              <p className="curtain-brand-subtitle">Brewing Artisanal Sips...</p>

              <div className="curtain-progress-track">
                <div className="curtain-progress-fill" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar />

      {/* Flying Product Clone to Cart Animation (No bottom alert shown) */}
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              position: "fixed",
              left: item.startX - 32,
              top: item.startY - 32,
              width: 64,
              height: 64,
              borderRadius: "50%",
              zIndex: 999999,
              opacity: 1,
              scale: 1,
              boxShadow: "0 12px 30px rgba(0,0,0,0.35), 0 0 0 3px #ffffff",
              pointerEvents: "none",
            }}
            animate={{
              left: item.targetX - 18,
              top: item.targetY - 18,
              width: 36,
              height: 36,
              scale: [1, 1.2, 0.65],
              opacity: [1, 1, 0.85, 0],
            }}
            transition={{
              duration: 0.65,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              overflow: "hidden",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={item.image}
              alt={item.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Top Pure White Header with Modern Search Bar & Suggestion Carousel */}
      <section className="shop-top-header">
        <div className="header-inner">
          {/* Top Modern Search Bar */}
          <div className="top-search-container">
            <div className="search-bar-shell">
              <svg
                className="search-icon"
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search handcrafted chai, coffee, coolers..."
                className="search-input-field"
              />

              {searchQuery && (
                <button
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                  type="button"
                >
                  ✕
                </button>
              )}

              <button
                className="search-action-btn"
                onClick={() => {}}
                aria-label="Search"
                type="button"
              >
                <span className="search-btn-text">Find Brews</span>
                <svg className="search-btn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>

            {/* Premium Horizontal Suggestion Carousel */}
            <div className="suggestion-carousel-bar">
              <div className="suggestion-badge-label">
                <span className="flame-icon">🔥</span>
                <span>Trending:</span>
              </div>

              <div className="suggestion-scroll-track">
                {[
                  { label: "Masala Chai", icon: "☕" },
                  { label: "Cold Coffee", icon: "🧊" },
                  { label: "Kullhad Chai", icon: "🫖" },
                  { label: "Iced Tea", icon: "🍋" },
                  { label: "Hot Chocolate", icon: "🍫" },
                  { label: "Green Tea", icon: "🌿" },
                  { label: "Elaichi Chai", icon: "✨" },
                  { label: "Ginger Chai", icon: "🔥" },
                  { label: "Cold Brew", icon: "⚡" },
                ].map((item) => {
                  const isActive = searchQuery.toLowerCase() === item.label.toLowerCase();
                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={`suggestion-pill ${isActive ? "active" : ""}`}
                      onClick={() => setSearchQuery(isActive ? "" : item.label)}
                    >
                      <span className="pill-icon">{item.icon}</span>
                      <span className="pill-text">{item.label}</span>
                      {isActive && <span className="pill-active-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Filter Drawer Overlay */}
      <div
        className={`filter-backdrop ${mobileFilterOpen ? "visible" : ""}`}
        onClick={() => setMobileFilterOpen(false)}
      />

      {/* Main Container: Filter Sidebar (290px) + Product Grid (1fr) */}
      <div className="shop-main-layout">
        {/* Left Filter Sidebar */}
        <aside className={`shop-filter-sidebar ${mobileFilterOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-title-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <h2 className="sidebar-heading">Filters</h2>
            </div>
            
            <div className="sidebar-header-actions">
              {hasActiveFilters && (
                <button className="reset-filters-btn" onClick={handleResetFilters}>
                  Clear all
                </button>
              )}
              <button
                className="sidebar-close-mobile"
                onClick={() => setMobileFilterOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="sidebar-content">
            {/* Desktop Sidebar Search Box */}
            <div className="sidebar-search-box">
              <svg className="sidebar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search chai, coffee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sidebar-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="sidebar-search-clear"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Section */}
            <div className="sidebar-group">
              <div className="group-header">
                <span className="group-title">Categories</span>
                <span className="group-badge">{availableCategories.length - 1} types</span>
              </div>
              <div className="category-options-list">
                {availableCategories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const count = categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setMobileFilterOpen(false);
                      }}
                      className={`cat-pill-btn ${isSelected ? "selected" : ""}`}
                    >
                      <span className="cat-name">
                        {cat === "All" ? "✨ All Products" : cat}
                      </span>
                      <span className="cat-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Filter Section */}
            <div className="sidebar-group">
              <div className="group-header">
                <span className="group-title">Price Range</span>
              </div>
              <div className="price-radios-list">
                {[
                  { label: "All Prices", val: "All" },
                  { label: "Under ₹100", val: "under100" },
                  { label: "₹100 - ₹200", val: "100-200" },
                  { label: "Over ₹200", val: "over200" },
                ].map((item) => (
                  <label key={item.val} className="radio-label">
                    <input
                      type="radio"
                      name="priceFilter"
                      checked={selectedPrice === item.val}
                      onChange={() => setSelectedPrice(item.val)}
                      className="radio-input"
                    />
                    <span className="radio-custom"></span>
                    <span className="radio-text">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating Filter Section */}
            <div className="sidebar-group">
              <div className="group-header">
                <span className="group-title">Minimum Rating</span>
              </div>
              <div className="rating-buttons-row">
                {[
                  { label: "All", val: "All" },
                  { label: "4.0★+", val: "4.0" },
                  { label: "4.5★+", val: "4.5" },
                  { label: "4.8★+", val: "4.8" },
                ].map((r) => (
                  <button
                    key={r.val}
                    className={`rating-chip ${selectedRating === r.val ? "active" : ""}`}
                    onClick={() => setSelectedRating(r.val)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary / In Stock Switch */}
            <div className="sidebar-group">
              <div className="toggle-row">
                <div>
                  <span className="toggle-title">In Stock Only</span>
                  <p className="toggle-sub">Show only items ready to brew</p>
                </div>
                <label className="switch-wrapper">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
            </div>

            {/* Group by category toggle */}
            {selectedCategory === "All" && (
              <div className="sidebar-group">
                <div className="toggle-row">
                  <div>
                    <span className="toggle-title">Category Grouping</span>
                    <p className="toggle-sub">Organize items by section</p>
                  </div>
                  <label className="switch-wrapper">
                    <input
                      type="checkbox"
                      checked={viewGrouping}
                      onChange={(e) => setViewGrouping(e.target.checked)}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Product Grid Area */}
        <main className="shop-product-area">
          
          {/* Top Category Tabs Bar + Mobile Filter Trigger */}
          <div className="category-nav-bar">
            <div className="category-scroll-pills">
              {availableCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`top-cat-pill ${isSelected ? "active" : ""}`}
                  >
                    {cat === "All" ? "✨ All Products" : cat}
                    <span className="pill-badge-num">
                      {categoryCounts[cat] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="nav-bar-actions">
              <button
                className="mobile-open-filters-btn"
                onClick={() => setMobileFilterOpen(true)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <span>Filters</span>
                {hasActiveFilters && <span className="active-dot"></span>}
              </button>

              <span className="results-badge">
                Showing <strong>{filteredProducts.length}</strong> items
              </span>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <h3 className="loading-title">Brewing Authentic Flavors...</h3>
              <p className="loading-desc">Fetching fresh menu items from Chai Chaska estates.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            /* Empty State */
            <div className="empty-state-box">
              <div className="empty-icon-circle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
              </div>
              <h3 className="empty-title">No products match your criteria</h3>
              <p className="empty-desc">
                We couldn't find any brews matching your active filters. Try searching for another item or clear your filters.
              </p>
              <button className="empty-reset-btn" onClick={handleResetFilters}>
                Reset All Filters
              </button>
            </div>
          ) : viewGrouping && selectedCategory === "All" && groupedProducts ? (
            /* Grouped View by Category */
            <div className="grouped-category-container">
              {Object.keys(groupedProducts).map((catName) => {
                const itemsInGroup = groupedProducts[catName];
                if (!itemsInGroup || itemsInGroup.length === 0) return null;
                return (
                  <div key={catName} className="category-group-section">
                    <div className="section-title-row">
                      <div className="section-title-left">
                        <span className="section-accent-bar"></span>
                        <h2 className="section-heading">{catName}</h2>
                        <span className="section-count-badge">
                          {itemsInGroup.length} items
                        </span>
                      </div>
                      <button
                        className="section-view-all-btn"
                        onClick={() => setSelectedCategory(catName)}
                      >
                        Filter this category →
                      </button>
                    </div>

                    <motion.div
                      key={`group-${catName}`}
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="products-grid-layout"
                    >
                      {itemsInGroup.map((product, idx) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          index={idx}
                          cardVariants={cardVariants}
                          cartItems={cartItems}
                          onAddToTray={handleAddToTray}
                          onShare={handleShareProduct}
                          onNavigate={() => router.push(`/product/${product.id}`)}
                        />
                      ))}
                    </motion.div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Standard Staggered Grid */
            <motion.div
              key={`${selectedCategory}-${searchQuery}-${selectedPrice}-${selectedRating}-${inStockOnly}`}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="products-grid-layout"
            >
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  cardVariants={cardVariants}
                  cartItems={cartItems}
                  onAddToTray={handleAddToTray}
                  onShare={handleShareProduct}
                  onNavigate={() => router.push(`/product/${product.id}`)}
                />
              ))}
            </motion.div>
          )}
        </main>
      </div>

      {/* Floating Bottom Tray Bar (Visible when cart has items) */}
      <AnimatePresence>
        {cartItems && cartItems.length > 0 && !trayDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className={`floating-tray-bar ${cartGradientActive ? "with-gradient-pulse" : ""}`}
            onClick={() => setTrayDrawerOpen(true)}
          >
            {/* Overlapping Thumbnails Stack (Up to 4 + extra) */}
            <div className="tray-avatar-stack">
              {cartItems.slice(0, 4).map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="stack-thumb-wrapper"
                  style={{ zIndex: 10 - idx }}
                >
                  <img src={item.image} alt="" className="stack-thumb-img" />
                </div>
              ))}
              {cartItems.length > 4 && (
                <div className="stack-thumb-wrapper stack-more-badge" style={{ zIndex: 5 }}>
                  +{cartItems.length - 4}
                </div>
              )}
            </div>

            {/* Info in the middle: items count and total price */}
            <div className="tray-bar-info">
              <span className="tray-bar-count">
                {cartItems.reduce((sum, i) => sum + (i.quantity || 1), 0)} items in tray
              </span>
              <span className="tray-bar-price">
                ₹{getCartTotal ? getCartTotal() : 0}
              </span>
            </div>

            {/* Action on right */}
            <button className="tray-bar-action-btn" onClick={(e) => { e.stopPropagation(); setTrayDrawerOpen(true); }}>
              <span>View Tray</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 80% Bottom-to-Top Slider (Slide-up Drawer) */}
      <AnimatePresence>
        {trayDrawerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="tray-drawer-backdrop"
              onClick={() => setTrayDrawerOpen(false)}
            />

            {/* 80% Height Drawer Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="tray-bottom-slider"
            >
              {/* Drag handle */}
              <div className="slider-drag-handle" />

              {/* Header */}
              <div className="slider-header">
                <div className="slider-header-left">
                  <h2 className="slider-title">Your Tray</h2>
                  <span className="slider-count-badge">
                    {cartItems.reduce((sum, i) => sum + (i.quantity || 1), 0)} items
                  </span>
                </div>

                <div className="slider-header-right">
                  <button
                    className="slider-clear-btn"
                    onClick={() => {
                      clearCart();
                      setTrayDrawerOpen(false);
                    }}
                  >
                    Clear Tray
                  </button>
                  <button
                    className="slider-close-btn"
                    onClick={() => setTrayDrawerOpen(false)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Scrollable Items List */}
              <div className="slider-scrollable-body">
                {cartItems.length === 0 ? (
                  <div className="slider-empty-state">
                    <p>Your tray is currently empty.</p>
                  </div>
                ) : (
                  <div className="slider-items-list">
                    {cartItems.map((item, idx) => {
                      const itemPrice = parseInt(String(item.price).replace(/[^0-9]/g, "")) || 0;
                      return (
                        <div key={`${item.id}-${idx}`} className="slider-item-row">
                          <div className="slider-item-img-box">
                            <img src={item.image} alt={item.name} className="slider-item-img" />
                          </div>

                          <div className="slider-item-details">
                            <h4 className="slider-item-name">{item.name}</h4>
                            <span className="slider-item-unit-price">
                              ₹{itemPrice} each
                            </span>
                            {item.sugar && (
                              <span className="slider-item-tag">{item.sugar} sugar</span>
                            )}
                          </div>

                          <div className="slider-item-actions">
                            {/* Quantity pill */}
                            <div className="slider-qty-controls">
                              <button
                                className="slider-qty-btn minus"
                                onClick={() => {
                                  if (item.quantity <= 1) {
                                    removeFromCart(idx);
                                  } else {
                                    updateQuantity(idx, item.quantity - 1);
                                  }
                                }}
                              >
                                –
                              </button>
                              <span className="slider-qty-num">{item.quantity}</span>
                              <button
                                className="slider-qty-btn plus"
                                onClick={() => updateQuantity(idx, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>

                            <span className="slider-item-subtotal">
                              ₹{itemPrice * item.quantity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bill & Checkout Footer (Fixed at bottom of the 80% sheet) */}
              <div className="slider-footer-sheet">
                <div className="slider-bill-summary">
                  <div className="bill-row">
                    <span className="bill-label">Item Total</span>
                    <span className="bill-val">₹{getCartTotal ? getCartTotal() : 0}</span>
                  </div>
                  <div className="bill-row">
                    <span className="bill-label">Taxes & Brewing</span>
                    <span className="bill-val" style={{ color: "#16a34a" }}>Included</span>
                  </div>
                  <div className="bill-row total-row">
                    <span className="bill-label-bold">Grand Total</span>
                    <span className="bill-val-bold">₹{getCartTotal ? getCartTotal() : 0}</span>
                  </div>
                </div>

                <div className="slider-cta-row">
                  <button
                    className="slider-checkout-btn"
                    onClick={() => router.push("/cart")}
                  >
                    <span>Proceed to Order (₹{getCartTotal ? getCartTotal() : 0})</span>
                    <span className="arrow-icon">→</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Bar (Mobile screen only: Shop, Orders, Checkout, Get App) */}
      <nav className="mobile-bottom-nav">
        {/* 1. Shop */}
        <Link href="/shop" className="bottom-nav-item active">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span className="bottom-nav-label">Shop</span>
        </Link>

        {/* 2. Orders */}
        <Link href="/orders" className="bottom-nav-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span className="bottom-nav-label">Orders</span>
        </Link>

        {/* 3. Checkout */}
        <button
          className="bottom-nav-item checkout-btn-item"
          onClick={() => {
            if (cartItems && cartItems.length > 0) {
              setTrayDrawerOpen(true);
            } else {
              router.push("/cart");
            }
          }}
        >
          <div className="bottom-nav-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            {cartItems && cartItems.length > 0 && (
              <span className="bottom-nav-badge">
                {cartItems.reduce((sum, i) => sum + (i.quantity || 1), 0)}
              </span>
            )}
          </div>
          <span className="bottom-nav-label">Checkout</span>
        </button>

        {/* 4. Get App */}
        <button
          className="bottom-nav-item get-app-btn-item"
          onClick={handleInstallApp}
          title="Install Chai Chaska on Home Screen"
        >
          <div className="get-app-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <span className="get-app-sparkle">✦</span>
          </div>
          <span className="bottom-nav-label">Get App</span>
        </button>
      </nav>

      {/* PWA Install Guide Modal */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="install-modal-backdrop" onClick={() => setShowInstallModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="install-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="install-modal-logo-box">
                <img src="/logo.png" alt="Chai Chaska Logo" className="install-modal-logo" />
              </div>

              <h3 className="install-modal-title">Add to Home Screen</h3>
              <p className="install-modal-desc">
                Install Chai Chaska on your home screen for quick 1-tap access and instant live order tracking.
              </p>

              <div className="install-steps-box">
                <div className="install-step-row">
                  <div className="step-num">1</div>
                  <div className="step-text">
                    <strong>Chrome / Android:</strong> Tap the three dots (⋮) menu at the top-right and choose <em>"Add to Home screen"</em> or <em>"Install App"</em>.
                  </div>
                </div>

                <div className="install-step-row">
                  <div className="step-num">2</div>
                  <div className="step-text">
                    <strong>Safari / iOS:</strong> Tap the Share button (⎋) at the bottom and choose <em>"Add to Home Screen"</em>.
                  </div>
                </div>
              </div>

              <button
                className="install-modal-action-btn"
                onClick={async () => {
                  if (deferredPrompt) {
                    try {
                      deferredPrompt.prompt();
                      const choice = await deferredPrompt.userChoice;
                      if (choice && choice.outcome === "accepted") {
                        setDeferredPrompt(null);
                        setShowInstallModal(false);
                      }
                    } catch (e) {
                      console.warn("Install error:", e);
                    }
                  } else {
                    alert("To add Chai Chaska to your Home Screen:\n\n• Android / Chrome: Tap menu (⋮) -> 'Add to Home screen'\n• iPhone / Safari: Tap Share (⎋) -> 'Add to Home Screen'");
                  }
                }}
              >
                📲 Add to Home Screen
              </button>

              <button
                className="install-modal-close-btn"
                onClick={() => setShowInstallModal(false)}
              >
                Maybe Later
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded Modern White Theme Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* ============================================================ */
        /* LUXURY 1-SECOND CURTAIN ROLL PRELOADER                        */
        /* ============================================================ */
        .curtain-preloader-root {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999999;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: all;
          overflow: hidden;
        }

        .curtain-half {
          position: absolute;
          left: 0;
          right: 0;
          width: 100%;
          height: 50.5vh;
          background: #090d16;
          overflow: hidden;
          box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.8);
        }

        .curtain-top {
          top: 0;
          transform-origin: top center;
        }

        .curtain-bottom {
          bottom: 0;
          transform-origin: bottom center;
        }

        /* Subtle velvet fabric drape texture */
        .curtain-fabric-pattern {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.015) 0px,
            rgba(255, 255, 255, 0.04) 20px,
            rgba(0, 0, 0, 0.3) 40px,
            rgba(255, 255, 255, 0.015) 60px
          );
          opacity: 0.9;
        }

        /* Golden trim along meeting seam */
        .curtain-gold-trim {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            #d97706 20%,
            #fbbf24 50%,
            #d97706 80%,
            transparent 100%
          );
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.7);
        }

        .curtain-gold-trim.bottom-trim {
          bottom: 0;
        }

        .curtain-gold-trim.top-trim {
          top: 0;
        }

        /* Center Crest */
        .curtain-center-crest {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 24px;
        }

        .curtain-logo-wrap {
          position: relative;
          width: 88px;
          height: 88px;
          border-radius: 50%;
          padding: 6px;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 0 2px rgba(251, 191, 36, 0.4);
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .curtain-logo-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .curtain-steam-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(251, 191, 36, 0.35);
          animation: steamRipple 1.2s ease-out infinite;
        }

        @keyframes steamRipple {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.35);
            opacity: 0;
          }
        }

        .curtain-brand-title {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 0.16em;
          color: #ffffff;
          margin: 0 0 6px 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
        }

        .curtain-brand-subtitle {
          font-size: 13.5px;
          font-weight: 500;
          color: #94a3b8;
          margin: 0 0 20px 0;
          letter-spacing: 0.05em;
        }

        .curtain-progress-track {
          width: 140px;
          height: 3px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 9999px;
          overflow: hidden;
        }

        .curtain-progress-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #d97706, #fbbf24);
          border-radius: 9999px;
          animation: curtainFillBar 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes curtainFillBar {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        /* Root container & typography */
        .shop-page-wrapper {
          background: #ffffff;
          min-height: 100vh;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          position: relative;
        }

        /* Top Header - Hidden on Desktop Screen Size */
        .shop-top-header {
          display: none;
          background: #ffffff;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #f1f5f9;
          text-align: center;
          position: relative;
        }

        .header-inner {
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .header-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: #475569;
          margin-bottom: 18px;
        }

        .badge-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .header-main-title {
          font-size: clamp(32px, 4.5vw, 48px);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          color: #0f172a;
          margin: 0 0 14px 0;
        }

        .title-gradient {
          background: linear-gradient(135deg, #0f172a 30%, #64748b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .header-sub-text {
          font-size: clamp(15px, 2vw, 17px);
          color: #64748b;
          line-height: 1.6;
          max-width: 620px;
          margin: 0 0 28px 0;
        }

        /* Top Modern Search Bar & Suggestion Carousel */
        .top-search-container {
          width: 100%;
          max-width: 680px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .search-bar-shell {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 9999px;
          padding: 5px 6px 5px 18px;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
          transition: all 0.25s ease;
        }

        .search-bar-shell:focus-within {
          border-color: #0f172a;
          box-shadow: 0 8px 30px -4px rgba(15, 23, 42, 0.12);
        }

        .search-icon {
          color: #94a3b8;
          flex-shrink: 0;
          margin-right: 12px;
          transition: color 0.2s ease;
        }

        .search-bar-shell:focus-within .search-icon {
          color: #0f172a;
        }

        .search-input-field {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14.5px;
          color: #0f172a;
          font-weight: 500;
          min-width: 0;
        }

        .search-input-field::placeholder {
          color: #94a3b8;
          font-weight: 450;
        }

        .search-clear-btn {
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 11px;
          cursor: pointer;
          margin-right: 8px;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .search-clear-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .search-action-btn {
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
        }

        .search-action-btn:hover {
          background: #334155;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
        }

        .search-btn-icon {
          transition: transform 0.2s ease;
        }

        .search-action-btn:hover .search-btn-icon {
          transform: translateX(2px);
        }

        /* Suggestion Carousel Bar */
        .suggestion-carousel-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        .suggestion-badge-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 750;
          color: #64748b;
          white-space: nowrap;
          flex-shrink: 0;
          padding: 4px 0;
        }

        .flame-icon {
          font-size: 14px;
        }

        .suggestion-scroll-track {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding: 4px 2px;
          flex: 1;
          min-width: 0;
        }

        .suggestion-scroll-track::-webkit-scrollbar {
          display: none;
        }

        .suggestion-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          padding: 6px 14px;
          font-size: 12.5px;
          font-weight: 650;
          color: #334155;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
        }

        .suggestion-pill:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #0f172a;
          transform: translateY(-1px);
        }

        .suggestion-pill.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
        }

        .pill-icon {
          font-size: 13px;
        }

        .pill-text {
          line-height: 1;
        }

        .pill-active-check {
          font-size: 11px;
          color: #10b981;
          font-weight: 800;
          margin-left: 2px;
        }

        /* Main Shop Layout */
        .shop-main-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 24px;
          max-width: 1720px;
          margin: 0 auto;
          padding: 24px 20px 72px;
          box-sizing: border-box;
        }

        /* Left Filter Sidebar */
        .shop-filter-sidebar {
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 20px;
          padding: 20px 18px;
          box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.03);
          height: fit-content;
          position: sticky;
          top: 86px;
          align-self: start;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
          margin-bottom: 22px;
        }

        .sidebar-title-box {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #0f172a;
        }

        .sidebar-heading {
          font-size: 17px;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }

        .sidebar-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .reset-filters-btn {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          transition: color 0.2s;
          padding: 0;
        }

        .reset-filters-btn:hover {
          color: #0f172a;
          text-decoration: underline;
        }

        .sidebar-close-mobile {
          display: none;
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          cursor: pointer;
        }

        .sidebar-search-box {
          display: flex;
          align-items: center;
          gap: 9px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 8px 12px;
          transition: all 0.2s ease;
        }

        .sidebar-search-box:focus-within {
          border-color: #0f172a;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.05);
        }

        .sidebar-search-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 13px;
          color: #0f172a;
          width: 100%;
          font-family: inherit;
        }

        .sidebar-search-input::placeholder {
          color: #94a3b8;
        }

        .sidebar-search-clear {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 0 2px;
        }

        .sidebar-search-clear:hover {
          color: #0f172a;
        }

        .sidebar-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .sidebar-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .group-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .group-badge {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
        }

        /* Category options in sidebar */
        .category-options-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .cat-pill-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13.5px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .cat-pill-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
          border-color: #e2e8f0;
        }

        .cat-pill-btn.selected {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.15);
        }

        .cat-count {
          font-size: 11.5px;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.05);
          padding: 2px 8px;
          border-radius: 9999px;
        }

        .cat-pill-btn.selected .cat-count {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        /* Price Radios */
        .price-radios-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: #334155;
          cursor: pointer;
          user-select: none;
        }

        .radio-input {
          display: none;
        }

        .radio-custom {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 1.5px solid #cbd5e1;
          display: inline-block;
          position: relative;
          transition: all 0.2s;
        }

        .radio-input:checked + .radio-custom {
          border-color: #0f172a;
        }

        .radio-input:checked + .radio-custom::after {
          content: "";
          position: absolute;
          top: 3px;
          left: 3px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #0f172a;
        }

        /* Rating buttons row */
        .rating-buttons-row {
          display: flex;
          gap: 6px;
        }

        .rating-chip {
          flex: 1;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 7px 4px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }

        .rating-chip:hover, .rating-chip.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }

        /* Switches */
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
        }

        .toggle-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          display: block;
        }

        .toggle-sub {
          font-size: 11.5px;
          color: #94a3b8;
          margin: 2px 0 0 0;
        }

        .switch-wrapper {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .switch-wrapper input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .switch-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #e2e8f0;
          transition: 0.3s;
          border-radius: 24px;
        }

        .switch-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }

        .switch-wrapper input:checked + .switch-slider {
          background-color: #0f172a;
        }

        .switch-wrapper input:checked + .switch-slider:before {
          transform: translateX(20px);
        }

        /* Right Product Area */
        .shop-product-area {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* Category Nav Bar (Horizontal) */
        .category-nav-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 20px;
          padding: 8px 14px;
          box-shadow: 0 4px 16px -2px rgba(15, 23, 42, 0.02);
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .category-scroll-pills {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          padding: 4px 2px;
          flex: 1;
          min-width: 0;
        }

        .category-scroll-pills::-webkit-scrollbar {
          display: none;
        }

        .top-cat-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .top-cat-pill:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .top-cat-pill.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }

        .pill-badge-num {
          font-size: 11px;
          background: rgba(0, 0, 0, 0.06);
          padding: 1px 7px;
          border-radius: 9999px;
        }

        .top-cat-pill.active .pill-badge-num {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .nav-bar-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .results-badge {
          font-size: 13px;
          color: #64748b;
          white-space: nowrap;
        }

        .mobile-open-filters-btn {
          display: none;
          align-items: center;
          gap: 6px;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
        }

        /* Products Grid Layout (5 products in 1 row on desktop) */
        .products-grid-layout {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
        }

        /* Grouped Sections */
        .grouped-category-container {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }

        .category-group-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .section-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }

        .section-title-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .section-accent-bar {
          width: 4px;
          height: 24px;
          background: #0f172a;
          border-radius: 9999px;
        }

        .section-heading {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .section-count-badge {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          background: #f1f5f9;
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .section-view-all-btn {
          background: transparent;
          border: none;
          color: #0f172a;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .section-view-all-btn:hover {
          text-decoration: underline;
        }

        /* ============================================================ */
        /* EXACT REFERENCE CARD STYLING (media_1789539141836.png)        */
        /* ============================================================ */
        .ref-card-outer {
          background: #ffffff;
          border-radius: 28px;
          border: 1px solid #f1f5f9;
          padding: 12px;
          box-shadow: 0 10px 30px -4px rgba(15, 23, 42, 0.04), 0 2px 6px -1px rgba(15, 23, 42, 0.02);
          display: flex;
          flex-direction: column;
          cursor: pointer;
          position: relative;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease;
          overflow: hidden;
        }

        .ref-card-outer:hover {
          transform: translateY(-7px);
          box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.1), 0 4px 12px -2px rgba(15, 23, 42, 0.04);
        }

        /* Top Framed Media Container */
        .ref-card-media {
          width: 100%;
          aspect-ratio: 1 / 1.05;
          border-radius: 20px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.35s ease;
        }

        .ref-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ref-card-outer:hover .ref-card-img {
          transform: scale(1.06);
        }

        /* Floating Top-Right Share Action Button (Reference UI) */
        .ref-card-share-btn {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.85);
          color: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          z-index: 5;
        }

        .ref-card-share-btn:hover {
          background: #ffffff;
          transform: scale(1.08);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
        }

        /* Floating Rating Tag on Media (Top Left) */
        .ref-card-rating-tag {
          position: absolute;
          top: 14px;
          left: 14px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.9);
          color: #0f172a;
          font-size: 11.5px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          z-index: 5;
        }

        .star-icon {
          color: #eab308;
        }

        /* Bottom Info Row (White Background) */
        .ref-card-bottom {
          padding: 10px 4px 2px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ref-card-left-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 100%;
          overflow: hidden;
        }

        .ref-card-title {
          font-size: 14.5px;
          font-weight: 750;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ref-card-status-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .status-dot-pulse {
          width: 6.5px;
          height: 6.5px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
          flex-shrink: 0;
        }

        .status-text {
          color: #64748b;
          white-space: nowrap;
        }

        .status-divider {
          color: #cbd5e1;
        }

        .ref-card-price {
          color: #0f172a;
          font-weight: 800;
          font-size: 13.5px;
        }

        /* Pill Action Button: "Add to tray" (Full-width & Responsive) */
        .ref-card-tray-btn {
          width: 100%;
          background: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.1);
          box-sizing: border-box;
        }

        .ref-card-tray-btn:hover {
          background: #334155;
          transform: scale(1.02);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.16);
        }

        .ref-card-tray-btn.in-tray {
          background: #f1f5f9;
          color: #0f172a;
          border: 1px solid #e2e8f0;
          box-shadow: none;
        }

        .ref-card-tray-btn.in-tray:hover {
          background: #e2e8f0;
        }

        /* Floating Toast */
        .tray-toast-banner {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #ffffff;
          padding: 10px 14px 10px 10px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 16px 40px -4px rgba(15, 23, 42, 0.35);
          z-index: 9999;
          border: 1px solid rgba(255, 255, 255, 0.12);
          max-width: 90vw;
        }

        .toast-img-box {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          overflow: hidden;
          background: #334155;
          flex-shrink: 0;
        }

        .toast-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .toast-text-box {
          display: flex;
          flex-direction: column;
        }

        .toast-title {
          font-size: 13px;
          font-weight: 800;
          color: #38bdf8;
        }

        .toast-desc {
          font-size: 12px;
          color: #e2e8f0;
          font-weight: 500;
          white-space: nowrap;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .toast-btn {
          background: #ffffff;
          color: #0f172a;
          text-decoration: none;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .toast-btn:hover {
          background: #f1f5f9;
        }

        /* ============================================================ */
        /* FLOATING TRAY DOCK & BOTTOM 80% SLIDER SHEET                 */
        /* ============================================================ */
        .floating-tray-bar {
          position: fixed;
          bottom: 24px;
          left: 0;
          right: 0;
          margin-left: auto;
          margin-right: auto;
          width: calc(100% - 32px);
          max-width: 580px;
          background: #0f172a;
          color: #ffffff;
          padding: 8px 14px 8px 10px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 20px 45px -8px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.12);
          z-index: 9999;
          cursor: pointer;
          box-sizing: border-box;
          transition: box-shadow 0.25s ease;
        }

        .floating-tray-bar:hover {
          box-shadow: 0 24px 50px -6px rgba(15, 23, 42, 0.5), 0 0 0 1.5px rgba(255, 255, 255, 0.2);
        }

        /* Dynamic background gradient pulse when product is added */
        .floating-tray-bar.with-gradient-pulse {
          background: linear-gradient(
            120deg,
            #0f172a 0%,
            #312e81 20%,
            #6366f1 40%,
            #a855f7 60%,
            #ec4899 80%,
            #0f172a 100%
          ) !important;
          background-size: 300% 300% !important;
          animation: trayGradientFlow 1.6s ease-in-out infinite, trayBumpPulse 0.45s cubic-bezier(0.16, 1, 0.3, 1) !important;
          box-shadow: 0 0 32px rgba(168, 85, 247, 0.75), 0 20px 45px -8px rgba(15, 23, 42, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.4) !important;
        }

        @keyframes trayGradientFlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes trayBumpPulse {
          0% {
            transform: scale(1);
          }
          40% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
          }
        }

        /* Avatar Stack Overlapping Thumbnails */
        .tray-avatar-stack {
          display: flex;
          align-items: center;
          padding-left: 4px;
          flex-shrink: 0;
        }

        .stack-thumb-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid #0f172a;
          margin-left: -10px;
          overflow: hidden;
          background: #1e293b;
          flex-shrink: 0;
          position: relative;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        }

        .stack-thumb-wrapper:first-child {
          margin-left: 0;
        }

        .stack-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .stack-more-badge {
          background: #334155;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: -0.02em;
        }

        .tray-bar-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .tray-bar-count {
          font-size: 11.5px;
          color: #94a3b8;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tray-bar-price {
          font-size: 15px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        .tray-bar-action-btn {
          background: #ffffff;
          color: #0f172a;
          border-radius: 9999px;
          padding: 8px 16px;
          font-size: 12.5px;
          font-weight: 750;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tray-bar-action-btn:hover {
          background: #f1f5f9;
          transform: scale(1.03);
        }

        /* 80% Bottom Sheet Drawer */
        .tray-drawer-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 10000;
        }

        .tray-bottom-slider {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          margin-left: auto;
          margin-right: auto;
          width: 100%;
          max-width: 640px;
          height: 80vh;
          max-height: 80vh;
          background: #ffffff;
          border-radius: 32px 32px 0 0;
          z-index: 10001;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 -20px 60px rgba(15, 23, 42, 0.25);
          border: 1px solid #f1f5f9;
          border-bottom: none;
        }

        .slider-drag-handle {
          width: 44px;
          height: 5px;
          background: #e2e8f0;
          border-radius: 9999px;
          margin: 12px auto 4px;
          flex-shrink: 0;
        }

        .slider-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px 16px;
          border-bottom: 1px solid #f1f5f9;
          flex-shrink: 0;
        }

        .slider-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .slider-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .slider-count-badge {
          background: #f1f5f9;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .slider-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .slider-clear-btn {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 4px 8px;
          transition: opacity 0.2s;
        }

        .slider-clear-btn:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        .slider-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1f5f9;
          border: none;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .slider-close-btn:hover {
          background: #e2e8f0;
        }

        /* Scrollable body */
        .slider-scrollable-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scrollbar-width: thin;
        }

        .slider-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .slider-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 14px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 18px;
          transition: background 0.2s;
        }

        .slider-item-row:hover {
          background: #f1f5f9;
        }

        .slider-item-img-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
        }

        .slider-item-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .slider-item-details {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 0;
        }

        .slider-item-name {
          font-size: 14.5px;
          font-weight: 750;
          color: #0f172a;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .slider-item-unit-price {
          font-size: 12.5px;
          color: #64748b;
          font-weight: 600;
        }

        .slider-item-tag {
          font-size: 10.5px;
          color: #8b5cf6;
          font-weight: 700;
          text-transform: capitalize;
        }

        .slider-item-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }

        .slider-qty-controls {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 9999px;
          padding: 2px 6px;
          gap: 8px;
        }

        .slider-qty-btn {
          background: none;
          border: none;
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          width: 22px;
          height: 22px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .slider-qty-btn:hover {
          background: #f1f5f9;
        }

        .slider-qty-num {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          min-width: 16px;
          text-align: center;
        }

        .slider-item-subtotal {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          min-width: 50px;
          text-align: right;
        }

        /* Footer inside 80% sheet */
        .slider-footer-sheet {
          padding: 16px 24px 24px;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.04);
        }

        .slider-bill-summary {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .bill-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          color: #64748b;
        }

        .bill-row.total-row {
          padding-top: 8px;
          border-top: 1px dashed #e2e8f0;
          margin-top: 4px;
        }

        .bill-label-bold {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .bill-val-bold {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
        }

        .slider-checkout-btn {
          background: #0f172a;
          color: #ffffff;
          padding: 14px 22px;
          border-radius: 9999px;
          font-size: 15px;
          font-weight: 750;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          transition: all 0.25s ease;
          box-shadow: 0 10px 24px -4px rgba(15, 23, 42, 0.25);
        }

        .slider-checkout-btn:hover {
          background: #334155;
          transform: translateY(-1px);
          box-shadow: 0 14px 28px -4px rgba(15, 23, 42, 0.35);
        }

        .arrow-icon {
          font-size: 18px;
          font-weight: 700;
        }

        /* Loading & Empty states */
        .loading-container {
          text-align: center;
          padding: 80px 24px;
          background: #f8fafc;
          border-radius: 28px;
          border: 1px dashed #e2e8f0;
        }

        .loading-spinner {
          width: 44px;
          height: 44px;
          border: 3.5px solid #e2e8f0;
          border-top-color: #0f172a;
          border-radius: 50%;
          margin: 0 auto 20px;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-title {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .loading-desc {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        .empty-state-box {
          text-align: center;
          padding: 70px 24px;
          background: #f8fafc;
          border-radius: 28px;
          border: 1px dashed #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .empty-icon-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        .empty-title {
          font-size: 19px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px 0;
        }

        .empty-desc {
          font-size: 14px;
          color: #64748b;
          max-width: 460px;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }

        .empty-reset-btn {
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 11px 24px;
          border-radius: 9999px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .empty-reset-btn:hover {
          background: #334155;
          transform: scale(1.03);
        }

        /* Responsive Breakpoints */
        @media (max-width: 1550px) {
          .products-grid-layout {
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
          }
        }

        @media (max-width: 1250px) {
          .products-grid-layout {
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
          }
        }

        @media (max-width: 980px) {
          .products-grid-layout {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }

        @media (max-width: 860px) {
          .shop-page-wrapper {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
              padding-bottom: 120px !important; /* Added to clear view tray */
          }

          .shop-top-header {
            display: block !important;
            padding: 12px 14px 8px !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          .sidebar-search-box {
            display: none !important;
          }

          .search-bar-shell {
            padding: 4px 5px 4px 14px !important;
          }

          .search-icon {
            margin-right: 8px !important;
            width: 17px !important;
            height: 17px !important;
          }

          .search-input-field {
            font-size: 13px !important;
          }

          .search-btn-text {
            display: none !important;
          }

          .search-action-btn {
            width: 34px !important;
            height: 34px !important;
            padding: 0 !important;
            border-radius: 50% !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
          }

          .search-btn-icon {
            width: 15px !important;
            height: 15px !important;
          }

          .suggestion-carousel-bar {
            gap: 6px !important;
            margin-top: 2px !important;
          }

          .suggestion-badge-label {
            font-size: 11px !important;
          }

          .suggestion-scroll-track {
            gap: 6px !important;
          }

          .suggestion-pill {
            padding: 5px 12px !important;
            font-size: 11.5px !important;
          }

          .shop-main-layout {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 12px 10px 50px !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
              padding-bottom: 120px !important; /* Added to clear view tray */
            gap: 14px !important;
          }

          .shop-product-area {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
              padding-bottom: 120px !important; /* Added to clear view tray */
          }

          .category-nav-bar {
            padding: 6px 10px !important;
            border-radius: 14px !important;
            gap: 8px !important;
          }

          .results-badge {
            display: none !important;
          }

          .mobile-open-filters-btn {
            display: inline-flex !important;
            padding: 6px 12px !important;
            font-size: 12px !important;
            flex-shrink: 0 !important;
          }

          /* Mobile filter drawer */
          .shop-filter-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 84%;
            max-width: 320px;
            height: 100dvh;
            border-radius: 0 24px 24px 0;
            z-index: 10000;
            transform: translateX(-100%);
            transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            overflow-y: auto;
            box-shadow: 16px 0 40px rgba(15, 23, 42, 0.2);
          }

          .shop-filter-sidebar.open {
            transform: translateX(0);
          }

          .sidebar-close-mobile {
            display: block;
          }

          .filter-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            z-index: 9998;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
          }

          .filter-backdrop.visible {
            opacity: 1;
            pointer-events: auto;
          }

          /* 2 Products in a row on mobile view */
          .products-grid-layout {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .ref-card-outer {
            padding: 8px !important;
            border-radius: 18px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          .ref-card-media {
            border-radius: 13px !important;
            aspect-ratio: 1 / 1 !important;
          }

          .ref-card-share-btn {
            width: 26px !important;
            height: 26px !important;
            border-radius: 8px !important;
            top: 6px !important;
            right: 6px !important;
          }

          .ref-card-share-btn svg {
            width: 12px !important;
            height: 12px !important;
          }

          .ref-card-rating-tag {
            top: 6px !important;
            left: 6px !important;
            font-size: 9.5px !important;
            padding: 2px 6px !important;
            gap: 2px !important;
          }

          .ref-card-bottom {
            padding: 8px 2px 2px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 6px !important;
          }

          .ref-card-left-info {
            width: 100% !important;
            gap: 2px !important;
          }

          .ref-card-title {
            font-size: 13px !important;
            font-weight: 750 !important;
            line-height: 1.25 !important;
          }

          .ref-card-status-row {
            font-size: 10.5px !important;
            gap: 4px !important;
          }

          .ref-card-price {
            font-size: 12px !important;
          }

          .ref-card-tray-btn {
            width: 100% !important;
            justify-content: center !important;
            padding: 6.5px 8px !important;
            font-size: 11px !important;
            border-radius: 9999px !important;
          }

          .ref-card-tray-btn svg {
            width: 11px !important;
            height: 11px !important;
          }

          /* Floating tray bar on mobile - sits above mobile bottom bar */
          .floating-tray-bar {
            bottom: 74px !important;
            left: 0 !important;
            right: 0 !important;
            margin-left: auto !important;
            margin-right: auto !important;
            width: calc(100% - 24px) !important;
            max-width: 480px !important;
            padding: 7px 12px 7px 8px !important;
            box-sizing: border-box !important;
          }

          .stack-thumb-wrapper {
            width: 32px !important;
            height: 32px !important;
            margin-left: -8px !important;
          }

          .tray-bar-price {
            font-size: 14px !important;
          }

          .tray-bar-action-btn {
            padding: 6px 12px !important;
            font-size: 11.5px !important;
          }

          /* Bottom 80% sheet on mobile */
          .tray-bottom-slider {
            left: 0 !important;
            right: 0 !important;
            margin-left: auto !important;
            margin-right: auto !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 26px 26px 0 0 !important;
            box-sizing: border-box !important;
          }

          .slider-header {
            padding: 10px 18px 14px !important;
          }

          .slider-scrollable-body {
            padding: 12px 16px !important;
          }

          .slider-footer-sheet {
            padding: 14px 18px 20px !important;
          }

          /* Mobile Bottom Bar (Visible on mobile only) */
          .mobile-bottom-nav {
            display: flex !important;
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 62px !important;
            background: rgba(255, 255, 255, 0.96) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border-top: 1px solid #f1f5f9 !important;
            z-index: 9998 !important;
            align-items: center !important;
            justify-content: space-around !important;
            padding: 0 6px !important;
            box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.05) !important;
          }
        }

        /* Desktop: Hide Mobile Bottom Nav */
        .mobile-bottom-nav {
          display: none;
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          color: #64748b;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 12px;
          transition: all 0.2s;
          font-family: inherit;
          flex: 1;
        }

        .bottom-nav-item.active {
          color: #0f172a;
          font-weight: 800;
        }

        .bottom-nav-label {
          font-size: 11px;
          font-weight: 650;
        }

        .bottom-nav-icon-box {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bottom-nav-badge {
          position: absolute;
          top: -5px;
          right: -8px;
          background: #0f172a;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          min-width: 16px;
          height: 16px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
          border: 1.5px solid #ffffff;
        }

        .get-app-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .get-app-sparkle {
          position: absolute;
          top: -6px;
          right: -8px;
          font-size: 11px;
          color: #f59e0b;
          animation: sparklePulse 1.5s infinite alternate;
        }

        @keyframes sparklePulse {
          from { transform: scale(0.85); opacity: 0.7; }
          to { transform: scale(1.2); opacity: 1; }
        }

        /* PWA Install Modal */
        .install-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 20000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .install-modal-card {
          background: #ffffff;
          border-radius: 28px;
          max-width: 400px;
          width: 100%;
          padding: 28px 24px;
          text-align: center;
          box-shadow: 0 25px 60px -15px rgba(15, 23, 42, 0.3);
          border: 1px solid #f1f5f9;
        }

        .install-modal-logo-box {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          margin: 0 auto 16px;
          overflow: hidden;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
          background: #f8fafc;
          border: 1px solid #e2e8f0;
        }

        .install-modal-logo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .install-modal-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px;
        }

        .install-modal-desc {
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 20px;
        }

        .install-steps-box {
          background: #f8fafc;
          border-radius: 18px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 22px;
          text-align: left;
          border: 1px solid #f1f5f9;
        }

        .install-step-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 12.5px;
          color: #334155;
          line-height: 1.45;
        }

        .step-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #0f172a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .install-modal-action-btn {
          width: 100%;
          background: #0f172a;
          color: #ffffff;
          padding: 13px 20px;
          border-radius: 9999px;
          border: none;
          font-size: 14.5px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.2);
          margin-bottom: 10px;
        }

        .install-modal-action-btn:hover {
          background: #1e293b;
          transform: translateY(-1px);
        }

        .install-modal-close-btn {
          width: 100%;
          background: transparent;
          color: #64748b;
          padding: 10px 16px;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .install-modal-close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
      ` }} />
    </div>
  );
}

// Individual Product Card Component matching exact Reference UI
function ProductCard({
  product,
  index,
  cardVariants,
  cartItems,
  onAddToTray,
  onShare,
  onNavigate,
}) {
  const isItemInTray =
    cartItems && cartItems.some((item) => String(item.id) === String(product.id));
  
  const quantityInTray = cartItems
    ? cartItems
        .filter((item) => String(item.id) === String(product.id))
        .reduce((sum, i) => sum + i.quantity, 0)
    : 0;

  const palette = getCardPalette(index, product.category);

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -7 }}
      className="ref-card-outer"
      onClick={onNavigate}
    >
      {/* Top Media Block with Gradient Backdrop */}
      <div
        className="ref-card-media"
        style={{
          background: palette.bg,
        }}
      >
        <img
          src={
            product.image ||
            "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80"
          }
          alt={product.name}
          className="ref-card-img"
          loading="lazy"
        />

        {/* Rating Badge */}
        <div className="ref-card-rating-tag">
          <span className="star-icon">★</span>
          <span>{product.rating || "4.8"}</span>
        </div>

        {/* Floating Share / Quick Action Button */}
        <button
          className="ref-card-share-btn"
          onClick={(e) => onShare(e, product)}
          title="Share blend"
          aria-label="Share product"
        >
          {/* Share SVG icon matching reference mockup */}
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        </button>
      </div>

      {/* Bottom Info Row */}
      <div className="ref-card-bottom">
        <div className="ref-card-left-info">
          <h3 className="ref-card-title">{product.name}</h3>
          
          <div className="ref-card-status-row">
            <span className="status-dot-pulse"></span>
            <span className="status-text">
              {product.inStock === false ? "Out of Stock" : "Fresh & Hot"}
            </span>
            <span className="status-divider">•</span>
            <span className="ref-card-price">
              {product.price?.startsWith("₹") ? product.price : `₹${product.price}`}
            </span>
          </div>
        </div>

        {/* Action Button: "Add to tray" (or In Tray) */}
        {isItemInTray ? (
          <button
            className="ref-card-tray-btn in-tray"
            onClick={(e) => {
              e.stopPropagation();
              // When already in tray, clicking adds one more or lets user know
              onAddToTray(e, product);
            }}
            title="Item is in tray - click to add another"
          >
            <span>Tray ({quantityInTray})</span>
            <span style={{ fontSize: "14px", fontWeight: "900" }}>+</span>
          </button>
        ) : (
          <button
            className="ref-card-tray-btn"
            onClick={(e) => onAddToTray(e, product)}
          >
            {/* Tray / Shopping Bag Plus Icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span>Add to tray</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
