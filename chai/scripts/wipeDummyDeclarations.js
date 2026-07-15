const fs = require('fs');
let content = fs.readFileSync('app/chaimaker/page.js', 'utf8');
let lines = content.split('\n');

// 1. Replace customerManagement dummy array
const custStart = lines.findIndex(l => l.includes('// Customer Management Table'));
const custEnd = lines.findIndex(l => l.includes('// Earnings Summary Stats'));
if (custStart !== -1 && custEnd !== -1) {
  const replacement = `  // Customer Management Table — built dynamically from orders
`;
  lines.splice(custStart, custEnd - custStart, replacement);
  console.log('Replaced customerManagement dummy array');
} else console.log('customerManagement block not found:', custStart, custEnd);

// 2. Replace statsSummary dummy
const statsStart = lines.findIndex(l => l.includes('// Earnings Summary Stats'));
const statsEnd = lines.findIndex(l => l.includes('const todaySettlements'));
if (statsStart !== -1 && statsEnd !== -1) {
  const replacement = `  // Earnings Summary Stats — computed dynamically below
`;
  lines.splice(statsStart, statsEnd - statsStart, replacement);
  console.log('Replaced statsSummary dummy');
} else console.log('statsSummary block not found:', statsStart, statsEnd);

// 3. Replace todaySettlements dummy
const settlStart = lines.findIndex(l => l.includes('const todaySettlements'));
const settlEnd = lines.findIndex(l => l.includes('const historyOrders'));
if (settlStart !== -1 && settlEnd !== -1) {
  const replacement = `  // todaySettlements built dynamically from orders below
`;
  lines.splice(settlStart, settlEnd - settlStart, replacement);
  console.log('Replaced todaySettlements dummy');
} else console.log('todaySettlements block not found:', settlStart, settlEnd);

// 4. Replace historyOrders dummy (only if it's still the old hard array)
const histStart = lines.findIndex(l => l.includes('const historyOrders = ['));
if (histStart !== -1) {
  // Find end of the array
  let depth = 0, histEnd = histStart;
  for (let i = histStart; i < Math.min(histStart + 20, lines.length); i++) {
    for (const ch of lines[i]) { if (ch === '[') depth++; if (ch === ']') depth--; }
    if (depth === 0 && i > histStart) { histEnd = i; break; }
  }
  const replacement = `  // historyOrders built dynamically from orders below
`;
  lines.splice(histStart, histEnd - histStart + 1, replacement);
  console.log('Replaced historyOrders dummy array');
} else console.log('historyOrders hardcoded array not found');

// 5. Replace todayTally and floorBatches
const tallyStart = lines.findIndex(l => l.includes('const todayTally = {'));
const tallyEnd = lines.findIndex(l => l.includes('// Stock'));
if (tallyStart !== -1 && tallyEnd !== -1) {
  const replacement = `  // todayTally and floorBatches built dynamically from orders below
`;
  lines.splice(tallyStart, tallyEnd - tallyStart, replacement);
  console.log('Replaced todayTally and floorBatches dummy');
} else console.log('todayTally block not found:', tallyStart, tallyEnd);

// 6. Replace upcomingSubscriptions dummy
const subStart = lines.findIndex(l => l.includes('// Subscriptions Due'));
const subEnd = lines.findIndex(l => l.includes('// Feedback list'));
if (subStart !== -1 && subEnd !== -1) {
  const replacement = `  // upcomingSubscriptions: use real subscriptions state below
`;
  lines.splice(subStart, subEnd - subStart, replacement);
  console.log('Replaced upcomingSubscriptions dummy');
} else console.log('upcomingSubscriptions block not found:', subStart, subEnd);

fs.writeFileSync('app/chaimaker/page.js', lines.join('\n'));
console.log('Done removing dummy declarations.');
