const fs = require('fs');
const file = 'app/brewmaster-chaichaska-login/page.js';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/const filteredOrders = orders\.filter\(o => \{[\s\S]*?return true;\s*\}\);/, `const filteredOrders = orders.filter(o => {
    if (timeFilter === "All" || !timeFilter) return true;
    if (!o.createdAt) return true;
    
    // Handle specific date string (YYYY-MM-DD) from the calendar
    if (timeFilter.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
      const orderDate = new Date(o.createdAt);
      const orderDateString = orderDate.toLocaleDateString('en-CA'); 
      return orderDateString === timeFilter;
    }
    
    const now = Date.now();
    const diff = now - o.createdAt;
    if (timeFilter === "Daily") return diff <= 24 * 60 * 60 * 1000;
    if (timeFilter === "Weekly") return diff <= 7 * 24 * 60 * 60 * 1000;
    if (timeFilter === "Monthly") return diff <= 30 * 24 * 60 * 60 * 1000;
    return true;
  });

  const selectedDateTotalSales = filteredOrders.reduce((acc, o) => {
    const val = typeof o.total === "string" ? parseFloat(o.total.replace(/[^\\d\\.]/g, "")) : parseFloat(o.total);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);`);

const uiBlockToReplace = `                      {[
                        { id: "All", label: "All Time" },
                        { id: "Daily", label: "Today" },
                        { id: "Weekly", label: "This Week" },
                        { id: "Monthly", label: "This Month" }
                      ].map(tf => (
                        <button
                          key={tf.id}
                          type="button"
                          onClick={() => setTimeFilter(tf.id)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: timeFilter === tf.id ? "#2c1b0d" : "transparent",
                            color: timeFilter === tf.id ? "#ffffff" : "#666",
                            fontWeight: timeFilter === tf.id ? "bold" : "normal",
                            fontSize: "12px",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {tf.label}
                        </button>
                      ))}`;

const uiBlockReplacement = `                      {[
                        { id: "All", label: "All Time" },
                        { id: "Daily", label: "Today" },
                        { id: "Weekly", label: "This Week" },
                        { id: "Monthly", label: "This Month" }
                      ].map(tf => (
                        <button
                          key={tf.id}
                          type="button"
                          onClick={() => setTimeFilter(tf.id)}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: timeFilter === tf.id ? "#2c1b0d" : "transparent",
                            color: timeFilter === tf.id ? "#ffffff" : "#666",
                            fontWeight: timeFilter === tf.id ? "bold" : "normal",
                            fontSize: "12px",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {tf.label}
                        </button>
                      ))}
                      <div style={{ width: "1px", height: "20px", background: "#ddd", margin: "0 4px" }}></div>
                      <input 
                        type="date"
                        value={timeFilter.match(/^\\d{4}-\\d{2}-\\d{2}$/) ? timeFilter : ""}
                        onChange={(e) => setTimeFilter(e.target.value || "All")}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #ddd",
                          fontSize: "12px",
                          color: "#333",
                          cursor: "pointer",
                          outline: "none"
                        }}
                      />`;

c = c.replace(uiBlockToReplace, uiBlockReplacement);

const tableBlockToReplace = `                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>`;

const tableBlockReplacement = `                  {/* DAILY SALES REPORT TABLE (VISIBLE WHEN DATE OR DAILY FILTER IS SELECTED) */}
                  {(timeFilter === "Daily" || timeFilter.match(/^\\d{4}-\\d{2}-\\d{2}$/)) && (
                    <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #eaeaea", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", marginBottom: "24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#2c1b0d" }}>
                          Sales Report: {timeFilter === "Daily" ? "Today" : new Date(timeFilter).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>
                        <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px" }}>
                          Total: ₹{selectedDateTotalSales.toFixed(2)}
                        </div>
                      </div>
                      
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "500px" }}>
                          <thead>
                            <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #eee", textAlign: "left" }}>
                              <th style={{ padding: "12px", fontSize: "13px", color: "#666", fontWeight: "700" }}>Order ID</th>
                              <th style={{ padding: "12px", fontSize: "13px", color: "#666", fontWeight: "700" }}>Items</th>
                              <th style={{ padding: "12px", fontSize: "13px", color: "#666", fontWeight: "700" }}>Type</th>
                              <th style={{ padding: "12px", fontSize: "13px", color: "#666", fontWeight: "700", textAlign: "right" }}>Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrders.length > 0 ? filteredOrders.map((o) => {
                              const amt = typeof o.total === "string" ? parseFloat(o.total.replace(/[^\\d\\.]/g, "")) : parseFloat(o.total);
                              const amtStr = isNaN(amt) ? "0.00" : amt.toFixed(2);
                              const idStr = o.orderId || (o.id && o.id.startsWith("#") ? o.id : \`#\${o.id ? o.id.slice(-6).toUpperCase() : "LIVE"}\`);
                              const itemName = o.item || (Array.isArray(o.items) ? o.items.map(it => \`\${it.name || it.item} x\${it.quantity || 1}\`).join(", ") : "Chai Selection");
                              
                              return (
                                <tr key={o.id} style={{ borderBottom: "1px solid #eee" }}>
                                  <td style={{ padding: "12px", fontSize: "14px", fontWeight: "600", color: "#2c1b0d" }}>{idStr}</td>
                                  <td style={{ padding: "12px", fontSize: "14px", color: "#444" }}>{itemName}</td>
                                  <td style={{ padding: "12px", fontSize: "14px", color: "#666" }}>{o.isOffline || o.walkIn ? "Offline / Counter" : "Online"}</td>
                                  <td style={{ padding: "12px", fontSize: "14px", fontWeight: "700", color: "#2e7d32", textAlign: "right" }}>₹{amtStr}</td>
                                </tr>
                              );
                            }) : (
                              <tr>
                                <td colSpan="4" style={{ padding: "24px", textAlign: "center", color: "#888", fontSize: "14px" }}>
                                  No sales found for this date.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>`;

c = c.replace(tableBlockToReplace, tableBlockReplacement);
fs.writeFileSync(file, c);
console.log('done');
