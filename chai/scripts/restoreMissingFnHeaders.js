const fs = require('fs');
let lines = fs.readFileSync('app/chaimaker/page.js', 'utf8').split('\n');

// Find the orphan lines
const orphanIdx = lines.findIndex(l => l.includes('Updated menu item availability'));
console.log('Orphan at line:', orphanIdx + 1);

if (orphanIdx === -1) {
  console.log('Not found - may already be fixed');
  process.exit(0);
}

// Remove the 2 orphan lines (setToastMsg + setTimeout + closing };)
// Check what we have around orphanIdx
lines.slice(orphanIdx - 2, orphanIdx + 5).forEach((l, i) => console.log((i + orphanIdx - 1) + ': |' + l + '|'));

// The orphan block is just 3 lines: setToastMsg, setTimeout, };
// Remove them and insert the proper function declarations instead

const toInsert = [
  '',
  '  const handleRaiseAlert = (e) => {',
  "    e.preventDefault();",
  "    if (!requestQty) return;",
  "    const newReq = {",
  "      item: selectedItem,",
  "      qty: requestQty,",
  "      urgency: urgency,",
  "      notes: requestNotes || 'No notes',",
  "      date: 'Just now',",
  "      status: 'Sent to Admin'",
  "    };",
  "    setRestockRequests((prev) => [newReq, ...prev]);",
  "    setToastMsg('Restock alert sent to Admin!');",
  "    setRequestQty('');",
  "    setRequestNotes('');",
  "    setTimeout(() => setToastMsg(''), 4500);",
  "  };",
  "",
  "  const handleToggleMenuAvailability = async (idx) => {",
  "    const item = menuItems[idx];",
  "    if (item && item.id) {",
  "      await updateMenuItem(item.id, { active: !item.active });",
  "      setMenuItems((prev) => prev.map((m, i) => (i === idx ? { ...m, active: !m.active } : m)));",
  "    }",
  "    setToastMsg('Updated menu item availability!');",
  "    setTimeout(() => setToastMsg(''), 3000);",
  "  };",
];

// Replace the orphan block (lines orphanIdx-1 to orphanIdx+1 which is the 3 orphan lines)
lines.splice(orphanIdx - 1, 3, ...toInsert);

fs.writeFileSync('app/chaimaker/page.js', lines.join('\n'));
console.log('Fixed! Lines:', lines.length);
