const fs = require('fs');
let code = fs.readFileSync('app/chaimaker/page.js', 'utf8');

const anchor = '  const [orders, setOrders] = useState([]);';

const injectCode = `
  const todayTally = (() => {
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
  })();

  const floorBatches = (() => {
    const floorMap = {};
    orders.filter(o => o.status !== "Delivered" && o.status !== "Cancelled" && o.status !== "Completed").forEach(o => {
      const floor = o.office || "Unknown Office";
      if (!floorMap[floor]) floorMap[floor] = { floor, items: [], status: o.priority === "High" ? "High Demand" : "Normal", courier: "Pending assignment" };
      floorMap[floor].items.push(o.item || "Unknown");
      if (o.priority === "High") floorMap[floor].status = "High Demand";
    });
    return Object.values(floorMap).map(f => ({ ...f, items: f.items.join(', ') }));
  })();
`;

if (code.includes(anchor)) {
  code = code.replace(anchor, anchor + '\\n' + injectCode);
  fs.writeFileSync('app/chaimaker/page.js', code);
  console.log('Successfully injected dynamic variables in chaimaker');
} else {
  console.log('Anchor not found!');
}
