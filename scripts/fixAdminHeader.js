const fs = require('fs');
let lines = fs.readFileSync('app/admin/page.js', 'utf8').split('\n');

// Find the broken header
const headerIdx = lines.findIndex(l => l.includes('<header className="dashboard-header-new">'));
console.log('header at line:', headerIdx + 1);

// Find what comes after
console.log('Lines after header:');
lines.slice(headerIdx, headerIdx + 10).forEach((l, i) => console.log((headerIdx + i + 1) + ': ' + l));

// Find the next comment that shouldn't be inside header
const tabContentIdx = lines.findIndex(l => l.includes('{/* TAB CONTENT */}'));
console.log('TAB CONTENT at line:', tabContentIdx + 1);

// Replace the broken header block: from <header> to just before {/* TAB CONTENT */}
const headerContent = [
  '            <header className="dashboard-header-new">',
  '              <div>',
  '                <span className="welcome-label">Welcome!</span>',
  '                <h1 className="operator-title">Admin Dashboard</h1>',
  '              </div>',
  '',
  '              <div className="header-search-box-wrap">',
  '                <span className="search-icon-new">\ud83d\udd0d</span>',
  '                <input type="text" placeholder="Search Here" className="search-input-new" />',
  '              </div>',
  '',
  '              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>',
  '                <img',
  '                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"',
  '                  alt="Profile"',
  '                  className="profile-avatar-new"',
  '                />',
  '              </div>',
  '            </header>',
  '',
];

// Replace from headerIdx to just before tabContentIdx
lines.splice(headerIdx, tabContentIdx - headerIdx, ...headerContent);

fs.writeFileSync('app/admin/page.js', lines.join('\n'));
console.log('Header fixed! New file size:', lines.length, 'lines');
