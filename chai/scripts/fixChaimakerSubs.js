const fs = require('fs');
let lines = fs.readFileSync('app/chaimaker/page.js', 'utf8').split('\n');

const subsIdx = lines.findIndex(l => l.includes('activeTab === "subs"'));
if (subsIdx !== -1) {
  // Check if activeSubs already exists in the next 10 lines
  let hasActiveSubs = false;
  for(let i=subsIdx; i<subsIdx+10; i++) {
    if (lines[i].includes('const activeSubs')) hasActiveSubs = true;
  }
  
  if (!hasActiveSubs) {
    lines.splice(subsIdx + 1, 0, '              const activeSubs = subscriptions.filter(s => s.status === "Active");');
    fs.writeFileSync('app/chaimaker/page.js', lines.join('\n'));
    console.log('Fixed activeSubs ReferenceError in chaimaker page.');
  } else {
    console.log('activeSubs already exists.');
  }
} else {
  console.log('activeTab === "subs" not found in chaimaker.');
}
