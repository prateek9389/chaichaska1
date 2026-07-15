const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/admin/page.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace Sidebar Buttons (Remove Products & Menu, and Shop Page View, then insert Shop and Create Product)
// We will replace the entire sidebar block around those buttons to avoid regex mismatches
const sidebarStart = '<button onClick={() => setActiveTab("history")} className={`menu-icon-btn ${activeTab === "history" ? "active" : ""}`}>\n                <span className="btn-emoji">📜</span> Order History\n              </button>';
const sidebarEnd = '<button onClick={() => setActiveTab("subs")} className={`menu-icon-btn ${activeTab === "subs" ? "active" : ""}`}>\n                <span className="btn-emoji">📅</span> Subscriptions Due\n              </button>';

const replacementButtons = `${sidebarStart}
              <button onClick={() => setActiveTab("shop")} className={\`menu-icon-btn \${activeTab === "shop" ? "active" : ""}\`}>
                <span className="btn-emoji">🛍️</span> Shop
              </button>
              <button onClick={() => setActiveTab("create_product")} className={\`menu-icon-btn \${activeTab === "create_product" ? "active" : ""}\`}>
                <span className="btn-emoji">➕</span> Create Product
              </button>
              ${sidebarEnd}`;

// Locate the block in content
const startIdx = content.indexOf(sidebarStart);
const endIdx = content.indexOf(sidebarEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const oldBlock = content.substring(startIdx, endIdx + sidebarEnd.length);
  content = content.replace(oldBlock, replacementButtons);
}

// 2. Add the activeTab === "create_product" rendering block
// We will extract the catalog setup block dynamically from the file to avoid hardcoding 300 lines of JSX
const catalogStartStr = '{menuSubTab === "catalog" && (';
const catalogEndStr = '                    {/* Add Item form */}';
// Let's find the catalog block
const catStart = content.indexOf(catalogStartStr);
// We will find the end of this block by matching curly braces, or we can just copy the code directly via a simpler replacement.
// Actually, let's write a robust parser to grab the block between {menuSubTab === "catalog" && ( and the closing tag.
// To make it simple and bulletproof, we will look for:
// {menuSubTab === "catalog" && ( ... ) } which ends before {menuSubTab === "schedule" && (
const scheduleStartStr = '{menuSubTab === "schedule" && (';
const catEnd = content.indexOf(scheduleStartStr);

if (catStart !== -1 && catEnd !== -1) {
  // Extract catalog block content
  let catalogHTML = content.substring(catStart + catalogStartStr.length, catEnd);
  // Strip trailing bracket/parenthesis to match JSX
  catalogHTML = catalogHTML.trim();
  if (catalogHTML.endsWith(')')) catalogHTML = catalogHTML.slice(0, -1);
  if (catalogHTML.endsWith('}')) catalogHTML = catalogHTML.slice(0, -1);
  if (catalogHTML.endsWith(')')) catalogHTML = catalogHTML.slice(0, -1);
  
  // Now add the activeTab === "create_product" handler
  const createProductTabCode = `
            {activeTab === "create_product" && (
              <div className="tab-body-wrapper">
                {toastMsg && (
                  <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span>🚨</span> {toastMsg}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                  ${catalogHTML}
                </div>
              </div>
            )}
  `;

  // Insert before activeTab === "shop"
  content = content.replace(
    '{activeTab === "shop" && (',
    `${createProductTabCode}\n\n            {activeTab === "shop" && (`
  );
}

fs.writeFileSync(filePath, content);
console.log('Sidebar and Create Product tab updated successfully!');
