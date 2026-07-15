const fs = require('fs');
const path = 'app/subscribe/page.js';
let content = fs.readFileSync(path, 'utf8');

const badStart = `                <div
                  className={\`plan-card \${frequency === "custom" ? "selected" : ""}\`}
                  onClick={() => setFrequency("custom")}
              </div>`;

const goodContent = `                <div
                  className={\`plan-card \${frequency === "custom" ? "selected" : ""}\`}
                  onClick={() => setFrequency("custom")}
                >
                  <span className="save-badge">SAVE 10%</span>
                  <div className="plan-card-icon">⏰</div>
                  <h4>Custom Slot</h4>
                  <p>Pick your own preferred delivery window anytime.</p>
                  {frequency === "custom" ? (
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
                  <span>Plan Unit Cost:</span>
                  <strong>₹{unitPrice} per cup</strong>
                </div>
                <div className="summary-item">
                  <span>Frequency Tier:</span>
                  <span style={{ textTransform: "capitalize", fontWeight: "bold" }}>{frequency}</span>
                </div>
                <div className="summary-item">
                  <span>Active Delivery Slot:</span>
                  <span style={{ textTransform: "capitalize", fontWeight: "bold" }}>{frequency === "custom" ? customTime : frequency}</span>
                </div>
                <div className="summary-item" style={{ borderTop: "1px dashed rgba(0,0,0,0.08)", paddingTop: "12px", marginTop: "12px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "bold" }}>Estimated Monthly Total:</span>
                  <strong style={{ fontSize: "18px", color: "#8a583c" }}>₹{(unitPrice * (frequency === "morning" ? 30 : frequency === "morning_evening" ? 60 : 30)) + addonsTotal}</strong>
                </div>
              </div>`;

if (content.indexOf(badStart) !== -1) {
  content = content.replace(badStart, goodContent);
  fs.writeFileSync(path, content);
  console.log("Fixed!");
} else {
  console.log("Did not find badStart. Looking manually");
}
