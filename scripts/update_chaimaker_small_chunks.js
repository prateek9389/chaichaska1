const fs = require('fs');
const path = 'app/chaimaker/page.js';
let content = fs.readFileSync(path, 'utf8');

// Replace {activeSubs.map((sub, i) => (
const bad1 = `{activeSubs.map((sub, i) => (`;
const good1 = `{subscriptions.map((sub, i) => {
                          const today = new Date().setHours(0,0,0,0);
                          const end = sub.endDateIso ? new Date(sub.endDateIso).setHours(0,0,0,0) : 0;
                          const isExpired = end > 0 && today > end;
                          return (`
content = content.replace(bad1, good1);

// Replace the div class mapping
const bad2 = `                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px", borderLeft: sub.status === "Active" ? "4px solid #27ae60" : "4px solid #777" }}>`;
const good2 = `                          <div key={i} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px", borderLeft: isExpired ? "4px solid #e74c3c" : sub.status === "Active" ? "4px solid #27ae60" : "4px solid #777" }}>`;
content = content.replace(bad2, good2);

// Replace sub.id and sub.startDate row
const bad3 = `                              <span style={{ fontSize: "11px", fontWeight: "bold", color: "#8a583c" }}>{sub.id}</span>
                              <span style={{ fontSize: "11px", color: "#666" }}>Started: {sub.startDate}</span>`;
const good3 = `                              <span style={{ fontSize: "11px", fontWeight: "bold", color: "#8a583c" }}>{sub.id} {isExpired && <span style={{color: "white", background: "#e74c3c", padding: "2px 4px", borderRadius: "4px", fontSize: "10px", marginLeft: "4px"}}>EXPIRED - STOP DELIVERY</span>}</span>
                              <span style={{ fontSize: "11px", color: "#666" }}>Cost: {sub.total || "N/A"}</span>`;
content = content.replace(bad3, good3);

// Replace sub.office
const bad4 = `                              <span style={{ fontSize: "12px", color: "#555", display: "block", margin: "4px 0" }}>🏢 {sub.office}</span>`;
const good4 = `                              <span style={{ fontSize: "12px", color: "#555", display: "block", margin: "4px 0" }}>🏢 {sub.floor || sub.office || "No Address"}</span>`;
content = content.replace(bad4, good4);

// Replace sub.items
const bad5 = `                              <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#2c1b0d", display: "block" }}>☕ {sub.items}</span>`;
const good5 = `                              <span style={{ fontSize: "12.5px", fontWeight: "bold", color: "#2c1b0d", display: "block" }}>☕ {sub.item || sub.items}</span>`;
content = content.replace(bad5, good5);

// Replace sub.timeSlot
const bad6 = `                                ⏰ {sub.timeSlot} ({sub.schedule})`;
const good6 = `                                ⏰ {sub.time || sub.timeSlot} ({sub.frequency || sub.schedule}) | <strong style={{color: "#2c1b0d"}}>{sub.startDate} - {sub.endDate || "N/A"}</strong>`;
content = content.replace(bad6, good6);

// Fix closing parenthesis
const bad7 = `                          </div>
                        ))}
                      </div>`;
const good7 = `                          </div>
                        )})}
                      </div>`;
content = content.replace(bad7, good7);

fs.writeFileSync(path, content);
console.log("Successfully replaced smaller chunks.");
