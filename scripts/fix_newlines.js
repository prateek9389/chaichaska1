const fs = require('fs');

const adminPath = 'app/admin/page.js';
const chaimakerPath = 'app/chaimaker/page.js';

let adminContent = fs.readFileSync(adminPath, 'utf8');
adminContent = adminContent.replace(/\\n/g, '\n');
fs.writeFileSync(adminPath, adminContent);

let chaimakerContent = fs.readFileSync(chaimakerPath, 'utf8');
chaimakerContent = chaimakerContent.replace(/\\n/g, '\n');
fs.writeFileSync(chaimakerPath, chaimakerContent);

console.log("Fixed files properly.");
