const fs = require('fs');
const path = 'app/admin/page.js';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Inject Sidebar Nav Button
const navTarget = `<button onClick={() => setActiveTab("menu")} className={\`menu-icon-btn \${activeTab === "menu" ? "active" : ""}\`}>
                <span className="btn-emoji">🍵</span> Menu & Pricing
              </button>`;
const navReplacement = `<button onClick={() => setActiveTab("menu")} className={\`menu-icon-btn \${activeTab === "menu" ? "active" : ""}\`}>
                <span className="btn-emoji">🍵</span> Menu & Pricing
              </button>
              <button onClick={() => setActiveTab("products")} className={\`menu-icon-btn \${activeTab === "products" ? "active" : ""}\`}>
                <span className="btn-emoji">🛍️</span> Shop Products
              </button>`;

if (content.includes(navTarget) && !content.includes('setActiveTab("products")')) {
  content = content.replace(navTarget, navReplacement);
  console.log("Injected sidebar nav button.");
} else if (content.includes('setActiveTab("products")')) {
  console.log("Sidebar button already exists.");
} else {
  console.log("Could not find nav target. Trying fallback.");
  const fallbackTarget = `Menu & Pricing`;
  if (content.includes(fallbackTarget)) {
    console.log("Found fallback.");
  }
}

// Fix 2: Inject the UI block for activeTab === "products"
// Let's insert it right before: {activeTab === "feedback" && (
const uiTarget = `{activeTab === "feedback" && (`;
const uiReplacement = `{activeTab === "products" && (
              <div className="tab-body-wrapper">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "28px" }}>
                  
                  {/* Left Column: Add Product */}
                  <div>
                    <h3 className="section-title">Add New Shop Product</h3>
                    <p style={{ fontSize: "12px", color: "#666", marginTop: "-12px", marginBottom: "20px" }}>Upload items to the customer-facing Shop page.</p>
                    
                    <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <form onSubmit={handleAddShopProduct}>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Product Name</label>
                          <input type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Category</label>
                            <select value={newProductCategory} onChange={(e) => setNewProductCategory(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }}>
                              <option>Tea</option>
                              <option>Snack</option>
                              <option>Combo</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Price (INR)</label>
                            <input type="number" value={newProductPriceNum} onChange={(e) => setNewProductPriceNum(e.target.value)} required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Product Image (Cloudinary)</label>
                          <input type="file" accept="image/*" onChange={handleProductImageChange} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px dashed rgba(44,27,13,0.3)", fontSize: "11px", background: "#fafafa" }} />
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Description</label>
                          <textarea rows="3" value={newProductDesc} onChange={(e) => setNewProductDesc(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px", resize: "none" }} />
                        </div>
                        
                        <button type="submit" disabled={isUploadingProduct} style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer", opacity: isUploadingProduct ? 0.7 : 1 }}>
                          {isUploadingProduct ? "UPLOADING IMAGE..." : "PUBLISH PRODUCT"}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right Column: List */}
                  <div>
                    <h3 className="section-title">Live Shop Inventory</h3>
                    <p style={{ fontSize: "12px", color: "#666", marginTop: "-12px", marginBottom: "20px" }}>Currently available on the user-facing storefront.</p>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "600px", overflowY: "auto", paddingRight: "8px" }}>
                      {shopProducts.map((p, idx) => (
                        <div key={p.id} style={{ display: "flex", background: "#ffffff", borderRadius: "16px", padding: "12px", border: "1px solid rgba(0,0,0,0.04)", gap: "16px", alignItems: "center" }}>
                          <img src={p.image} alt={p.name} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.05)" }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ display: "block", fontWeight: "bold", fontSize: "14px", color: "#2c1b0d" }}>{p.name}</span>
                            <span style={{ display: "block", fontSize: "11px", color: "#666" }}>{p.category} • ₹{p.priceNum}</span>
                          </div>
                          <button onClick={async () => {
                            if(window.confirm(\`Delete \${p.name}?\`)) {
                              await deleteProduct(p.id);
                              setToastMsg(\`\${p.name} deleted!\`);
                              setTimeout(() => setToastMsg(""), 3000);
                            }
                          }} style={{ background: "#f8ecec", color: "#e74c3c", border: "none", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                            Delete
                          </button>
                        </div>
                      ))}
                      {shopProducts.length === 0 && (
                        <div style={{ padding: "30px", textAlign: "center", color: "#999", fontSize: "13px" }}>No products in shop. Add one!</div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {activeTab === "feedback" && (`;

if (content.includes(uiTarget) && !content.includes('activeTab === "products" && (')) {
  content = content.replace(uiTarget, uiReplacement);
  console.log("Injected main UI tab body.");
} else if (content.includes('activeTab === "products" && (')) {
  console.log("Main UI tab body already exists.");
} else {
  console.log("Could not find UI target.");
}

fs.writeFileSync(path, content);
console.log("Script execution finished.");
