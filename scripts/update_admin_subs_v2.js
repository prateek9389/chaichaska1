const fs = require('fs');
const path = 'app/admin/page.js';
let content = fs.readFileSync(path, 'utf8');

const badBlock = `              // Mock active subscriptions with details
              const activeSubs = [];

              return (
                <div className="tab-body-wrapper">
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    
                    {/* Left Panel: Active Subscriptions */}
                    <div>
                      <h3 className="section-title">Corporate Subscriptions Ledger</h3>
                      <p style={{ fontSize: "12px", color: "#666", marginTop: "-12px", marginBottom: "20px" }}>Active recurring beverage plans mapped to office locations.</p>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {activeSubs.map((sub, i) => (`;

const goodBlock = `              return (
                <div className="tab-body-wrapper">
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    
                    {/* Left Panel: Active Subscriptions */}
                    <div>
                      <h3 className="section-title">Corporate Subscriptions Ledger</h3>
                      <p style={{ fontSize: "12px", color: "#666", marginTop: "-12px", marginBottom: "20px" }}>Active recurring beverage plans mapped to office locations.</p>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {subscriptions.map((sub, i) => {
                          const today = new Date().setHours(0,0,0,0);
                          const end = sub.endDateIso ? new Date(sub.endDateIso).setHours(0,0,0,0) : 0;
                          const isExpired = end > 0 && today > end;
                          
                          return (
`;

const badBlock2 = `                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px", borderLeft: sub.status === "Active" ? "4px solid #27ae60" : "4px solid #777" }}>
                            
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid rgba(0,0,0,0.03)", paddingBottom: "6px" }}>
                              <span style={{ fontSize: "11px", fontWeight: "bold", color: "#8a583c" }}>{sub.id}</span>
                              <span style={{ fontSize: "11px", color: "#666" }}>Started: {sub.startDate}</span>
                            </div>

                            <div style={{ marginBottom: "12px" }}>
                              <span style={{ fontSize: "14.5px", fontWeight: "bold", display: "block" }}>👤 {sub.customer}</span>
                              <span style={{ fontSize: "12px", color: "#555", display: "block", margin: "4px 0" }}>🏢 {sub.office}</span>
                              <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#2c1b0d", display: "block" }}>☕ {sub.items}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "11.5px", color: "#666" }}>
                                ⏰ {sub.timeSlot} ({sub.schedule})
                              </span>`;

const goodBlock2 = `                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px", borderLeft: isExpired ? "4px solid #e74c3c" : sub.status === "Active" ? "4px solid #27ae60" : "4px solid #777" }}>
                            
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid rgba(0,0,0,0.03)", paddingBottom: "6px" }}>
                              <span style={{ fontSize: "11px", fontWeight: "bold", color: "#8a583c" }}>{sub.id} {isExpired && <span style={{color: "white", background: "#e74c3c", padding: "2px 4px", borderRadius: "4px", fontSize: "10px", marginLeft: "4px"}}>EXPIRED - STOP DELIVERY</span>}</span>
                              <span style={{ fontSize: "11px", color: "#666" }}>Cost: {sub.total}</span>
                            </div>

                            <div style={{ marginBottom: "12px" }}>
                              <span style={{ fontSize: "14.5px", fontWeight: "bold", display: "block" }}>👤 {sub.customer}</span>
                              <span style={{ fontSize: "12px", color: "#555", display: "block", margin: "4px 0" }}>🏢 {sub.floor || sub.office || "No Address"}</span>
                              <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#2c1b0d", display: "block" }}>☕ {sub.item || sub.items}</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "11.5px", color: "#666" }}>
                                ⏰ {sub.time || sub.timeSlot} ({sub.frequency || sub.schedule}) | <strong style={{color: "#2c1b0d"}}>{sub.startDate} - {sub.endDate || "N/A"}</strong>
                              </span>`;

const origCloseMap = `                          </div>
                        ))}
                      </div>`;
const newCloseMap = `                          </div>
                        )})}
                      </div>`;

if (content.includes(badBlock) && content.includes(badBlock2)) {
  content = content.replace(badBlock, goodBlock);
  content = content.replace(badBlock2, goodBlock2);
  content = content.replace(origCloseMap, newCloseMap);
  fs.writeFileSync(path, content);
  console.log("Fixed app/admin/page.js");
} else {
  console.log("Could not find the blocks in app/admin/page.js");
  if (!content.includes(badBlock)) console.log("Missing badBlock 1");
  if (!content.includes(badBlock2)) console.log("Missing badBlock 2");
}
