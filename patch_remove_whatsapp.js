const fs = require('fs');

const files = [
  'app/admin-chaichaska-login/page.js',
  'app/brewmaster-chaichaska-login/page.js'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  // Match the entire sidebar-detail-group div containing the WhatsApp button
  const regex = /<div className="sidebar-detail-group"[^>]*>\s*<button[\s\S]*?Send Message on WhatsApp\s*<\/button>\s*<\/div>/g;
  content = content.replace(regex, '');
  fs.writeFileSync(f, content);
  console.log(`Patched ${f}`);
});
