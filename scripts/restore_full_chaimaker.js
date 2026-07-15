const fs = require('fs');
const path = 'app/chaimaker/page.js';
let content = fs.readFileSync(path, 'utf8');

const target = `                <input type="text" placeholder="Search Here" className="search-input-new" />
            {/* TAB CONTENT */}
            {activeTab === "dashboard" && (
              <div>
                <div className="stats-cards-row-new">`;

const replacement = `                <input type="text" placeholder="Search Here" className="search-input-new" />
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

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log("Restored missing profile and subheader.");
} else {
  console.log("Could not find the target to replace in chaimaker.");
}
