const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/admin/page.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Sidebar Button
content = content.replace(
  '<button onClick={() => setActiveTab("menu")} className={`menu-icon-btn ${activeTab === "menu" ? "active" : ""}`}>\n                <span className="btn-emoji">🍽️</span> Products & Menu\n              </button>',
  '<button onClick={() => setActiveTab("menu")} className={`menu-icon-btn ${activeTab === "menu" ? "active" : ""}`}>\n                <span className="btn-emoji">🍽️</span> Products & Menu\n              </button>\n              <button onClick={() => setActiveTab("shop")} className={`menu-icon-btn ${activeTab === "shop" ? "active" : ""}`}>\n                <span className="btn-emoji">🛍️</span> Shop Page View\n              </button>'
);

// 2. Add Content Tab
content = content.replace(
  `            {activeTab === "subs" && (() => {`,
  `            {activeTab === "shop" && (
              <div className="tab-body-wrapper" style={{ height: "calc(100vh - 120px)", padding: 0, overflow: "hidden" }}>
                <iframe src="/shop" style={{ width: "100%", height: "100%", border: "none", borderRadius: "20px" }} />
              </div>
            )}

            {activeTab === "subs" && (() => {`
);

fs.writeFileSync(filePath, content);
console.log('Shop tab added successfully!');
