const fs = require('fs');
const path = require('path');

function updateAdmin() {
  const filePath = path.join(__dirname, '../app/admin/page.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Change Sidebar Item Text
  content = content.replace(
    '<span className="btn-emoji">🍽️</span> Menu & Pricing',
    '<span className="btn-emoji">🍽️</span> Products & Menu'
  );

  // Change Sub-Tab Text
  content = content.replace(
    '{ id: "catalog", label: "📋 Base Catalog Setup" },',
    '{ id: "catalog", label: "📋 Add / Manage Products" },'
  );

  fs.writeFileSync(filePath, content);
}

function updateChaimaker() {
  const filePath = path.join(__dirname, '../app/chaimaker/page.js');
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the Add Item Form Block
  const startStr = '                    {/* Add Item form */}';
  const endStr = '                    </div>\n                  </div>\n                )}\n\n                {/* SUBTAB 3: SCHEDULES & SLOTS */}';
  
  const startIndex = content.indexOf(startStr);
  const endIndex = content.indexOf(endStr);
  
  if (startIndex !== -1 && endIndex !== -1) {
    const stringToRemove = content.substring(startIndex, endIndex);
    content = content.replace(stringToRemove, '');
  }

  // Change Sidebar Item Text to match Admin slightly just for consistency? Or just leave it as Menu & Pricing.
  // The user only asked for admin sidebar to have product. So leave Chaimaker alone.

  fs.writeFileSync(filePath, content);
}

updateAdmin();
updateChaimaker();
console.log('Product UI updated successfully!');
