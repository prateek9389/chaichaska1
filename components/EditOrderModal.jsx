"use client";

import { useState, useEffect } from "react";
import { updateOrder, onProductsSnapshot } from "@/lib/firestore";
import { cleanPhoneForApi } from "@/lib/whatsapp";
import { getProductMeta } from "@/lib/productMeta";

export default function EditOrderModal({
  isOpen,
  order,
  onClose,
  onSaveSuccess,
  productsList = []
}) {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [dbProducts, setDbProducts] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("cached_products") || sessionStorage.getItem("chai_products_cache");
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return [];
  });

  // Fetch live real products directly from official products database collection
  useEffect(() => {
    const unsub = onProductsSnapshot((prods) => {
      if (Array.isArray(prods) && prods.length > 0) {
        setDbProducts(prods);
        try {
          localStorage.setItem("cached_products", JSON.stringify(prods));
        } catch (e) {}
      }
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Populate items when order changes
  useEffect(() => {
    if (!order) return;

    if (Array.isArray(order.items) && order.items.length > 0) {
      setItems(
        order.items.map((it) => {
          const itemName = it.name || it.item || "Item";
          const meta = getProductMeta(itemName, it.image || it.img, it.category);
          let itemPrice = typeof it.price === "number" ? it.price : (parseFloat(String(it.price || it.priceNum || it.basePrice || 0).replace(/[^\d.]/g, "")) || 0);

          if (itemPrice === 0) {
            const matchProd = dbProducts.find(p => (p.name || p.title || "").toLowerCase() === itemName.toLowerCase())
              || (Array.isArray(productsList) ? productsList.find(p => (p.name || p.title || "").toLowerCase() === itemName.toLowerCase()) : null);
            if (matchProd) {
              itemPrice = typeof matchProd.price === "number" ? matchProd.price : (parseFloat(String(matchProd.price || 0).replace(/[^\d.]/g, "")) || 0);
            }
          }
          if (itemPrice === 0) {
            const lower = itemName.toLowerCase();
            if (lower.includes("cold coffee")) itemPrice = 70;
            else if (lower.includes("hot coffee") || lower.includes("coffee")) itemPrice = 40;
            else if (lower.includes("chai") || lower.includes("tea")) itemPrice = 20;
            else if (lower.includes("bun maska")) itemPrice = 50;
            else if (lower.includes("biscuit") || lower.includes("namkeen") || lower.includes("lahori")) itemPrice = 10;
          }

          return {
            name: itemName,
            price: itemPrice,
            quantity: parseInt(it.quantity || it.qty) || 1,
            image: meta.image || it.image || it.img || "/products/chai-chaska.jpg",
            sugar: it.sugar || "Regular",
            milk: it.milk || "Standard",
            notes: it.notes || ""
          };
        })
      );
    } else {
      const rawTotalNum = typeof order.amount === "number" ? order.amount : (parseFloat(String(order.total || order.price || order.priceNum || 0).replace(/[^\d.]/g, "")) || 0);
      const itemStr = order.item || "Chai Selection";
      const parts = itemStr.split(/[,+]/).map(s => s.trim()).filter(Boolean);
      
      const parsedItems = parts.map(part => {
        const match = part.match(/^(.*?)(?:\s*x\s*(\d+))?$/i);
        const name = match && match[1] ? match[1].trim() : part;
        const qty = match && match[2] ? parseInt(match[2]) : (parseInt(order.quantity) || 1);
        const meta = getProductMeta(name, order.image || order.img);
        
        let itemPrice = 0;
        const matchProd = dbProducts.find(p => (p.name || p.title || "").toLowerCase() === name.toLowerCase())
          || (Array.isArray(productsList) ? productsList.find(p => (p.name || p.title || "").toLowerCase() === name.toLowerCase()) : null);
        if (matchProd) {
          itemPrice = typeof matchProd.price === "number" ? matchProd.price : (parseFloat(String(matchProd.price || 0).replace(/[^\d.]/g, "")) || 0);
        }
        if (itemPrice === 0) {
          const lower = name.toLowerCase();
          if (lower.includes("cold coffee")) itemPrice = 70;
          else if (lower.includes("hot coffee") || lower.includes("coffee")) itemPrice = 40;
          else if (lower.includes("chai") || lower.includes("tea")) itemPrice = 20;
          else if (lower.includes("bun maska")) itemPrice = 50;
          else if (lower.includes("biscuit") || lower.includes("namkeen") || lower.includes("lahori")) itemPrice = 10;
          else if (parts.length === 1 && rawTotalNum > 0) {
            itemPrice = Math.round(rawTotalNum / qty);
          }
        }
        
        return {
          name,
          price: itemPrice || 20,
          quantity: qty,
          image: meta.image || order.image || order.img || "/products/chai-chaska.jpg",
          sugar: order.sugar || "Regular",
          milk: order.milk || "Standard",
          notes: ""
        };
      });

      setItems(parsedItems.length > 0 ? parsedItems : [{
        name: "Chai Selection",
        price: rawTotalNum || 20,
        quantity: 1,
        image: "/products/chai-chaska.jpg",
        sugar: "Regular",
        milk: "Standard",
        notes: ""
      }]);
    }
  }, [order, isOpen]);

  // Combine database products exclusively from the products collection
  const allProducts = (() => {
    const rawList = [
      ...dbProducts,
      ...(Array.isArray(productsList) ? productsList : [])
    ];
    
    const map = new Map();

    rawList.forEach((p, idx) => {
      const rawName = (p.name || p.title || p.item || "").trim();
      if (!rawName) return;
      const key = rawName.toLowerCase();
      if (!map.has(key)) {
        const meta = getProductMeta(rawName, p.image || p.img || p.photoURL, p.category);
        const parsedPrice = typeof p.price === "number" 
          ? p.price 
          : (parseFloat(String(p.price || p.priceNum || p.basePrice || 0).replace(/[^\d.]/g, "")) || 0);

        map.set(key, {
          id: p.id || `prod-${idx}`,
          name: rawName,
          price: parsedPrice,
          category: p.category || meta.category || "Beverages",
          image: meta.image || p.image || p.img || p.photoURL || "/products/chai-chaska.jpg"
        });
      }
    });

    return Array.from(map.values());
  })();

  // Dynamic Categories from Real Products
  const dynamicCategories = ["All", ...Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)))];

  // Filter products by category and search
  const filteredProducts = allProducts.filter((p) => {
    const matchesCat = selectedCategory === "All" || (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculate Subtotal & Total
  const subtotal = items.reduce((acc, it) => {
    const p = typeof it.price === "number" ? it.price : (parseFloat(String(it.price || 0).replace(/[^\d.]/g, "")) || 0);
    const q = parseInt(it.quantity) || 1;
    return acc + (p * q);
  }, 0);

  // Add Item to Order
  const handleAddItem = (prod) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.name.toLowerCase() === prod.name.toLowerCase());
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          price: Number(prod.price) || Number(updated[existingIdx].price) || 0,
          quantity: (Number(updated[existingIdx].quantity) || 1) + 1
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            name: prod.name,
            price: Number(prod.price) || 0,
            quantity: 1,
            image: prod.image || "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop",
            sugar: "Regular",
            milk: "Standard",
            notes: ""
          }
        ];
      }
    });
  };

  // Adjust Quantity
  const handleQtyChange = (idx, delta) => {
    setItems((prev) => {
      const updated = [...prev];
      const newQty = (Number(updated[idx].quantity) || 1) + delta;
      if (newQty <= 0) {
        updated.splice(idx, 1);
      } else {
        updated[idx] = { ...updated[idx], quantity: newQty };
      }
      return updated;
    });
  };

  // Remove Item
  const handleRemoveItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save Order Changes & Auto-Send WhatsApp
  const handleSaveChanges = async () => {
    if (items.length === 0) {
      alert("Order must have at least 1 item. You can cancel if no changes are needed.");
      return;
    }

    setIsSaving(true);

    try {
      const calculatedSubtotal = items.reduce((acc, it) => {
        const p = typeof it.price === "number" ? it.price : (parseFloat(String(it.price || 0).replace(/[^\d.]/g, "")) || 0);
        const q = parseInt(it.quantity) || 1;
        return acc + (p * q);
      }, 0);

      const firstItem = items[0];
      const resolvedItemImage = firstItem?.image || getProductMeta(firstItem?.name || items[0]?.name).image;

      const itemSummary = items.map((i) => `${i.name} x${i.quantity}`).join(", ");
      const totalFormatted = `₹${calculatedSubtotal}`;
      const totalQty = items.reduce((acc, it) => acc + (parseInt(it.quantity) || 1), 0);

      const cleanedItems = items.map(it => ({
        name: it.name,
        price: typeof it.price === 'number' ? it.price : (parseFloat(String(it.price || 0).replace(/[^\d.]/g, '')) || 0),
        priceNum: typeof it.price === 'number' ? it.price : (parseFloat(String(it.price || 0).replace(/[^\d.]/g, '')) || 0),
        quantity: parseInt(it.quantity) || 1,
        qty: parseInt(it.quantity) || 1,
        image: it.image || "",
        sugar: it.sugar || "Regular",
        milk: it.milk || "Standard",
        notes: it.notes || ""
      }));

      const updates = {
        items: cleanedItems,
        item: itemSummary,
        total: totalFormatted,
        totalPrice: totalFormatted,
        amount: calculatedSubtotal,
        price: calculatedSubtotal,
        priceNum: calculatedSubtotal,
        subtotal: totalFormatted,
        quantity: totalQty,
        qty: totalQty,
        image: resolvedItemImage,
        img: resolvedItemImage,
        updatedAt: Date.now()
      };

      await updateOrder(order.id, updates);

      setToastMessage("Order updated successfully!");
      if (onSaveSuccess) {
        onSaveSuccess({ ...order, ...updates });
      }

      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 600);
    } catch (e) {
      console.error("Error saving updated order:", e);
      alert("Failed to update order. Please try again.");
      setIsSaving(false);
    }
  };

  if (!isOpen || !order) return null;

  const orderNum = order.orderId || (order.id ? (typeof order.id === "string" ? order.id.slice(-6).toUpperCase() : order.id) : "N/A");

  return (
    <div className="edit-order-modal-backdrop" onClick={onClose}>
      <div className="edit-order-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="edit-modal-header">
          <div className="edit-modal-header-info">
            <div className="edit-modal-title-row">
              <span className="edit-order-tag">Order #{orderNum}</span>
              <span className="edit-modal-customer">👤 {order.customer || "Walk-in Customer"}</span>
            </div>
            <p className="edit-modal-sub">Add or remove items, adjust quantities, and auto-sync WhatsApp notification</p>
          </div>
          <button type="button" className="edit-modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* BODY (TWO COLUMNS ON DESKTOP) */}
        <div className="edit-modal-body">
          {/* LEFT: CURRENT ORDER ITEMS */}
          <div className="edit-modal-left">
            <div className="edit-section-header">
              <span className="edit-section-title">🛒 Order Items ({items.length})</span>
              <span className="edit-total-preview">Total: ₹{subtotal}</span>
            </div>

            <div className="current-items-scroll">
              {items.length === 0 ? (
                <div className="empty-items-notice">
                  <span>🧺</span>
                  <p>No items in order. Select products from the catalog on the right.</p>
                </div>
              ) : (
                items.map((it, idx) => (
                  <div key={idx} className="order-edit-item-row">
                    <img
                      src={it.image || "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop"}
                      alt={it.name}
                      className="order-edit-item-thumb"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop";
                      }}
                    />
                    <div className="order-edit-item-info">
                      <div className="order-edit-item-name">{it.name}</div>
                      <div className="order-edit-item-price">
                        ₹{it.price} each • <strong style={{ color: "#16a34a" }}>₹{(it.price || 0) * (it.quantity || 1)}</strong>
                      </div>
                    </div>

                    {/* QTY CONTROLS */}
                    <div className="order-edit-qty-controls">
                      <button
                        type="button"
                        className="qty-btn minus"
                        onClick={() => handleQtyChange(idx, -1)}
                        title="Decrease Quantity"
                      >
                        -
                      </button>
                      <span className="qty-val">{it.quantity || 1}</span>
                      <button
                        type="button"
                        className="qty-btn plus"
                        onClick={() => handleQtyChange(idx, 1)}
                        title="Increase Quantity"
                      >
                        +
                      </button>
                    </div>

                    {/* DELETE ITEM */}
                    <button
                      type="button"
                      className="item-delete-btn"
                      onClick={() => handleRemoveItem(idx)}
                      title="Remove Item"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* BILLING RECALCULATION SUMMARY */}
            <div className="order-edit-summary-card">
              <div className="summary-row">
                <span>Subtotal Items</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="summary-row">
                <span>Delivery & Tax</span>
                <span style={{ color: "#16a34a", fontWeight: "700" }}>₹0 (Complimentary)</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total-row">
                <span>Final Order Amount</span>
                <span className="final-total-val">₹{subtotal}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: SELECT & ADD PRODUCTS CATALOG */}
          <div className="edit-modal-right">
            <div className="edit-section-header">
              <span className="edit-section-title">➕ Add Products to Order</span>
            </div>

            {/* SEARCH BOX */}
            <div className="catalog-search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="catalog-search-input"
                placeholder="Search Chai, Coffee, Snacks, Maggi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="clear-search-btn" onClick={() => setSearchQuery("")}>✕</button>
              )}
            </div>

            {/* CATEGORY FILTER PILLS */}
            <div className="catalog-category-pills">
              {dynamicCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-filter-pill ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* PRODUCT CARDS LIST */}
            <div className="catalog-products-grid">
              {filteredProducts.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px 10px", color: "#94a3b8" }}>
                  <span style={{ fontSize: "28px", display: "block", marginBottom: "6px" }}>🔍</span>
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    {searchQuery ? `No products matching "${searchQuery}"` : "No menu products available in this category"}
                  </p>
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const inOrder = items.find((i) => i.name.toLowerCase() === prod.name.toLowerCase());
                  return (
                    <div key={prod.id} className={`catalog-product-card ${inOrder ? "in-order" : ""}`}>
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="catalog-prod-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/products/chai-chaska.jpg";
                        }}
                      />
                      <div className="catalog-prod-info">
                        <div className="catalog-prod-name">{prod.name}</div>
                        <div className="catalog-prod-cat">{prod.category}</div>
                        <div className="catalog-prod-price">₹{prod.price}</div>
                      </div>
                      <button
                        type="button"
                        className="catalog-add-btn"
                        onClick={() => handleAddItem(prod)}
                      >
                        {inOrder ? `+ Add (${inOrder.quantity})` : "+ Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="edit-modal-footer">
          <button type="button" className="modal-cancel-btn" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className={`modal-save-btn ${isSaving ? "loading" : ""}`}
            onClick={handleSaveChanges}
            disabled={isSaving}
          >
            {isSaving ? "⏳ Saving & Sending WhatsApp..." : `💾 Save Changes (₹${subtotal}) & Notify WhatsApp`}
          </button>
        </div>

        {toastMessage && (
          <div className="edit-modal-toast">
            <span>✅</span> {toastMessage}
          </div>
        )}
      </div>

      <style jsx>{`
        .edit-order-modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(6px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        .edit-order-modal-card {
          background: #ffffff;
          width: 100%;
          max-width: 960px;
          max-height: 90vh;
          border-radius: 20px;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        .edit-modal-header {
          padding: 18px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }

        .edit-modal-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .edit-order-tag {
          background: #2c1b0d;
          color: #ffffff;
          font-weight: 800;
          font-size: 13px;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .edit-modal-customer {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
        }

        .edit-modal-sub {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #64748b;
        }

        .edit-modal-close-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #64748b;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .edit-modal-close-btn:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fca5a5;
        }

        .edit-modal-body {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          overflow-y: auto;
          flex: 1;
        }

        @media (max-width: 768px) {
          .edit-modal-body {
            grid-template-columns: 1fr;
          }
        }

        .edit-modal-left {
          padding: 20px;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #fafafa;
        }

        .edit-modal-right {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #ffffff;
        }

        .edit-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .edit-section-title {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
        }

        .edit-total-preview {
          font-size: 13px;
          font-weight: 800;
          color: #16a34a;
          background: #dcfce7;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .current-items-scroll {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 320px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .order-edit-item-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .order-edit-item-thumb {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid #e2e8f0;
          flex-shrink: 0;
        }

        .order-edit-item-info {
          flex: 1;
          min-width: 0;
        }

        .order-edit-item-name {
          font-size: 13px;
          font-weight: 800;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .order-edit-item-price {
          font-size: 11.5px;
          color: #64748b;
          margin-top: 2px;
        }

        .order-edit-qty-controls {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 8px;
        }

        .qty-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: #ffffff;
          color: #1e293b;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }

        .qty-btn:hover {
          background: #2c1b0d;
          color: #ffffff;
        }

        .qty-val {
          font-size: 12.5px;
          font-weight: 800;
          min-width: 18px;
          text-align: center;
          color: #1e293b;
        }

        .item-delete-btn {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.15s;
          padding: 4px;
        }

        .item-delete-btn:hover {
          opacity: 1;
          transform: scale(1.1);
        }

        .empty-items-notice {
          text-align: center;
          padding: 30px 10px;
          color: #94a3b8;
        }

        .empty-items-notice span {
          font-size: 32px;
          display: block;
          margin-bottom: 6px;
        }

        .empty-items-notice p {
          font-size: 12.5px;
          margin: 0;
        }

        .order-edit-summary-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: auto;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #64748b;
        }

        .summary-divider {
          height: 1px;
          background: #f1f5f9;
          margin: 4px 0;
        }

        .summary-row.total-row {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
        }

        .final-total-val {
          font-size: 16px;
          font-weight: 900;
          color: #16a34a;
        }

        /* CATALOG SEARCH & PILLS */
        .catalog-search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          font-size: 14px;
          color: #94a3b8;
        }

        .catalog-search-input {
          width: 100%;
          padding: 9px 34px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          outline: none;
          background: #f8fafc;
        }

        .catalog-search-input:focus {
          border-color: #2c1b0d;
          background: #ffffff;
        }

        .clear-search-btn {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          font-size: 13px;
          color: #94a3b8;
          cursor: pointer;
        }

        .catalog-category-pills {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .category-filter-pill {
          padding: 5px 10px;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 11.5px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }

        .category-filter-pill:hover,
        .category-filter-pill.active {
          background: #2c1b0d;
          color: #ffffff;
          border-color: #2c1b0d;
        }

        /* PRODUCTS GRID */
        .catalog-products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 10px;
          max-height: 380px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .catalog-product-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: all 0.15s;
        }

        .catalog-product-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .catalog-product-card.in-order {
          border-color: #86efac;
          background: #f0fdf4;
        }

        .catalog-prod-img {
          width: 100%;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
        }

        .catalog-prod-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .catalog-prod-name {
          font-size: 12.5px;
          font-weight: 800;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .catalog-prod-cat {
          font-size: 10.5px;
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: 700;
        }

        .catalog-prod-price {
          font-size: 13px;
          font-weight: 900;
          color: #16a34a;
        }

        .catalog-add-btn {
          width: 100%;
          padding: 6px 0;
          background: #2c1b0d;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.15s;
        }

        .catalog-add-btn:hover {
          background: #16a34a;
        }

        /* FOOTER */
        .edit-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .modal-cancel-btn {
          padding: 10px 18px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-save-btn {
          padding: 10px 22px;
          border-radius: 8px;
          border: none;
          background: #16a34a;
          color: #ffffff;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
          transition: all 0.2s;
        }

        .modal-save-btn:hover {
          background: #15803d;
        }

        .modal-save-btn.loading {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .edit-modal-toast {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 30px;
          font-size: 13px;
          font-weight: 800;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          gap: 8px;
          animation: slideUp 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
