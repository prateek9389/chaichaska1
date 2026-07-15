const fs = require('fs');
const path = 'app/chaimaker/page.js';
let content = fs.readFileSync(path, 'utf8');

const replacement = `<input type="text" placeholder="Search Here" className="search-input-new" />
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                  alt="Profile"
                  className="profile-avatar-new"
                />
              </div>
            </header>

            {/* TAB CONTENT */}
            {activeTab === "dashboard" && (
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

const regex = /<input type="text" placeholder="Search Here" className="search-input-new" \/>[\s\S]*?<div className="stats-cards-row-new">/m;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(path, content);
  console.log("Regex replaced successfully.");
} else {
  console.log("Regex did not match.");
}
