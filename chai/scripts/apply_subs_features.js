const fs = require('fs');

// UPDATE ADMIN DASHBOARD
const adminPath = 'app/admin/page.js';
let adminContent = fs.readFileSync(adminPath, 'utf8');

const adminTarget = `<span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#2c1b0d", display: "block" }}>☕ {sub.item || sub.items}</span>
                            </div>`;

const adminReplacement = `<div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#2c1b0d", display: "block" }}>☕ {sub.item || sub.items}</span>
                                <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#27ae60", display: "block" }}>Cost: ₹{sub.price || sub.cost || (sub.total || 850)}</span>
                              </div>
                            </div>`;

if (adminContent.includes(adminTarget)) {
  adminContent = adminContent.replace(adminTarget, adminReplacement);
  fs.writeFileSync(adminPath, adminContent);
  console.log("Updated Admin with Cost.");
} else {
  console.log("Could not find admin target for cost.");
}

// UPDATE CHAIMAKER DASHBOARD
const chaimakerPath = 'app/chaimaker/page.js';
let chaimakerContent = fs.readFileSync(chaimakerPath, 'utf8');

// Replace left pane buttons with isExpired logic
const chaimakerTargetButtons = `<div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setToastMsg(\`Subscription \${sub.id} paused successfully.\`);
                                    setTimeout(() => setToastMsg(""), 3000);
                                  }}
                                  style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                                >
                                  {sub.status === "Active" ? "Pause Plan" : "Resume Plan"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setToastMsg(\`Dispatched early delivery request for \${sub.customer}!\`);
                                    setTimeout(() => setToastMsg(""), 3000);
                                  }}
                                  style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                                >
                                  Force Dispatch
                                </button>
                              </div>`;

const chaimakerReplaceButtons = `<div style={{ display: "flex", gap: "8px" }}>
                                {!isExpired ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setToastMsg(\`Subscription \${sub.id} paused successfully.\`);
                                        setTimeout(() => setToastMsg(""), 3000);
                                      }}
                                      style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.1)", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                                    >
                                      {sub.status === "Active" ? "Pause Plan" : "Resume Plan"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setToastMsg(\`Dispatched early delivery request for \${sub.customer}!\`);
                                        setTimeout(() => setToastMsg(""), 3000);
                                      }}
                                      style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                                    >
                                      Force Dispatch
                                    </button>
                                  </>
                                ) : (
                                  <span style={{ color: "#e74c3c", fontWeight: "bold", fontSize: "11px", display: "flex", alignItems: "center", background: "#fdf0ed", padding: "4px 8px", borderRadius: "6px", border: "1px solid #fadbd8" }}>
                                    ⚠️ DELIVERIES STOPPED
                                  </span>
                                )}
                              </div>`;

if (chaimakerContent.includes(chaimakerTargetButtons)) {
  chaimakerContent = chaimakerContent.replace(chaimakerTargetButtons, chaimakerReplaceButtons);
  console.log("Updated Chaimaker Left Buttons.");
} else {
  console.log("Could not find chaimaker buttons.");
}

const chaimakerTargetFilter = `{activeSubs.filter(sub => sub.status === "Active").map((sub, i) => (`;

const chaimakerReplaceFilter = `{activeSubs.filter(sub => {
                          const today = new Date().setHours(0,0,0,0);
                          const end = sub.endDateIso ? new Date(sub.endDateIso).setHours(0,0,0,0) : 0;
                          const isSubExpired = end > 0 && today > end;
                          return sub.status === "Active" && !isSubExpired;
                        }).map((sub, i) => (`;

if (chaimakerContent.includes(chaimakerTargetFilter)) {
  chaimakerContent = chaimakerContent.replace(chaimakerTargetFilter, chaimakerReplaceFilter);
  console.log("Updated Chaimaker Right Filter.");
} else {
  console.log("Could not find chaimaker filter.");
}

fs.writeFileSync(chaimakerPath, chaimakerContent);
console.log("Saved Chaimaker changes.");
