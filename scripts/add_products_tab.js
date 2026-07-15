const fs = require('fs');

const adminPath = 'app/admin/page.js';
let adminContent = fs.readFileSync(adminPath, 'utf8');

// 1. Add imports
const importTarget = `import { onOrdersSnapshot,`;
const importReplacement = `import { onOrdersSnapshot, getProducts, onProductsSnapshot, addProduct, updateProduct, deleteProduct,`;
if (adminContent.includes(importTarget) && !adminContent.includes('onProductsSnapshot')) {
  adminContent = adminContent.replace(importTarget, importReplacement);
}

// 2. Add State inside AdminDashboard
const stateTarget = `  const [activeTab, setActiveTab] = useState("dashboard");`;
const stateReplacement = `  const [activeTab, setActiveTab] = useState("dashboard");
  const [shopProducts, setShopProducts] = useState([]);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("Tea");
  const [newProductPriceNum, setNewProductPriceNum] = useState("");
  const [newProductCaffeine, setNewProductCaffeine] = useState("Medium");
  const [newProductSweetness, setNewProductSweetness] = useState("Balanced");
  const [newProductSteepTime, setNewProductSteepTime] = useState("5 mins");
  const [newProductPairing, setNewProductPairing] = useState("");
  const [newProductDesc, setNewProductDesc] = useState("");
  const [newProductImageFile, setNewProductImageFile] = useState(null);
  const [isUploadingProduct, setIsUploadingProduct] = useState(false);

  const handleProductImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewProductImageFile(e.target.files[0]);
    }
  };

  const handleAddShopProduct = async (e) => {
    e.preventDefault();
    if (!newProductName || !newProductPriceNum) return;
    
    let imageUrl = "https://res.cloudinary.com/xkzptzzq/image/upload/v1/default_chai.jpg";
    if (newProductImageFile) {
      setIsUploadingProduct(true);
      const formData = new FormData();
      formData.append("file", newProductImageFile);
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.url) imageUrl = data.url;
      } catch (err) {
        console.error("Upload failed", err);
      }
      setIsUploadingProduct(false);
    }
    
    await addProduct({
      name: newProductName,
      category: newProductCategory,
      priceNum: Number(newProductPriceNum),
      price: \`₹\${newProductPriceNum}\`,
      caffeine: newProductCaffeine,
      sweetness: newProductSweetness,
      steepTime: newProductSteepTime,
      pairing: newProductPairing || "Classic Rusk",
      description: newProductDesc,
      image: imageUrl
    });
    
    setToastMsg(\`\${newProductName} added to shop successfully!\`);
    setTimeout(() => setToastMsg(""), 3000);
    setNewProductName(""); setNewProductPriceNum(""); setNewProductDesc(""); setNewProductImageFile(null);
  };
`;
if (adminContent.includes(stateTarget) && !adminContent.includes('const [shopProducts')) {
  adminContent = adminContent.replace(stateTarget, stateReplacement);
}

// 3. Add to useEffect
const effectTarget = `const unsubSubs = onSubscriptionsSnapshot(setSubscriptions);`;
const effectReplacement = `const unsubSubs = onSubscriptionsSnapshot(setSubscriptions);
      const unsubProducts = onProductsSnapshot(setShopProducts);`;
if (adminContent.includes(effectTarget) && !adminContent.includes('unsubProducts')) {
  adminContent = adminContent.replace(effectTarget, effectReplacement);
}

const effectCleanupTarget = `unsubSubs();
    };`;
const effectCleanupReplacement = `unsubSubs();
      unsubProducts();
    };`;
if (adminContent.includes(effectCleanupTarget) && !adminContent.includes('unsubProducts()')) {
  adminContent = adminContent.replace(effectCleanupTarget, effectCleanupReplacement);
}

// 4. Add Sidebar Nav Button
const navTarget = `<button onClick={() => setActiveTab("menu")} className={\`menu-icon-btn \${activeTab === "menu" ? "active" : ""}\`}>
              <span className="icon">🍵</span>
              <span className="text">Menu</span>
            </button>`;
const navReplacement = `<button onClick={() => setActiveTab("menu")} className={\`menu-icon-btn \${activeTab === "menu" ? "active" : ""}\`}>
              <span className="icon">🍵</span>
              <span className="text">Menu</span>
            </button>
            <button onClick={() => setActiveTab("products")} className={\`menu-icon-btn \${activeTab === "products" ? "active" : ""}\`}>
              <span className="icon">🛍️</span>
              <span className="text">Shop Products</span>
            </button>`;
if (adminContent.includes(navTarget) && !adminContent.includes('setActiveTab("products")')) {
  adminContent = adminContent.replace(navTarget, navReplacement);
}

// 5. Add Main UI Tab Block
const uiTarget = `{activeTab === "finances" && (`;
const uiBlock = `
            {activeTab === "products" && (
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

            {activeTab === "finances" && (`;
if (adminContent.includes(uiTarget) && !adminContent.includes('activeTab === "products"')) {
  adminContent = adminContent.replace(uiTarget, uiBlock);
}

fs.writeFileSync(adminPath, adminContent);
console.log("Injected Shop Products Tab into app/admin/page.js");
