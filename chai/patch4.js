const fs = require('fs');
let lines = fs.readFileSync('app/admin/page.js', 'utf8').split('\n');

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* Left Column: Apply Leave Form */}')) {
    startIndex = i;
  }
  if (startIndex !== -1 && lines[i].includes('</form>')) {
    endIndex = i + 1; // include the </form> line and the next </div>
    break;
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  const replacementLines = `{/* Left Column: Admin Approval Board */}
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
                  </div>`.split('\n');
                  
  lines.splice(startIndex, endIndex - startIndex + 1, ...replacementLines);
  fs.writeFileSync('app/admin/page.js', lines.join('\n'));
  console.log("Array splice replacement successful.");
} else {
  console.log("Indices not found.", startIndex, endIndex);
}
