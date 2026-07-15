              return (
                <div className="tab-body-wrapper">
                  {/* Toast Message Overlay */}
                  {toastMsg && (
                    <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                      <span>🚨</span> {toastMsg}
                    </div>
                  )}

                  {/* Summary Bar */}
                  <div style={{ background: "#ffffff", padding: "20px", borderRadius: "24px", border: "1px solid rgba(44, 27, 13, 0.06)", marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "#666", textTransform: "uppercase", display: "block" }}>💰 Total Inventory Valuation</span>
                      
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "12px", color: "#666" }}>Auto-Alert to Admin (Low Stock)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAutoAlertEnabled(!autoAlertEnabled);
                          setToastMsg(autoAlertEnabled ? "Disabled low stock auto-alerts" : "Enabled low stock auto-alerts");
                          setTimeout(() => setToastMsg(""), 3000);
                        }}
                        style={{
                          background: autoAlertEnabled ? "#2c1b0d" : "#e0dcd5",
                          color: autoAlertEnabled ? "#fff" : "#666",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: "20px",
                          fontSize: "11.5px",
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        {autoAlertEnabled ? "🟢 ENABLED" : "🔴 DISABLED"}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "28px" }}>
                    
                    {/* Left Column: Cards List */}
                    <div>
                      <h3 className="section-title">Current Kitchen Ingredients Stock</h3>
                      <div className="stocks-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                        {stocks.map((s, idx) => {
                          const isEditing = editingStockIdx === idx;
                          const numericQty = parseFloat(s.qty.split(" ")[0]) || 0;
                          const itemValue = numericQty * (s.unitPrice || 0);

                          return (
                            <div key={idx} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "20px" }}>
                              
                              {isEditing ? (
                                /* EDITING MODE FORM */
                                <div>
                                  <h4 style={{ fontSize: "14px", margin: "0 0 12px", color: "#8a583c" }}>Edit: {s.name}</h4>
                                  
                                  <div className="form-group" style={{ marginBottom: "10px" }}>
                                    <label style={{ fontSize: "10px", color: "#666", fontWeight: "bold" }}>Remaining Quantity</label>
                                    <input
                                      type="text"
                                      value={editStockQty}
                                      onChange={(e) => setEditStockQty(e.target.value)}
                                      style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }}
                                    />
                                  </div>

                                  <div className="form-group" style={{ marginBottom: "12px" }}>
                                    <label style={{ fontSize: "10px", color: "#666", fontWeight: "bold" }}>Status Indicator</label>
                                    <select
                                      value={editStockLevel}
                                      onChange={(e) => setEditStockLevel(e.target.value)}
                                      style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}
                                    >
                                      <option value="In Stock">In Stock</option>
                                      <option value="Low Stock">Low Stock</option>
                                      <option value="Out of Stock">Out of Stock</option>
                                    </select>
                                  </div>

                                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                                    <button
                                      type="button"
                                      onClick={() => setEditingStockIdx(null)}
                                      style={{ flex: 1, padding: "6px", background: "#fbf9f6", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveStockEdit(idx)}
                                      style={{ flex: 1, padding: "6px", background: "#2c1b0d", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* NORMAL VIEW MODE */
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                    <h4 style={{ fontSize: "14px", margin: 0, fontWeight: "bold" }}>{s.name}</h4>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStockIdx(idx);
                                        setEditStockQty(s.qty);
                                        setEditStockLevel(s.level);
                                      }}
                                      style={{ background: "transparent", border: "none", color: "#8a583c", fontSize: "11.5px", fontWeight: "bold", cursor: "pointer", padding: 0 }}
                                    >
                                      ✏️ Edit
                                    </button>
                                  </div>
                                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 6px" }}>Status Qty: <strong>{s.qty}</strong></p>
                                  
                                  {/* Pricing details */}
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888", marginBottom: "12px", padding: "6px 0", borderTop: "1px solid rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                                    
                                    
                                  </div>

                                  {/* Supplier Detail */}
                                  <p style={{ fontSize: "10.5px", color: "#666", margin: "0 0 14px", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span>🏭 Vendor: {s.supplier || "Market Vendor"}</span>
                                  </p>
                                  
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span
                                      className={`stock-indicator-pill ${s.level.toLowerCase().replace(/ /g, "-")}`}
                                      style={{
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        fontWeight: "800",
                                        background: s.level === "In Stock" ? "rgba(39, 174, 96, 0.15)" : s.level === "Low Stock" ? "rgba(241, 196, 15, 0.15)" : "rgba(231, 76, 60, 0.15)",
                                        color: s.level === "In Stock" ? "#27ae60" : s.level === "Low Stock" ? "#d35400" : "#e74c3c"
                                      }}
                                    >
                                      ● {s.level}
                                    </span>
                                    
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedItem(s.name);
                                        setRequestQty(s.qty.split(" ")[0] !== "0" ? s.qty.split(" ")[0] + " " + (s.qty.split(" ")[1] || "Units") : "20 Kg");
                                      }}
                                      className="btn-raise-restock"
                                      style={{
                                        background: "transparent",
                                        border: "1px dashed rgba(44, 27, 13, 0.3)",
                                        color: "#2c1b0d",
                                        padding: "6px 12px",
                                        fontSize: "11px",
                                        fontWeight: "750",
                                        borderRadius: "6px",
                                        cursor: "pointer"
                                      }}
                                    >
                                      ⚡ Request Restock
                                    </button>
                                  </div>
                                </div>
                              )}

                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: Add New Stock, Alert Form & History Logs */}
                    <div>
                      
                      {/* Add Stock Item Form */}
                      <h3 className="section-title">Add Ingredient Item</h3>
                      <form onSubmit={handleAddNewStock} style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}>
                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10.5px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Item Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Cinnamon Sticks, Tea Cups"
                            value={newStockName}
                            onChange={(e) => setNewStockName(e.target.value)}
                            required
                            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ fontSize: "10.5px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Initial Quantity</label>
                          <input
                            type="text"
                            placeholder="e.g. 5 Kg, 1000 Units"
                            value={newStockQty}
                            onChange={(e) => setNewStockQty(e.target.value)}
                            required
                            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "10.5px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Status</label>
                          <select
                            value={newStockLevel}
                            onChange={(e) => setNewStockLevel(e.target.value)}
                            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "12.5px" }}
                          >
                            <option value="In Stock">In Stock</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                          </select>
                        </div>

                        <button type="submit" style={{ width: "100%", background: "#8a583c", color: "#ffffff", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}>
                          + ADD NEW INGREDIENT
                        </button>
                      </form>

                      {/* Restock History Log */}
                      <h3 className="section-title">⏱️ Recent Incoming Shipments</h3>
                      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {restockHistory.map((hist, i) => (
                            <div key={i} style={{ fontSize: "12px", borderBottom: "1px solid #f2eee9", paddingBottom: "8px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                                <strong>{hist.item} ({hist.qty})</strong>
                                <span style={{ color: "#888" }}>{hist.date}</span>
                              </div>
                              <span style={{ color: "#666", fontSize: "11px" }}>Source: {hist.source}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Raise Restock Alert Form */}
                      <h3 className="section-title">Raise Restock Request</h3>
                      <form onSubmit={handleRaiseAlert} style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}>
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Item / Ingredient Name</label>
                          <input
                            type="text"
                            placeholder="Type item name (e.g. Assam Tea Leaves, Fresh Ginger, Saffron…)"
                            value={selectedItem}
                            onChange={(e) => setSelectedItem(e.target.value)}
                            required
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", background: "#fff", fontSize: "13px" }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Requested Quantity</label>
                          <input
                            type="text"
                            placeholder="e.g. 20 Kg, 50 Litres"
                            value={requestQty}
                            onChange={(e) => setRequestQty(e.target.value)}
                            required
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px" }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Urgency Level</label>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {["Low", "Medium", "High"].map((level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setUrgency(level)}
                                style={{
                                  flex: 1,
                                  padding: "8px",
                                  border: "1.5px solid",
                                  borderColor: urgency === level ? "#2c1b0d" : "rgba(44,27,13,0.1)",
                                  background: urgency === level ? "#2c1b0d" : "transparent",
                                  color: urgency === level ? "#ffffff" : "#2c1b0d",
                                  borderRadius: "6px",
                                  fontSize: "11.5px",
                                  fontWeight: "bold",
                                  cursor: "pointer"
                                }}
                              >
                                {level === "High" ? "🚨 High" : level}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: "20px" }}>
                          <label style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Urgent Notes (optional)</label>
                          <textarea
                            placeholder="Why is this restock urgent?"
                            value={requestNotes}
                            onChange={(e) => setRequestNotes(e.target.value)}
                            rows="2"
                            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "13px", resize: "none" }}
                          />
                        </div>

                        <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer", letterSpacing: "0.5px" }}>
                          SEND ALERT TO ADMIN
                        </button>
                      </form>

                      {/* Logs of Raised Requests */}
                      <h4 style={{ fontSize: "13px", color: "#2c1b0d", marginBottom: "12px", fontWeight: "800" }}>📋 Restock Requests Log</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {restockRequests.map((r, i) => (
                          <div key={i} style={{ background: "#ffffff", padding: "12px 16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.03)", fontSize: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <strong>{r.item}</strong>
                              <span style={{ fontSize: "10px", background: r.urgency === "High" ? "rgba(231,76,60,0.1)" : "rgba(0,0,0,0.05)", color: r.urgency === "High" ? "#e74c3c" : "#555", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>
                                {r.urgency} Urgency
                              </span>
                      {/* Logs of Raised Requests */}
                      <h4 style={{ fontSize: "13px", color: "#2c1b0d", marginBottom: "12px", fontWeight: "800" }}>📋 Restock Requests Log</h4>
                      {restockRequests.length === 0 && (
                        <p style={{ color: "#aaa", fontSize: "12px", textAlign: "center", padding: "20px" }}>No requests sent yet.</p>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {restockRequests.map((r, i) => {
                          const isRead = r.status === "Read";
                          const urgencyColor = r.urgency === "High" ? "#e74c3c" : r.urgency === "Medium" ? "#e67e22" : "#27ae60";
                          const formattedTime = r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : (r.date || "–");
                          return (
                            <div key={r.id || i} style={{ background: isRead ? "rgba(39,174,96,0.04)" : "#ffffff", padding: "14px 16px", borderRadius: "14px", border: `1.5px solid ${isRead ? "rgba(39,174,96,0.2)" : urgencyColor + "30"}`, fontSize: "12px", opacity: isRead ? 0.8 : 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                <div>
                                  <strong style={{ fontSize: "13px", color: "#2c1b0d" }}>{r.item}</strong>
                                  {isRead
                                    ? <span style={{ marginLeft: "8px", fontSize: "10px", color: "#27ae60", fontWeight: "bold" }}>✓ Read by Admin</span>
                                    : <span style={{ marginLeft: "8px", fontSize: "10px", color: "#e67e22", fontWeight: "bold" }}>⏳ Pending</span>
                                  }
                                </div>
                                <span style={{ fontSize: "10px", background: `${urgencyColor}18`, color: urgencyColor, padding: "2px 8px", borderRadius: "20px", fontWeight: "800" }}>
                                  {r.urgency === "High" ? "🚨" : r.urgency === "Medium" ? "⚠️" : "✅"} {r.urgency}
                                </span>
                              </div>
                              <span style={{ display: "block", color: "#555", marginBottom: "3px" }}>📦 Qty Needed: <strong>{r.qty}</strong></span>
                              {r.notes && r.notes !== "No notes" && (
                                <span style={{ display: "block", color: "#888", fontStyle: "italic", fontSize: "11px", marginBottom: "3px" }}>💬 {r.notes}</span>
                              )}
                              {r.adminReply && (
                                <div style={{ marginTop: "6px", background: "rgba(212,168,83,0.1)", borderRadius: "8px", padding: "7px 10px", borderLeft: "3px solid #d4a853" }}>
                                  <span style={{ fontSize: "10px", fontWeight: "800", color: "#d4a853" }}>ADMIN REPLY</span>
                                  <p style={{ margin: "2px 0 0", color: "#2c1b0d", fontSize: "12px" }}>{r.adminReply}</p>
                                </div>
                              )}
                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", borderTop: "1px solid rgba(0,0,0,0.04)", paddingTop: "6px", fontSize: "10px" }}>
                                <span style={{ color: isRead ? "#27ae60" : "#e67e22", fontWeight: "bold" }}>● {r.status}</span>
                                <span style={{ color: "#bbb" }}>🕒 {formattedTime}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              )