const fs = require('fs');
let lines = fs.readFileSync('app/chaimaker/page.js', 'utf8').split('\n');

// 1. Remove the incorrectly injected line in JSX
const badLineIdx = lines.findIndex(l => l.includes('<button onClick={() => setActiveTab("subs")}') && lines.indexOf(l) > 0);
if (badLineIdx !== -1) {
  // the bad line is likely the next one or two lines
  for (let i = badLineIdx; i < badLineIdx + 5; i++) {
    if (lines[i].includes('const activeSubs = subscriptions.filter')) {
      lines.splice(i, 1);
      console.log('Removed invalid activeSubs line at index ' + i);
      break;
    }
  }
}

// 2. Add it correctly at the start of the tab
const correctTabIdx = lines.findIndex(l => l.includes('activeTab === "subs" && (() => {'));
if (correctTabIdx !== -1) {
  let hasActiveSubs = false;
  for (let i = correctTabIdx; i < correctTabIdx + 10; i++) {
    if (lines[i].includes('const activeSubs')) hasActiveSubs = true;
  }
  
  if (!hasActiveSubs) {
    lines.splice(correctTabIdx + 1, 0, '              const activeSubs = subscriptions.filter(s => s.status === "Active");');
    console.log('Correctly added activeSubs at index ' + (correctTabIdx + 1));
  }
} else {
  console.log('Could not find the real subs tab block in chaimaker');
}

fs.writeFileSync('app/chaimaker/page.js', lines.join('\n'));
