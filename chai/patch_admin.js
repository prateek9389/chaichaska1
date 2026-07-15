const fs = require('fs');
let content = fs.readFileSync('app/admin/page.js', 'utf8');

// Update imports
content = content.replace(
  'getLeaveRequests, getSettings } from "@/lib/firestore";',
  'getLeaveRequests, onLeaveRequestsSnapshot, updateLeaveRequest, getSettings } from "@/lib/firestore";'
);

// Add onLeaveRequestsSnapshot
content = content.replace(
  'getLeaveRequests().then(setLeaveRequests);',
  'const unsubLeave = onLeaveRequestsSnapshot(setLeaveRequests);'
);

// Add unsubLeave to the return statement of useEffect
content = content.replace(
  'return () => unsubOrders();',
  'return () => {\n      unsubOrders();\n      unsubLeave();\n    };'
);

// Replace Leave Request Hub UI with Admin Leave Approval Board
const searchStr = `{/* Left Column: Apply Leave Form */}
                  <div>
                    <h3 className="section-title">Leave Request Hub</h3>`;

const replacementStr = `{/* Left Column: Admin Approval Board */}
                  <div>
                    <h3 className="section-title">Pending Leave Approvals</h3>
                    <p style={{ fontSize: "12px", color: "#666", marginTop: "-12px", marginBottom: "20px" }}>Review and approve/reject leave applications from staff.</p>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {leaveRequests.filter(req => req.status === "Pending Approval" || req.status === "Pending").map((req, idx) => (
                        <div key={req.id || idx} className="queue-card-detailed-item" style={{ background: "#ffffff", padding: "16px", borderLeft: "4px solid #f39c12" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <strong style={{ fontSize: "13px", color: "#2c1b0d" }}>{req.requester || "Staff Member"}</strong>
                            <span style={{ fontSize: "11px", color: "#8a583c", fontWeight: "bold" }}>{req.status}</span>
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
                              style={{ flex: 1, padding: "8px", fontSize: "11.5px" }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                if (req.id) updateLeaveRequest(req.id, { status: "Rejected" });
                              }}
                              className="btn-action-outline reject"
                              style={{ flex: 1, padding: "8px", fontSize: "11.5px" }}
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
                  </div>
                  {/* END OF REPLACEMENT, REMOVING OLD FORM */}
                  <div style={{display:"none"}}>`;

content = content.replace(searchStr, replacementStr);

const endFormStr = `</button>
                    </form>`;
content = content.replace(endFormStr, `</button>
                    </form></div>`);


fs.writeFileSync('app/admin/page.js', content);
console.log('Patched app/admin/page.js successfully');
