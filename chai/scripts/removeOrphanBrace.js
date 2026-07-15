const fs = require('fs');
let lines = fs.readFileSync('app/chaimaker/page.js', 'utf8').split('\n');

// Find the double }; pattern: line with "  };" followed by "  };"
for (let i = 0; i < lines.length - 1; i++) {
  if (lines[i].trim() === '};' && lines[i+1].trim() === '};') {
    // Make sure the one before is a real function closing (line i), and i+1 is orphan
    const before = lines[i-1] || '';
    if (before.trim().startsWith('setTimeout')) {
      console.log('Found double }; at lines', i+1, 'and', i+2, '- context:', before.trim());
      // Remove the orphan (i+1)
      lines.splice(i+1, 1);
      console.log('Removed orphan };');
      break;
    }
  }
}

fs.writeFileSync('app/chaimaker/page.js', lines.join('\n'));

// Verify
const newLines = fs.readFileSync('app/chaimaker/page.js', 'utf8').split('\n');
console.log('Lines 320-328:');
newLines.slice(319, 328).forEach((l, i) => console.log((i + 320) + ': ' + l.trim()));
