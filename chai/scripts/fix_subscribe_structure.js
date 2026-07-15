const fs = require('fs');
const path = 'app/subscribe/page.js';
let content = fs.readFileSync(path, 'utf8');

const badSection = `                  {frequency === "custom" ? (
                    <div className="custom-time-picker" onClick={(e) => e.stopPropagation()}>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: "#555", display: "block", marginBottom: "4px" }}>Select Time</label>
                      <input 
                        type="time" 
                        value={customTime} 
                        onChange={(e) => setCustomTime(e.target.value)}
                        style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", width: "100%", fontSize: "13px" }}
                      />
                    </div>
                  ) : (
                    <div className="slot-tag">
                      🕐 Your chosen time
                  <span>Plan Unit Cost:</span>`;

const goodSection = `                  {frequency === "custom" ? (
                    <div className="custom-time-picker" onClick={(e) => e.stopPropagation()}>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: "#555", display: "block", marginBottom: "4px" }}>Select Time</label>
                      <input 
                        type="time" 
                        value={customTime} 
                        onChange={(e) => setCustomTime(e.target.value)}
                        style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #ddd", width: "100%", fontSize: "13px" }}
                      />
                    </div>
                  ) : (
                    <div className="slot-tag">
                      🕐 Your chosen time
                    </div>
                  )}
                  <span className="plan-pricing" style={{ marginTop: "12px" }}>₹{Math.round(product.priceNum * 0.9)}/cup</span>
                </div>
              </div>
            </div>

            {/* STEP 2: ENTER ADDRESS */}
            <div className="form-card" style={{ marginTop: "20px" }}>
              <span className="step-label">Step 2</span>
              <h3 className="form-section-title">Delivery Address</h3>
              <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>Please provide your exact building floor and desk/room number.</p>
              
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Tower B, Floor 4, Desk 42"
                style={{ 
                  width: "100%", padding: "12px 16px", borderRadius: "8px", 
                  border: "1px solid #ddd", fontSize: "14px", fontFamily: "var(--font-body)" 
                }}
              />
            </div>

            {/* ORDER SUMMARY */}
            <div className="sub-summary-card">
              <h3>Pricing Summary</h3>
              <div className="summary-list">
                <div className="summary-item">
                  <span>Plan Unit Cost:</span>`;

if (content.includes(badSection)) {
  content = content.replace(badSection, goodSection);
  fs.writeFileSync(path, content);
  console.log("Fixed subscribe page structure successfully");
} else {
  console.log("Could not find the bad section in page.js");
}
