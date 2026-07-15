const fs = require('fs');
let content = fs.readFileSync('app/admin/page.js', 'utf8');

// Replace the tally pills
const oldPills = `                    <div className="performance-tally-pills">
                      <span className="tally-pill red">Cranksets <strong style={{ marginLeft: "6px" }}>1,200 units</strong></span>
                      <span className="tally-pill yellow">Pedals <strong style={{ marginLeft: "6px" }}>1,000 units</strong></span>
                      <span className="tally-pill green">Brakes <strong style={{ marginLeft: "6px" }}>800 units</strong></span>
                    </div>`;

const newPills = `                    <div className="performance-tally-pills">
                      {Object.entries(
                        orders.reduce((acc, o) => {
                          const item = o.item || o.product || o.name || "Tea";
                          acc[item] = (acc[item] || 0) + (o.quantity || 1);
                          return acc;
                        }, {})
                      ).slice(0, 3).map(([item, qty], i) => (
                        <span key={i} className={\`tally-pill \${i === 0 ? "red" : i === 1 ? "yellow" : "green"}\`}>
                          {item} <strong style={{ marginLeft: "6px" }}>{qty} units</strong>
                        </span>
                      ))}
                      {orders.length === 0 && (
                        <span style={{ fontSize: "12px", color: "#aaa" }}>No order data yet</span>
                      )}
                    </div>`;

if (content.includes('Cranksets')) {
  content = content.replace(oldPills, newPills);
  fs.writeFileSync('app/admin/page.js', content);
  console.log('Tally pills replaced!');
} else {
  console.log('Cranksets not found - already replaced');
}
