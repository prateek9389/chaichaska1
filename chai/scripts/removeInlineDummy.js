const fs = require('fs');

const files = ['app/admin/page.js', 'app/chaimaker/page.js'];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // Remove Active Floor Batches
  content = content.replace(/\[[\s\S]*?floor: "Floor 2[\s\S]*?\]\.map\(\(route, i\) => \(/, '[].map((route, i) => (');

  // Remove Live Kitchen Tracking
  content = content.replace(/\[[\s\S]*?name: "Classic Masala Chai"[\s\S]*?\]\.map\(\(item, idx\) => \{/, '[].map((item, idx) => {');

  // Remove Rating Breakdown
  content = content.replace(/\[\s*\{\s*stars: 5, pct: "75%", count: 182\s*\},[\s\S]*?\]\.map\(\(item, idx\) => \(/, '[].map((item, idx) => (');

  // Remove Bicycle Performance Visual (Admin only usually, but let's replace globally)
  content = content.replace(/\[\s*\{\s*m: "Jan", h: 40\s*\},[\s\S]*?\]\.map\(\(bar, i\) => \(/, '[].map((bar, i) => (');

  fs.writeFileSync(f, content);
});

console.log('Inline dummy data arrays wiped!');
