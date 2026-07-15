const fs = require('fs');
const path = 'app/chaimaker/page.js';

let content = fs.readFileSync(path, 'utf8');
let lines = content.split(/\r?\n/);

console.log("Line 2317 before:", lines[2316]);
if (lines[2316].includes('))}')) {
    lines[2316] = lines[2316].replace('))}', ')})}');
    fs.writeFileSync(path, lines.join('\n'));
    console.log("Successfully fixed line 2317!");
} else {
    console.log("Line 2317 doesn't contain '))}'. Searching...");
    for (let i = 2300; i < 2330; i++) {
        if (lines[i] && lines[i].includes('))}')) {
            console.log("Found at line " + (i + 1) + ":", lines[i]);
            lines[i] = lines[i].replace('))}', ')})}');
            fs.writeFileSync(path, lines.join('\n'));
            console.log("Fixed!");
            break;
        }
    }
}
