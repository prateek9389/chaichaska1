const fs = require('fs');
let code = fs.readFileSync('app/chaimaker/page.js', 'utf8');

// The logic in chaimaker has to be replaced as well. 
// It has the same todayTally code. Let's see how it looks.
// Let's replace the whole blocks safely just like admin page.

const tallyOld = `  const todayTally = (() => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayOrders = orders.filter(o => (o.createdAt || 0) >= todayStart.getTime());
    const tally = {};
    todayOrders.forEach(o => { const key = o.item || "Unknown"; tally[key] = (tally[key] || 0) + 1; });
    return tally;
  })();`;

const tallyNew = `  const todayTally = (() => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayOrders = orders.filter(o => (o.createdAt || 0) >= todayStart.getTime());
    const tally = {};
    todayOrders.forEach(o => { 
      const key = o.item || "Unknown"; 
      if (!tally[key]) {
        tally[key] = {
          name: key,
          qty: 0,
          brewed: 0,
          img: o.img || "https://i.pinimg.com/736x/82/64/80/8264808f4840845e96abc7f7ec60b82f.jpg",
          recipe: o.addons ? \`Addons: \${o.addons}\` : "Standard preparation",
        };
      }
      let q = 1;
      const match = o.item.match(/x(\\d+)$/);
      if(match) q = parseInt(match[1]);
      
      tally[key].qty += q;
      if (o.status === "Delivered" || o.status === "Completed") {
        tally[key].brewed += q;
      }
    });
    return tally;
  })();`;
if(code.includes(tallyOld)) code = code.replace(tallyOld, tallyNew);
else console.log('Warning: todayTally block not matched in chaimaker');

const floorOld = `  const floorBatches = (() => {
    const floorMap = {};
    orders.filter(o => o.status === "Received" || o.status === "Pending" || o.status === "Preparing").forEach(o => {
      const floor = o.office || "Unknown";
      if (!floorMap[floor]) floorMap[floor] = { items: [], count: 0 };
      floorMap[floor].items.push(o.item || "Unknown");
      floorMap[floor].count++;
    });
    return floorMap;
  })();`;

const floorNew = `  const floorBatches = (() => {
    const floorMap = {};
    orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled" && o.status !== "Completed").forEach(o => {
      const floor = o.office || "Unknown Office";
      if (!floorMap[floor]) floorMap[floor] = { floor, items: [], status: o.priority === "High" ? "High Demand" : "Normal", courier: "Pending assignment" };
      floorMap[floor].items.push(o.item || "Unknown");
      if (o.priority === "High") floorMap[floor].status = "High Demand";
    });
    return Object.values(floorMap).map(f => ({ ...f, items: f.items.join(', ') }));
  })();`;
if(code.includes(floorOld)) code = code.replace(floorOld, floorNew);
else console.log('Warning: floorBatches block not matched in chaimaker');

// Replace hardcoded map array in UI
const hardcodedTallyRegex = /\{\[\s*\{\s*name:\s*"Classic Masala Chai"[\s\S]*?recipe:\s*"Green tea leaves \+ saffron strands \+ cinnamon \+ almond slivers",\s*\},?\s*\]\.map\(\(item, idx\) => \{/g;
if(hardcodedTallyRegex.test(code)) code = code.replace(hardcodedTallyRegex, `{Object.values(todayTally).map((item, idx) => {`);
else console.log('Warning: hardcodedTallyRegex not matched in chaimaker');

const hardcodedFloorsRegex = /\{\[\s*\{\s*floor:\s*"Floor 5 \(Block B\)"[\s\S]*?courier:\s*"Mahesh Pal",\s*\},?\s*\]\.map\(\(route, i\) => \(/g;
if(hardcodedFloorsRegex.test(code)) code = code.replace(hardcodedFloorsRegex, `{floorBatches.map((route, i) => (`);
else console.log('Warning: hardcodedFloorsRegex not matched in chaimaker');

fs.writeFileSync('app/chaimaker/page.js', code);
console.log('Updated app/chaimaker/page.js');
