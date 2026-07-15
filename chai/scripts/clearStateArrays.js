const fs = require('fs');

const files = ['app/admin/page.js', 'app/chaimaker/page.js'];
const states = ['orders', 'stocks', 'restockHistory', 'restockRequests', 'menuItems', 'combos', 'addonsList', 'selectedComboAddons', 'feedbackList', 'leaveRequests', 'customerManagement', 'todaySettlements'];

files.forEach(f => {
  let lines = fs.readFileSync(f, 'utf8').split('\n');
  
  states.forEach(state => {
    // Find declaration line
    let startIdx = lines.findIndex(l => l.includes(`const [${state}, `) && l.includes('useState(['));
    if (startIdx !== -1) {
      // It's a multi-line array. Find the closing ]);
      let endIdx = -1;
      let bracketCount = 0;
      let started = false;
      
      // We know it starts with useState([ on startIdx.
      // We can just look for the first line that is precisely `  ]);` or similar if we want to be lazy, 
      // but let's count brackets.
      for(let i = startIdx; i < lines.length; i++) {
        let line = lines[i];
        for(let j=0; j<line.length; j++) {
          if (line[j] === '[') { bracketCount++; started = true; }
          if (line[j] === ']') { bracketCount--; }
        }
        if (started && bracketCount === 0) {
          endIdx = i;
          break;
        }
      }
      
      if (endIdx !== -1) {
        // Replace everything from startIdx to endIdx with a single line
        const decl = lines[startIdx].split('=')[0]; // "  const [orders, setOrders] "
        lines.splice(startIdx, endIdx - startIdx + 1, `${decl}= useState([]);`);
      } else {
        // if it was already single line `const [orders, setOrders] = useState([]);`, it doesn't need replacing
        if (lines[startIdx].includes('useState([])')) {
          // do nothing
        }
      }
    }
  });

  fs.writeFileSync(f, lines.join('\n'));
});
