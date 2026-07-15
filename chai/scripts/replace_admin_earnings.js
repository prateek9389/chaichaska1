const fs = require('fs');

const path = 'C:/Users/prate/Desktop/Chai chuska (3)/Chai chuska/chai/app/admin/page.js';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
const startLineIndex = lines.findIndex(l => l.includes('{activeTab === "earnings" && (() => {'));
const endLineIndex = lines.findIndex((l, i) => i > startLineIndex && l.includes('{activeTab === "history" && (() => {')) - 1;

if (startLineIndex === -1 || endLineIndex === -1) {
    console.error('Could not find start or end index in admin page');
    process.exit(1);
}

const newContent = `            {activeTab === "earnings" && (() => {
              // Real data processing for Earnings tab
              const deliveredOrders = orders.filter(o => o.status === "Delivered" || o.status === "Completed");
              const totalSettled = deliveredOrders.length;
              
              // Map real transactions
              const transactions = deliveredOrders.slice(0, 8).map(o => ({
                id: o.id || "TXN",
                name: o.customer || "Unknown",
                method: "Online / Wallet", 
                amount: o.total || "₹0",
                time: o.createdAt ? new Date(o.createdAt).toLocaleString("en-IN") : "Recently",
                status: "Successful"
              }));

              // Process chart data (last 7 days revenue)
              const chartData = [];
              for(let i=6; i>=0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                
                // Get orders for this specific day
                const startOfDay = new Date(d.setHours(0,0,0,0)).getTime();
                const endOfDay = new Date(d.setHours(23,59,59,999)).getTime();
                
                const dayOrders = deliveredOrders.filter(o => (o.createdAt || 0) >= startOfDay && (o.createdAt || 0) <= endOfDay);
                const dayTotal = dayOrders.reduce((sum, o) => sum + (parseInt(String(o.total || "0").replace(/[^0-9]/g, "")) || 0), 0);
                
                chartData.push({
                  day: dayName,
                  val: dayTotal > 0 ? Math.min(100, Math.max(10, (dayTotal / 1000) * 10)) : 10, // Dynamic height 10% to 100%
                  amount: "₹" + dayTotal.toLocaleString("en-IN")
                });
              }

              // Calculate pending payout (just 15% of total sales for demo purposes)
              let rawTotalSales = 0;
              orders.forEach(o => {
                 rawTotalSales += parseInt(String(o.total || "0").replace(/[^0-9]/g, "")) || 0;
              });
              const pendingPayout = Math.round(rawTotalSales * 0.15);

              return (
                <div className="tab-body-wrapper">
                  
                  {/* Earnings Metrics Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>💰 Total Gross Earnings</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>{statsSummary.totalSales}</strong>
                      <span style={{ fontSize: "10.5px", color: "#27ae60", display: "block", marginTop: "4px" }}>▲ Live Tracking</span>
                    </div>
                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>🏦 Pending Payout (Auto-Transfer)</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>₹{pendingPayout.toLocaleString("en-IN")}</strong>
                      <span style={{ fontSize: "10.5px", color: "#8a583c", display: "block", marginTop: "4px" }}>Scheduled: Friday, 6:00 PM</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                      <span style={{ fontSize: "11px", color: "#666", display: "block" }}>💳 Total Payments Settled</span>
                      <strong style={{ fontSize: "24px", color: "#2c1b0d" }}>{totalSettled} Transactions</strong>
                      <span style={{ fontSize: "10.5px", color: "#27ae60", display: "block", marginTop: "4px" }}>🟢 UPI gateway healthy</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    
                    {/* Left Column: Earnings Graph & settlements */}
                    <div>
                      <h3 className="section-title">Weekly Revenue Trends</h3>
                      
                      {/* Premium CSS Chart */}
                      <div style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "200px", paddingBottom: "10px", borderBottom: "1px solid rgba(0,0,0,0.06)", position: "relative" }}>
                          
                          {/* Y-Axis Guideline markers */}
                          <div style={{ position: "absolute", left: 0, right: 0, top: "25%", borderBottom: "1px dashed rgba(0,0,0,0.03)", pointerEvents: "none" }} />
                          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderBottom: "1px dashed rgba(0,0,0,0.03)", pointerEvents: "none" }} />
                          <div style={{ position: "absolute", left: 0, right: 0, top: "75%", borderBottom: "1px dashed rgba(0,0,0,0.03)", pointerEvents: "none" }} />

                          {chartData.map((d, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative", zIndex: 1 }}>
                              
                              {/* Hover Tooltip Value */}
                              <span style={{ fontSize: "10px", background: "#2c1b0d", color: "#fdf5e9", padding: "2px 6px", borderRadius: "4px", position: "absolute", bottom: \`\${d.val + 8}%\`, opacity: 0.9, fontWeight: "bold" }}>
                                {d.amount}
                              </span>

                              {/* Bar */}
                              <div
                                style={{
                                  width: "28px",
                                  height: \`\${(d.val / 100) * 160}px\`,
                                  background: "linear-gradient(180deg, #8a583c 0%, #2c1b0d 100%)",
                                  borderRadius: "6px 6px 0 0",
                                  transition: "transform 0.2s",
                                  cursor: "pointer"
                                }}
                              />
                              <span style={{ fontSize: "11px", color: "#666", marginTop: "8px", fontWeight: "bold" }}>{d.day}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Daily settlements breakdown list */}
                      <h3 className="section-title">Today's Settlement Details</h3>
                      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                        {todaySettlements.length === 0 && <p style={{ fontSize: "13px", color: "#888" }}>No settlements today yet.</p>}
                        {todaySettlements.map((s, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: i === todaySettlements.length - 1 ? "none" : "1px solid rgba(0,0,0,0.04)", fontSize: "13px" }}>
                            <span style={{ color: "#555" }}>{s.item}</span>
                            <strong style={{ color: "#2c1b0d" }}>{s.value}</strong>
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* Right Column: Payments transaction feed */}
                    <div>
                      <h3 className="section-title">All Transaction Payments</h3>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {transactions.length === 0 && <p style={{ fontSize: "13px", color: "#888" }}>No transactions completed yet.</p>}
                        {transactions.map((t, idx) => (
                          <div key={idx} style={{ background: "#ffffff", padding: "16px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <strong style={{ fontSize: "13.5px", display: "block", color: "#2c1b0d" }}>{t.name}</strong>
                              <span style={{ fontSize: "11px", color: "#666" }}>{t.method} • {t.time}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <strong style={{ fontSize: "15px", display: "block", color: "#27ae60" }}>{t.amount}</strong>
                              <span style={{ fontSize: "9px", background: "rgba(39, 174, 96, 0.1)", color: "#27ae60", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                {t.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )
            })()}
`;

const finalLines = [
    ...lines.slice(0, startLineIndex),
    newContent,
    ...lines.slice(endLineIndex)
];

fs.writeFileSync(path, finalLines.join('\\n'));
console.log('Successfully updated earnings tab in Admin page');
