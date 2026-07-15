const fs = require('fs');
let lines = fs.readFileSync('app/admin/page.js', 'utf8').split('\n');

// 1. Wipe out Prep Mass Brewing dummy array
const brewStartIdx = lines.findIndex(l => l.includes('name: "Classic Masala Chai"'));
if (brewStartIdx !== -1) {
  // Find the start of the array `[` which is a few lines above
  let arrayStart = brewStartIdx;
  while (arrayStart > 0 && !lines[arrayStart].includes('{[') && !lines[arrayStart].includes('=[')) {
    arrayStart--;
  }
  
  // Find the end of the array `].map((item, idx) => {`
  let arrayEnd = brewStartIdx;
  while (arrayEnd < lines.length && !lines[arrayEnd].includes('].map((item, idx) => {')) {
    arrayEnd++;
  }
  
  if (arrayStart > 0 && arrayEnd < lines.length) {
    const brewReplacement = `
                      // Dynamic Mass Brewing Schedule
                      {(() => {
                        const brewMap = {};
                        activeUnservedOrders.forEach(o => {
                          let itemName = o.item.replace(/\\s*x\\s*\\d+/i, '').trim();
                          let qtyMatch = o.item.match(/x\\s*(\\d+)/i);
                          let qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
                          if (!brewMap[itemName]) brewMap[itemName] = { name: itemName, qty: 0, brewed: 0, img: "https://i.pinimg.com/736x/95/d1/9a/95d19a7cad652dd1caceb091c9794ac9.jpg", recipe: "Standard brew recipe" };
                          brewMap[itemName].qty += qty;
                        });
                        return Object.values(brewMap);
                      })().map((item, idx) => {
`;
    lines.splice(arrayStart, arrayEnd - arrayStart + 1, brewReplacement);
    console.log('Replaced Prep Mass Brewing dummy array');
  }
} else {
  console.log('Prep Mass Brewing dummy array not found');
}


// 2. Wipe out Prep Delivery Routes dummy array
const routeStartIdx = lines.findIndex(l => l.includes('floor: "Floor 5 (Block B)"'));
if (routeStartIdx !== -1) {
  // Find the start of the array
  let arrayStart = routeStartIdx;
  while (arrayStart > 0 && !lines[arrayStart].includes('{[') && !lines[arrayStart].includes('=[')) {
    arrayStart--;
  }
  
  // Find the end of the array `].map((route, i) => (`
  let arrayEnd = routeStartIdx;
  while (arrayEnd < lines.length && !lines[arrayEnd].includes('].map((route, i) => (')) {
    arrayEnd++;
  }
  
  if (arrayStart > 0 && arrayEnd < lines.length) {
    const routesReplacement = `
                      // Dynamic Active Delivery Routes
                      {(() => {
                        const routeMap = {};
                        activeUnservedOrders.forEach(o => {
                          let f = o.office || "Desk Area";
                          if (!routeMap[f]) routeMap[f] = { floor: f, items: 0, status: "Normal", courier: "Delivery Team" };
                          routeMap[f].items += 1;
                          if (routeMap[f].items > 5) routeMap[f].status = "High Demand";
                        });
                        return Object.values(routeMap);
                      })().map((route, i) => (
`;
    lines.splice(arrayStart, arrayEnd - arrayStart + 1, routesReplacement);
    console.log('Replaced Prep Delivery Routes dummy array');
  }
} else {
  console.log('Prep Delivery Routes dummy array not found');
}

fs.writeFileSync('app/admin/page.js', lines.join('\n'));
console.log('Finished dummy replacements.');
