const fs = require('fs');
const path = 'app/chaimaker/page.js';
let content = fs.readFileSync(path, 'utf8');

const target = `            {activeTab === "dashboard" && (
              <div>
                <div className="stats-cards-row-new">`;

const replacement = `            {activeTab === "dashboard" && (
              <div>
                {/* SUBHEADER */}
                <div className="sales-order-subheader">
                  <div>
                    <h2>Sales and Order</h2>
                    <p>Your Sales and Orders Summary Activates</p>
                  </div>

                  <div className="subheader-controls">
                    <button className="btn-export-data">
                      📤 Export Data
                    </button>
                    
                    <div className="filter-pill-group">
                      {["Daily", "Weekly", "Monthly"].map((pill) => (
                        <button
                          key={pill}
                          onClick={() => setTimeFilter(pill)}
                          className={\`filter-pill-btn \${timeFilter === pill ? "active" : ""}\`}
                        >
                          {pill}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* STATS ROW */}
                <div className="stats-cards-row-new">`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log("Restored subheader successfully.");
} else {
  console.log("Could not find the target string exactly. Looking for alternatives.");
  if (content.includes('<div>\\n                <div className="stats-cards-row-new">')) {
    console.log("Alternative found, trying to replace.");
  }
}
