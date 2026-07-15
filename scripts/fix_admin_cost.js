const fs = require('fs');

const adminPath = 'app/admin/page.js';
let adminContent = fs.readFileSync(adminPath, 'utf8');

const regex = /<div style={{ marginBottom: "12px" }}>[\s\S]*?<span style={{ fontSize: "14\.5px", fontWeight: "bold", display: "block" }}>👤 {sub\.customer}<\/span>[\s\S]*?<span style={{ fontSize: "12px", color: "#555", display: "block", margin: "4px 0" }}>🏢 {sub\.floor \|\| sub\.office \|\| "No Address"}<\/span>[\s\S]*?<span style={{ fontSize: "12\.5px", fontWeight: "bold", color: "#2c1b0d", display: "block" }}>☕ {sub\.item \|\| sub\.items}<\/span>[\s\S]*?<\/div>/;

const adminReplacement = `<div style={{ marginBottom: "12px" }}>
                              <span style={{ fontSize: "14.5px", fontWeight: "bold", display: "block" }}>👤 {sub.customer}</span>
                              <span style={{ fontSize: "12px", color: "#555", display: "block", margin: "4px 0" }}>🏢 {sub.floor || sub.office || "No Address"}</span>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#2c1b0d", display: "block" }}>☕ {sub.item || sub.items}</span>
                                <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#27ae60", display: "block" }}>Cost: ₹{sub.price || sub.cost || sub.total || 850}</span>
                              </div>
                            </div>`;

if (regex.test(adminContent)) {
  adminContent = adminContent.replace(regex, adminReplacement);
  fs.writeFileSync(adminPath, adminContent);
  console.log("Updated Admin with Cost via Regex.");
} else {
  console.log("Could not find admin target for cost.");
}
