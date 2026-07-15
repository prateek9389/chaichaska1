const fs = require('fs');

const files = ['app/admin/page.js', 'app/chaimaker/page.js'];

files.forEach(f => {
  let lines = fs.readFileSync(f, 'utf8').split('\n');

  // Replace Kitchen Tracking
  let startIdx = lines.findIndex(l => l.includes('name: "Classic Masala Chai"'));
  if (startIdx !== -1) {
    let bracketStart = -1;
    for(let i=startIdx; i>=0; i--) { if (lines[i].includes('{[')) { bracketStart = i; break; } }
    
    let mapEnd = -1;
    for(let i=startIdx; i<lines.length; i++) { if (lines[i].includes('].map((item, idx) => {')) { mapEnd = i; break; } }
    
    if (bracketStart !== -1 && mapEnd !== -1) {
      lines.splice(bracketStart, mapEnd - bracketStart + 1, '                      {[].map((item, idx) => {');
    }
  }
  
  // Replace Floor Batches
  startIdx = lines.findIndex(l => l.includes('floor: "Floor 2'));
  if (startIdx !== -1) {
    let bracketStart = -1;
    for(let i=startIdx; i>=0; i--) { if (lines[i].includes('{[')) { bracketStart = i; break; } }
    
    let mapEnd = -1;
    for(let i=startIdx; i<lines.length; i++) { if (lines[i].includes('].map((route, i) => (')) { mapEnd = i; break; } }
    
    if (bracketStart !== -1 && mapEnd !== -1) {
      lines.splice(bracketStart, mapEnd - bracketStart + 1, '                      {[].map((route, i) => (');
    }
  }

  // Replace Ratings
  startIdx = lines.findIndex(l => l.includes('stars: 5, pct: "75%"'));
  if (startIdx !== -1) {
    let bracketStart = -1;
    for(let i=startIdx; i>=0; i--) { if (lines[i].includes('{[')) { bracketStart = i; break; } }
    
    let mapEnd = -1;
    for(let i=startIdx; i<lines.length; i++) { if (lines[i].includes('].map((item, idx) => (')) { mapEnd = i; break; } }
    
    if (bracketStart !== -1 && mapEnd !== -1) {
      lines.splice(bracketStart, mapEnd - bracketStart + 1, '                      {[].map((item, idx) => (');
    }
  }

  fs.writeFileSync(f, lines.join('\n'));
});
