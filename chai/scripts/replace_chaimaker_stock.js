const fs = require('fs');

const path = 'C:/Users/prate/Desktop/Chai chuska (3)/Chai chuska/chai/app/chaimaker/page.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const startLineIndex = lines.findIndex(l => l.includes('{activeTab === "stock" && (() => {'));
const endLineIndex = lines.findIndex((l, i) => i > startLineIndex && l.includes('{activeTab === "earnings" && (() => {')) - 1;

if (startLineIndex === -1 || endLineIndex === -1) {
    console.error('Could not find start or end index');
    process.exit(1);
}

const newContent = `            {activeTab === "stock" && (
              <div className="tab-body-wrapper">
                {toastMsg && (
                  <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span>🚨</span> {toastMsg}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "28px" }}>
                  {/* Left Column: Form */}
                  <div>
                    <h3 className="section-title">Raise Restock Request</h3>
                    <div style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                      <form onSubmit={handleAddRestockRequest} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div className="form-group">
                          <label style={{ fontSize: "11px", color: "#666", fontWeight: "bold", textTransform: "uppercase" }}>Ingredient Item Name</label>
                          <input type="text" value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)} required placeholder="e.g. Saffron Box" className="checkout-text-input" style={{ width: "100%" }} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: "11px", color: "#666", fontWeight: "bold", textTransform: "uppercase" }}>Required Quantity</label>
                          <input type="text" value={requestQty} onChange={(e) => setRequestQty(e.target.value)} required placeholder="e.g. 5 Kgs" className="checkout-text-input" style={{ width: "100%" }} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: "11px", color: "#666", fontWeight: "bold", textTransform: "uppercase" }}>Urgency Level</label>
                          <select value={urgency} onChange={(e) => setUrgency(e.target.value)} className="checkout-text-input" style={{ width: "100%" }}>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High (Urgent)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: "11px", color: "#666", fontWeight: "bold", textTransform: "uppercase" }}>Additional Notes</label>
                          <textarea value={requestNotes} onChange={(e) => setRequestNotes(e.target.value)} placeholder="Any brand preference?" className="checkout-text-input area" rows="3" style={{ width: "100%" }} />
                        </div>
                        <button type="submit" className="btn-continue-checkout" style={{ width: "100%", marginTop: "8px" }}>Submit Requirement to Admin</button>
                      </form>
                    </div>
                  </div>

                  {/* Right Column: List of Requests */}
                  <div>
                    <h3 className="section-title">Recent Requirements & Responses</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {restockRequests.length === 0 && (
                        <p style={{ color: "#777", fontSize: "13px" }}>No requirements submitted yet.</p>
                      )}
                      {restockRequests.map((req, idx) => (
                        <div key={idx} style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.04)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                            <div>
                              <strong style={{ fontSize: "15px", color: "#2c1b0d" }}>{req.item}</strong>
                              <span style={{ fontSize: "12px", color: "#666", display: "block", marginTop: "2px" }}>Qty: {req.qty} • Urgency: {req.urgency}</span>
                            </div>
                            <span style={{
                              fontSize: "11px", fontWeight: "bold", padding: "4px 10px", borderRadius: "12px",
                              background: req.status === "Approved" || req.status === "Shipped" ? "#e8f5e9" : req.status === "Rejected" ? "#ffebee" : "#fff3e0",
                              color: req.status === "Approved" || req.status === "Shipped" ? "#2e7d32" : req.status === "Rejected" ? "#c62828" : "#e65100"
                            }}>
                              {req.status}
                            </span>
                          </div>
                          {req.notes && <p style={{ fontSize: "12px", color: "#555", marginBottom: "8px" }}><em>Note: "{req.notes}"</em></p>}
                          {req.adminNote && (
                            <div style={{ background: "#fdf5e9", padding: "10px", borderRadius: "8px", borderLeft: "3px solid #8a583c", marginTop: "12px" }}>
                              <strong style={{ fontSize: "11px", color: "#8a583c", display: "block" }}>ADMIN RESPONSE:</strong>
                              <span style={{ fontSize: "12px", color: "#444" }}>{req.adminNote}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}`;

const finalLines = [
    ...lines.slice(0, startLineIndex),
    newContent,
    ...lines.slice(endLineIndex) // wait endLineIndex is the blank line before earnings
];

fs.writeFileSync(path, finalLines.join('\\n'));
console.log('Successfully updated chaimaker page');
