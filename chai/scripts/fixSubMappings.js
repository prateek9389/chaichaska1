const fs = require('fs');
let content = fs.readFileSync('app/admin/page.js', 'utf8');

// Replace {sub.startDate} with {new Date(sub.createdAt).toLocaleDateString()}
content = content.replace(/Started: \{sub\.startDate\}/g, 'Started: {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : "Just now"}');

// Replace {sub.office} with {sub.floor}
content = content.replace(/🏢 \{sub\.office\}/g, '🏢 {sub.floor || "Desk"}');

// Replace {sub.items} with {sub.item}
content = content.replace(/☕ \{sub\.items\}/g, '☕ {sub.item} {sub.addons ? `+ ${sub.addons}` : ""}');

// Replace {sub.timeSlot} ({sub.schedule}) with {sub.time} ({sub.frequency})
content = content.replace(/⏰ \{sub\.timeSlot\} \(\{sub\.schedule\}\)/g, '⏰ {sub.time} ({sub.frequency})');

fs.writeFileSync('app/admin/page.js', content);
console.log('Fixed sub mappings in admin page.');
