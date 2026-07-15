const fs = require('fs');
const path = require('path');

function updateAdminUI() {
  const filePath = path.join(__dirname, '../app/admin/page.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace Header
  content = content.replace(
    '<div className="brewmaster-badge">ADMIN ACCESS ONLY</div>\n            <h2>Authenticate Terminal</h2>\n            <p>Enter operator credentials to link with active brewing controllers.</p>',
    '<div className="brewmaster-badge" style={{ background: "#2c3e50", color: "#fff", borderColor: "#34495e" }}>ADMIN COMMAND CENTER</div>\n            <h2 style={{ color: "#2c3e50" }}>System Authentication</h2>\n            <p>Enter admin credentials to access business analytics and system configurations.</p>'
  );

  // Replace Button
  content = content.replace(
    '<button type="submit" className="btn-authenticate">\n              AUTHENTICATE TERMINAL\n            </button>',
    '<button type="submit" className="btn-authenticate" style={{ background: "#2c3e50", boxShadow: "0 4px 14px rgba(44, 62, 80, 0.4)" }}>\n              SECURE LOGIN\n            </button>'
  );

  fs.writeFileSync(filePath, content);
}

function updateChaimakerUI() {
  const filePath = path.join(__dirname, '../app/chaimaker/page.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace Header
  content = content.replace(
    '<div className="brewmaster-badge">BREWMASTER ACCESS ONLY</div>\n            <h2>Authenticate Terminal</h2>\n            <p>Enter operator credentials to link with active brewing controllers.</p>',
    '<div className="brewmaster-badge" style={{ background: "#d35400", color: "#fff", borderColor: "#e67e22" }}>BREWMASTER STATION</div>\n            <h2 style={{ color: "#d35400" }}>Kitchen Terminal</h2>\n            <p>Enter operator credentials to access active queues and brewing controls.</p>'
  );

  // Replace Button
  content = content.replace(
    '<button type="submit" className="btn-authenticate">\n              AUTHENTICATE TERMINAL\n            </button>',
    '<button type="submit" className="btn-authenticate" style={{ background: "#d35400", boxShadow: "0 4px 14px rgba(211, 84, 0, 0.4)" }}>\n              ENTER STATION\n            </button>'
  );

  fs.writeFileSync(filePath, content);
}

updateAdminUI();
updateChaimakerUI();
console.log('UI differentiated successfully!');
