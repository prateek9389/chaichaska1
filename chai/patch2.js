const fs = require('fs');

let content = fs.readFileSync('app/admin/page.js', 'utf8');
const searchStr = `                  {/* Left Column: Apply Leave Form */}
                  <div>
                    <h3 className="section-title">Leave Request Hub</h3>
                    
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newLeaveReason || !leaveStart || !leaveEnd) return;
                        setLeaveRequests(prev => [
                          ...prev,
                          { start: leaveStart, end: leaveEnd, reason: newLeaveReason, status: "Pending Approval" }
                        ]);
                        setNewLeaveReason("");
                        setToastMsg("🌱 Applied for leave! Request submitted to building administrator.");
                        setTimeout(() => setToastMsg(""), 3500);
                      }}
                      style={{ background: "#ffffff", padding: "24px", borderRadius: "20px", border: "1px solid rgba(44, 27, 13, 0.04)", marginBottom: "28px" }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                        <div className="form-group">
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Start Date</label>
                          <input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>End Date</label>
                          <input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label style={{ fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", color: "#555" }}>Reason for Leave</label>
                        <input type="text" placeholder="e.g. Personal emergency, Kitchen maintenance" value={newLeaveReason} onChange={(e) => setNewLeaveReason(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(44,27,13,0.15)", fontSize: "12.5px" }} />
                      </div>

                      <button type="submit" style={{ width: "100%", background: "#2c1b0d", color: "#ffffff", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>
                        SUBMIT LEAVE REQUEST
                      </button>
                    </form>
                  </div>`;

const searchStrFixed = searchStr.replace(/\n/g, '\r\n');

const replacementStr = `                  {/* Left Column: Admin Approval Board */}
                  <div>
                    <h3 className="section-title">Pending Leave Approvals</h3>
                    <p style={{ fontSize: "12px", color: "#666", marginTop: "-12px", marginBottom: "20px" }}>Review and approve/reject leave applications from staff.</p>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
                      {leaveRequests.filter(req => req.status === "Pending Approval" || req.status === "Pending").map((req, idx) => (
                        <div key={req.id || idx} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "16px", borderLeft: "4px solid #f39c12", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <strong style={{ fontSize: "13px", color: "#2c1b0d" }}>{req.requester || "Staff Member"}</strong>
                            <span style={{ fontSize: "11px", color: "#8a583c", fontWeight: "bold", background: "rgba(243,156,18,0.1)", padding: "2px 6px", borderRadius: "4px" }}>{req.status}</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#555", marginBottom: "4px" }}>
                            <strong>Dates:</strong> {req.start} to {req.end}
                          </div>
                          <div style={{ fontSize: "12px", color: "#555", marginBottom: "12px" }}>
                            <strong>Reason:</strong> {req.reason}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => {
                                if (req.id) updateLeaveRequest(req.id, { status: "Approved" });
                              }}
                              className="btn-action-outline accept"
                              style={{ flex: 1, padding: "8px", fontSize: "11.5px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                if (req.id) updateLeaveRequest(req.id, { status: "Rejected" });
                              }}
                              className="btn-action-outline reject"
                              style={{ flex: 1, padding: "8px", fontSize: "11.5px", background: "#e74c3c", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                      {leaveRequests.filter(req => req.status === "Pending Approval" || req.status === "Pending").length === 0 && (
                        <div style={{ textAlign: "center", padding: "24px", color: "#888", fontSize: "12px", background: "#fbf9f6", borderRadius: "12px" }}>
                          No pending leave requests.
                        </div>
                      )}
                    </div>
                  </div>`;

if (content.includes(searchStrFixed)) {
  content = content.replace(searchStrFixed, replacementStr.replace(/\n/g, '\r\n'));
  fs.writeFileSync('app/admin/page.js', content);
  console.log("Successfully replaced the UI block");
} else if (content.includes(searchStr)) {
  content = content.replace(searchStr, replacementStr);
  fs.writeFileSync('app/admin/page.js', content);
  console.log("Successfully replaced the UI block with \\n");
} else {
  console.log("Could not find the target string!");
}
