import re

# BREWMASTER
with open('app/brewmaster-chaichaska-login/page.js', 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(r'(\{\s*tf\.label\s*\}\s*</button>\s*\)\)\})\s*</div>\s*</div>', r'''\1
                      <div style={{ width: "1px", height: "20px", background: "#ddd", margin: "0 4px" }}></div>
                      <input 
                        type="date"
                        value={(typeof timeFilter === 'string' && timeFilter.match(/^\\d{4}-\\d{2}-\\d{2}$/)) ? timeFilter : ""}
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
                      />
                    </div>
                  </div>''', c)

c = re.sub(r'(\{\s*/\*\s*BOTTOM ROW: WIDGETS\s*\*/\s*\})', r'''                  {/* DAILY SALES REPORT TABLE (VISIBLE WHEN DATE OR DAILY FILTER IS SELECTED) */}
                  {(timeFilter === "Daily" || (typeof timeFilter === 'string' && timeFilter.match(/^\\d{4}-\\d{2}-\\d{2}$/))) && (
                    <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #eaeaea", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", marginBottom: "24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#2c1b0d" }}>
                          Sales Report: {timeFilter === "Daily" ? "Today" : new Date(timeFilter).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>
                        <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px" }}>
                          Total: ₹{(typeof selectedDateTotalSales !== 'undefined' ? selectedDateTotalSales : 0).toFixed(2)}
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
                              const idStr = o.orderId || (o.id && o.id.startsWith("#") ? o.id : `#${o.id ? o.id.slice(-6).toUpperCase() : "LIVE"}`);
                              const itemName = o.item || (Array.isArray(o.items) ? o.items.map(it => `${it.name || it.item} x${it.quantity || 1}`).join(", ") : "Chai Selection");
                              
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

\1''', c)

with open('app/brewmaster-chaichaska-login/page.js', 'w', encoding='utf-8') as f:
    f.write(c)


# ADMIN
with open('app/admin-chaichaska-login/page.js', 'r', encoding='utf-8') as f:
    c2 = f.read()

c2 = re.sub(r'(\{\s*tf\.label\s*\}\s*</button>\s*\)\)\})\s*</div>\s*</div>', r'''\1
                      <div style={{ width: "1px", height: "20px", background: "#ddd", margin: "0 4px" }}></div>
                      <input 
                        type="date"
                        value={(typeof timeFilter === 'string' && timeFilter.match(/^\\d{4}-\\d{2}-\\d{2}$/)) ? timeFilter : ""}
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
                      />
                    </div>
                  </div>''', c2)

c2 = re.sub(r'(\{\s*/\*\s*BOTTOM ROW: WIDGETS\s*\*/\s*\})', r'''                  {/* DAILY SALES REPORT TABLE (VISIBLE WHEN DATE OR DAILY FILTER IS SELECTED) */}
                  {(timeFilter === "Daily" || (typeof timeFilter === 'string' && timeFilter.match(/^\\d{4}-\\d{2}-\\d{2}$/))) && (
                    <div style={{ background: "#ffffff", padding: "24px", borderRadius: "16px", border: "1px solid #eaeaea", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", marginBottom: "24px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#2c1b0d" }}>
                          Sales Report: {timeFilter === "Daily" ? "Today" : new Date(timeFilter).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>
                        <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px" }}>
                          Total: ₹{(typeof selectedDateTotalSales !== 'undefined' ? selectedDateTotalSales : 0).toFixed(2)}
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
                              const idStr = o.orderId || (o.id && o.id.startsWith("#") ? o.id : `#${o.id ? o.id.slice(-6).toUpperCase() : "LIVE"}`);
                              const itemName = o.item || (Array.isArray(o.items) ? o.items.map(it => `${it.name || it.item} x${it.quantity || 1}`).join(", ") : "Chai Selection");
                              
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

\1''', c2)

with open('app/admin-chaichaska-login/page.js', 'w', encoding='utf-8') as f:
    f.write(c2)

print("done regex")
