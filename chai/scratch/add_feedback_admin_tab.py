import sys

with open('app/admin/page.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
if 'getPendingFeedback' not in code:
    code = code.replace(
        'import { onOrdersSnapshot, getMenuItems, getCombos, getAddons, addAddon, deleteAddon, updateAddon, getStock, getFeedback, updateOrder, addMenuItem, addStockItem, updateStockItem, getSubscriptions, onProductsSnapshot, addProduct, deleteProduct, updateProduct, updateSubscription, onRestockRequestsSnapshot, updateRestockRequest, onLeaveRequestsSnapshot, updateLeaveRequest, getProfileSettings, updateProfileSettings, getContactInfo, updateContactInfo } from "@/lib/firestore";',
        'import { onOrdersSnapshot, getMenuItems, getCombos, getAddons, addAddon, deleteAddon, updateAddon, getStock, updateOrder, addMenuItem, addStockItem, updateStockItem, getSubscriptions, onProductsSnapshot, addProduct, deleteProduct, updateProduct, updateSubscription, onRestockRequestsSnapshot, updateRestockRequest, onLeaveRequestsSnapshot, updateLeaveRequest, getProfileSettings, updateProfileSettings, getContactInfo, updateContactInfo, getPendingFeedback, approveFeedback, deleteFeedback } from "@/lib/firestore";'
    )
    # in case `getFeedback` wasn't exactly there, try appending
    if 'getPendingFeedback' not in code:
        code = code.replace(
            'from "@/lib/firestore";',
            ', getPendingFeedback, approveFeedback, deleteFeedback } from "@/lib/firestore";'
        )

# 2. State and Hooks
hooks_code = """
  // Feedback System State
  const [pendingFeedback, setPendingFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  useEffect(() => {
    if (activeTab === "feedback") {
      setLoadingFeedback(true);
      getPendingFeedback().then(data => {
        setPendingFeedback(data);
        setLoadingFeedback(false);
      }).catch(console.error);
    }
  }, [activeTab]);

  const handleApproveFeedback = async (id) => {
    if (confirm("Approve this review and make it public?")) {
      await approveFeedback(id);
      setPendingFeedback(prev => prev.filter(f => f.id !== id));
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (confirm("Delete this review permanently?")) {
      await deleteFeedback(id);
      setPendingFeedback(prev => prev.filter(f => f.id !== id));
    }
  };
"""
if 'const [pendingFeedback, setPendingFeedback]' not in code:
    code = code.replace(
        '// Inline stock edit state',
        hooks_code.strip() + '\n\n  // Inline stock edit state'
    )

# 3. Sidebar Button
sidebar_button = """
              <button onClick={() => setActiveTab("feedback")} className={`menu-icon-btn ${activeTab === "feedback" ? "active" : ""}`}>
                <span className="btn-emoji">⭐</span> Feedback
              </button>
"""
if 'setActiveTab("feedback")' not in code:
    code = code.replace(
        '<button onClick={() => setActiveTab("contact")}',
        sidebar_button.strip() + '\n              <button onClick={() => setActiveTab("contact")}'
    )

# 4. Tab Body
tab_body = """
            {/* Feedback Tab */}
            {activeTab === "feedback" && (
              <div className="tab-fade-in" style={{ padding: "30px", maxWidth: "1000px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                  <div>
                    <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#2c1b0d", margin: "0 0 8px" }}>Pending Feedback</h1>
                    <p style={{ color: "#777", margin: 0 }}>Review user ratings and feedback before making them public on the product pages.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setLoadingFeedback(true);
                      getPendingFeedback().then(data => { setPendingFeedback(data); setLoadingFeedback(false); });
                    }}
                    className="btn-primary" 
                    style={{ padding: "8px 16px", background: "#f5f5f7", color: "#2c1b0d", border: "1px solid #ddd" }}
                  >
                    Refresh
                  </button>
                </div>

                {loadingFeedback ? (
                  <p>Loading pending feedback...</p>
                ) : pendingFeedback.length === 0 ? (
                  <div className="dashboard-card" style={{ padding: "40px", textAlign: "center" }}>
                    <p style={{ fontSize: "16px", color: "#666" }}>You're all caught up! No pending feedback.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {pendingFeedback.map(fb => (
                      <div key={fb.id} className="dashboard-card" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                            <strong style={{ fontSize: "16px", color: "#2c1b0d" }}>{fb.userName}</strong>
                            <span style={{ fontSize: "13px", background: "#f5f5f7", padding: "4px 8px", borderRadius: "999px" }}>
                              Product: <strong>{fb.productName}</strong>
                            </span>
                          </div>
                          <div style={{ color: "#f1c40f", fontSize: "16px", marginBottom: "12px" }}>
                            {"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}
                          </div>
                          {fb.comment && <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.6, margin: 0 }}>"{fb.comment}"</p>}
                          <div style={{ fontSize: "12px", color: "#999", marginTop: "12px" }}>
                            Submitted on: {new Date(fb.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button 
                            onClick={() => handleApproveFeedback(fb.id)}
                            style={{ background: "#5c7a4d", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleDeleteFeedback(fb.id)}
                            style={{ background: "#e74c3c", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
"""

if '{/* Feedback Tab */}' not in code:
    code = code.replace(
        '{activeTab === "contact" && (() => {',
        tab_body.strip() + '\n\n            {activeTab === "contact" && (() => {'
    )

with open('app/admin/page.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Feedback tab added to Admin Page.")
