const fs = require('fs');

const fixDummyStats = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to target the whole Stats Info Cards block
  const statsRegex = /\{?\/\*\s*Stats Info Cards\s*\*\/\s*\}?\s*<div style=\{\{\s*display:\s*"grid"[\s\S]*?4\s*Invoices<\/strong>\s*<\/div>\s*<\/div>/g;

  const replacement = `                  {/* Stats Info Cards */}
                  {(() => {
                    const deliveredCount = orders.filter(o => o.status === "Delivered" || o.status === "delivered").length;
                    const cancelledCount = orders.filter(o => o.status === "Cancelled" || o.status === "cancelled").length;
                    const totalProcessed = deliveredCount + cancelledCount;
                    const successRate = totalProcessed === 0 ? "100.0" : ((deliveredCount / totalProcessed) * 100).toFixed(1);

                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                          <span style={{ fontSize: "11px", color: "#666", display: "block" }}>☕ Total Served Brews</span>
                          <strong style={{ fontSize: "20px", color: "#2c1b0d" }}>{deliveredCount} Completed</strong>
                        </div>
                        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                          <span style={{ fontSize: "11px", color: "#666", display: "block" }}>📈 Settlement Success Rate</span>
                          <strong style={{ fontSize: "20px", color: "#27ae60" }}>{successRate}% Successful</strong>
                        </div>
                        <div style={{ background: "#ffffff", padding: "18px", borderRadius: "16px", border: "1px solid rgba(44, 27, 13, 0.04)" }}>
                          <span style={{ fontSize: "11px", color: "#666", display: "block" }}>🛑 Cancelled / Refunded</span>
                          <strong style={{ fontSize: "20px", color: "#e74c3c" }}>{cancelledCount} Invoices</strong>
                        </div>
                      </div>
                    );
                  })()}`;

  if (content.match(statsRegex)) {
    content = content.replace(statsRegex, replacement);
    fs.writeFileSync(filePath, content);
    console.log('Fixed dummy stats in: ' + filePath);
  } else {
    console.log('Dummy stats block not found in: ' + filePath);
  }
};

fixDummyStats('app/admin/page.js');
fixDummyStats('app/chaimaker/page.js');
