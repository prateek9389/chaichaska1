const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../app/admin/page.js");
let code = fs.readFileSync(filePath, "utf-8");

// 1. Add imports
code = code.replace(
  "import { onOrdersSnapshot, getMenuItems, getCombos, getAddons, getStock",
  "import { onOrdersSnapshot, getMenuItems, getCombos, getAddons, addAddon, deleteAddon, updateAddon, getStock"
);

// 2. Add Addons Tab Button
const tabButtonCode = `
              <button onClick={() => setActiveTab("addons")} className={\`menu-icon-btn \${activeTab === "addons" ? "active" : ""}\`}>
                <span style={{ fontSize: "18px" }}>🍪</span>
                <span className="menu-text">Addons</span>
              </button>
`;
code = code.replace(
  /<button onClick=\{\(\) => setActiveTab\("create_product"\)\}.*?<\/button>/s,
  (match) => match + "\n" + tabButtonCode
);

// 3. Add state for new addon
const stateCode = `
  // Addons State
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [newAddonImg, setNewAddonImg] = useState("");
`;
code = code.replace("// Add new stock item form state", stateCode + "\n  // Add new stock item form state");

// 4. Add the Addons Tab Content
const addonsTabUI = `
          {activeTab === "addons" && (
            <div className="tab-fade-in" style={{ padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <div>
                  <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#2c1b0d", margin: "0 0 8px" }}>Add-on Products</h1>
                  <p style={{ color: "#777", margin: 0, fontSize: "15px" }}>Manage cookies, toasts, and extra products to be shown at checkout.</p>
                </div>
              </div>

              {/* Add New Addon */}
              <div className="dashboard-card" style={{ padding: "30px", marginBottom: "40px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#2c1b0d", marginBottom: "20px" }}>Add New Add-on</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                  <div className="form-group">
                    <label>Add-on Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Almond Cookies" 
                      value={newAddonName}
                      onChange={(e) => setNewAddonName(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Price (e.g. ₹89)</label>
                    <input 
                      type="text" 
                      placeholder="₹89" 
                      value={newAddonPrice}
                      onChange={(e) => setNewAddonPrice(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Image URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..." 
                      value={newAddonImg}
                      onChange={(e) => setNewAddonImg(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                </div>
                <button 
                  className="btn-primary" 
                  style={{ marginTop: "20px", width: "100%", padding: "12px" }}
                  onClick={async () => {
                    if (!newAddonName || !newAddonPrice) return alert("Fill required fields");
                    try {
                      await addAddon({ name: newAddonName, price: newAddonPrice, image: newAddonImg || "/chai-ingredients.png" });
                      alert("Add-on created successfully!");
                      setNewAddonName(""); setNewAddonPrice(""); setNewAddonImg("");
                      // Refresh
                      getAddons().then(setAddonsList);
                    } catch(e) {
                      console.error(e);
                      alert("Error adding addon");
                    }
                  }}
                >
                  + Create Add-on
                </button>
              </div>

              {/* Existing Addons Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
                {addonsList && addonsList.length > 0 ? addonsList.map((addon) => (
                  <div key={addon.id} className="dashboard-card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ height: "140px", background: "#f5f5f7" }}>
                      <img src={addon.image} alt={addon.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ padding: "20px", display: "flex", flexDirection: "column", flexGrow: 1 }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 8px" }}>{addon.name}</h3>
                      <p style={{ color: "#8a583c", fontWeight: 700, margin: "0 0 16px" }}>{addon.price}</p>
                      
                      <button 
                        style={{ marginTop: "auto", background: "#fcfaf7", border: "1px solid #e74c3c", color: "#e74c3c", padding: "8px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
                        onClick={async () => {
                          if(confirm("Are you sure you want to delete this addon?")) {
                            await deleteAddon(addon.id);
                            getAddons().then(setAddonsList);
                          }
                        }}
                      >
                        Delete Add-on
                      </button>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: "40px", textAlign: "center", color: "#777", background: "#fff", borderRadius: "16px" }}>
                    No add-on products found.
                  </div>
                )}
              </div>
            </div>
          )}
`;

code = code.replace(
  /\{activeTab === "create_product" && \(.*?\)\}/s,
  (match) => match + "\n\n" + addonsTabUI
);

fs.writeFileSync(filePath, code);
console.log("Updated admin/page.js successfully");
