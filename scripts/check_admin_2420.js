const fs = require('fs');
const path = 'app/admin/page.js';

let content = fs.readFileSync(path, 'utf8');
let lines = content.split(/\r?\n/);

console.log("Line 2420 before:", lines[2419]);
if (lines[2419].includes('))}')) {
    lines[2419] = lines[2419].replace('))}', ')})}');
    fs.writeFileSync(path, lines.join('\n'));
    console.log("Successfully fixed line 2420 in admin!");
} else {
    console.log("Line 2420 doesn't contain '))}'. Searching...");
    for (let i = 2400; i < 2440; i++) {
        if (lines[i] && lines[i].includes('))}')) {
            console.log("Found at line " + (i + 1) + ":", lines[i]);
            // lines[i] = lines[i].replace('))}', ')})}');
            // fs.writeFileSync(path, lines.join('\n'));
            // console.log("Fixed admin!");
            break;
        }
    }
}
