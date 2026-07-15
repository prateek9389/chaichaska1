const fs = require('fs');

const path = 'C:/Users/prate/Desktop/Chai chuska (3)/Chai chuska/chai/app/admin/page.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add updateRestockRequest to imports if not there
if (!content.includes('updateRestockRequest')) {
    content = content.replace('getRestockRequests, getRestockHistory', 'updateRestockRequest, getRestockRequests, getRestockHistory');
}

const lines = content.split('\n');

const startLineIndex = lines.findIndex(l => l.includes('{activeTab === "stock" && (() => {'));
const endLineIndex = lines.findIndex((l, i) => i > startLineIndex && l.includes('{activeTab === "earnings" && (() => {')) - 1;

if (startLineIndex === -1 || endLineIndex === -1) {
    console.error('Could not find start or end index in admin page');
    process.exit(1);
}

const newContent = `            {activeTab === "stock" && (
              <div className="tab-body-wrapper">
                {toastMsg && (
                  <div style={{ position: "fixed", top: "24px", right: "24px", background: "#2c1b0d", color: "#fdf5e9", padding: "16px 24px", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", zIndex: 9999, fontWeight: "bold", borderLeft: "4px solid #e74c3c", display: "flex", gap: "10px", alignItems: "center" }}>
                    <span>🚨</span> {toastMsg}
                  </div>
                )}
                
                <h3 className="section-title">Chaimaker Requirements</h3>
                <p style={{ color: "#666", fontSize: "14px", marginBottom: "24px" }}>Review and process ingredient requirements submitted by the Chaimaker.</p>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
                  {restockRequests.length === 0 && (
                    <div style={{ background: "#ffffff", padding: "40px", borderRadius: "20px", textAlign: "center", border: "1px solid rgba(0,0,0,0.04)" }}>
                      <p style={{ color: "#777", fontSize: "14px" }}>No requirements pending.</p>
                    </div>
                  )}
                  {restockRequests.map((req, idx) => {
                    const isProcessing = editingStockIdx === idx; // Reuse this state variable just for UI toggle
                    return (
                      <div key={idx} style={{ background: "#ffffff", padding: "20px 24px", borderRadius: "16px", border: "1px solid rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <strong style={{ fontSize: "16px", color: "#2c1b0d" }}>{req.item}</strong>
                            <div style={{ fontSize: "13px", color: "#666", display: "flex", gap: "16px", marginTop: "4px" }}>
                              <span><strong>Qty:</strong> {req.qty}</span>
                              <span><strong>Urgency:</strong> {req.urgency}</span>
                              <span><strong>Date:</strong> {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Just now'}</span>
                            </div>
                          </div>
                          <span style={{
                            fontSize: "12px", fontWeight: "bold", padding: "6px 12px", borderRadius: "12px",
                            background: req.status === "Approved" || req.status === "Shipped" ? "#e8f5e9" : req.status === "Rejected" ? "#ffebee" : "#fff3e0",
                            color: req.status === "Approved" || req.status === "Shipped" ? "#2e7d32" : req.status === "Rejected" ? "#c62828" : "#e65100"
                          }}>
                            {req.status}
                          </span>
                        </div>
                        
                        {req.notes && (
                          <div style={{ background: "#fbf9f6", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", color: "#555" }}>
                            <strong>Chaimaker Notes:</strong> {req.notes}
                          </div>
                        )}

                        {isProcessing ? (
                          <div style={{ background: "#fcfaf7", padding: "16px", borderRadius: "12px", border: "1px dashed rgba(0,0,0,0.1)", marginTop: "8px" }}>
                            <h4 style={{ fontSize: "13px", marginBottom: "12px", color: "#2c1b0d" }}>Update Status</h4>
                            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                              {['Pending', 'Approved', 'Shipped', 'Rejected'].map(statusOption => (
                                <button
                                  key={statusOption}
                                  onClick={() => setEditStockLevel(statusOption)}
                                  style={{
                                    padding: "6px 12px", borderRadius: "8px", fontSize: "12px", border: "1px solid", cursor: "pointer",
                                    background: editStockLevel === statusOption ? "#2c1b0d" : "#fff",
                                    color: editStockLevel === statusOption ? "#fff" : "#2c1b0d",
                                    borderColor: editStockLevel === statusOption ? "#2c1b0d" : "rgba(0,0,0,0.1)"
                                  }}
                                >
                                  {statusOption}
                                </button>
                              ))}
                            </div>
                            <div className="form-group" style={{ marginBottom: "12px" }}>
                              <label style={{ fontSize: "11px", color: "#666", fontWeight: "bold" }}>Admin Response Note</label>
                              <input 
                                type="text" 
                                value={editStockQty} 
                                onChange={(e) => setEditStockQty(e.target.value)} 
                                placeholder="e.g., Arriving tomorrow..."
                                className="checkout-text-input" 
                                style={{ width: "100%", background: "#fff" }} 
                              />
                            </div>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={async () => {
                                  try {
                                    await updateRestockRequest(req.id, { status: editStockLevel, adminNote: editStockQty });
                                    setRestockRequests(prev => prev.map(p => p.id === req.id ? { ...p, status: editStockLevel, adminNote: editStockQty } : p));
                                    setEditingStockIdx(null);
                                    setToastMsg("Request updated successfully");
                                    setTimeout(() => setToastMsg(""), 3000);
                                  } catch(e) {
                                    setToastMsg("Failed to update request");
                                    setTimeout(() => setToastMsg(""), 3000);
                                  }
                                }}
                                className="btn-continue-checkout" style={{ padding: "8px 16px", fontSize: "12px" }}
                              >
                                Save Changes
                              </button>
                              <button onClick={() => setEditingStockIdx(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.1)", background: "transparent", cursor: "pointer", fontSize: "12px" }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                            {req.adminNote ? (
                              <p style={{ fontSize: "13px", color: "#8a583c", margin: 0 }}><strong>Your Note:</strong> {req.adminNote}</p>
                            ) : <div />}
                            <button
                              onClick={() => {
                                setEditingStockIdx(idx);
                                setEditStockLevel(req.status);
                                setEditStockQty(req.adminNote || '');
                              }}
                              style={{ background: "#2c1b0d", color: "#fff", border: "none", padding: "6px 16px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
                            >
                              Process Request
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}`;

const finalLines = [
    ...lines.slice(0, startLineIndex),
    newContent,
    ...lines.slice(endLineIndex)
];

fs.writeFileSync(path, finalLines.join('\\n'));
console.log('Successfully updated admin page');
