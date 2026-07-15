const fs = require('fs');
const files = ['app/admin/page.js', 'app/chaimaker/page.js'];
files.forEach(f => {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  console.log('--- ' + f + ' ---');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('{ m: "Jan", h: 40 }')) console.log('Bicycle chart start:', i);
    if (lines[i].includes('floor: "Floor 2 (Design)')) console.log('Floor batch start:', i);
    if (lines[i].includes('name: "Classic Masala Chai"')) console.log('Kitchen start:', i);
    if (lines[i].includes('stars: 5, pct: "75%"')) console.log('Ratings start:', i);
  }
});
