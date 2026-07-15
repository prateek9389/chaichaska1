const fs = require('fs');

const files = ['app/admin/page.js', 'app/chaimaker/page.js'];

files.forEach(f => {
  let lines = fs.readFileSync(f, 'utf8').split('\n');

  // Replace Bicycle Chart
  let startIdx = lines.findIndex(l => l.includes('{ m: "Jan", h: 40 }'));
  if (startIdx !== -1) {
    let bracketStart = -1;
    for(let i=startIdx; i>=0; i--) { if (lines[i].includes('{[')) { bracketStart = i; break; } }
    
    let mapEnd = -1;
    for(let i=startIdx; i<lines.length; i++) { if (lines[i].includes('].map((bar, i) => (')) { mapEnd = i; break; } }
    
    if (bracketStart !== -1 && mapEnd !== -1) {
      lines.splice(bracketStart, mapEnd - bracketStart + 1, '                        {[].map((bar, i) => (');
    }
  }

  fs.writeFileSync(f, lines.join('\n'));
});
