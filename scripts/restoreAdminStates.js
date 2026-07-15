const fs = require('fs');
let lines = fs.readFileSync('app/admin/page.js', 'utf8').split('\n');

// Find the username line
const usernameIdx = lines.findIndex(l => l.includes('const [username, setUsername]'));
console.log('username at line:', usernameIdx + 1);
console.log('line after:', lines[usernameIdx + 1]);

// Insert missing states right after the username line
const toInsert = [
  '  const [password, setPassword] = useState("");',
  '  const [loginError, setLoginError] = useState("");',
  '',
  '  // Tabs State',
  '  const [activeTab, setActiveTab] = useState("dashboard");',
  '  const [timeFilter, setTimeFilter] = useState("Weekly");',
  '  const [queueFilter, setQueueFilter] = useState("All");',
  '  const [isOnline, setIsOnline] = useState(true);',
  '',
];

// Insert after username line
lines.splice(usernameIdx + 1, 0, ...toInsert);

fs.writeFileSync('app/admin/page.js', lines.join('\n'));
console.log('States inserted successfully!');

// Verify
const newLines = fs.readFileSync('app/admin/page.js', 'utf8').split('\n');
console.log('Lines 8-24:');
newLines.slice(7, 24).forEach((l, i) => console.log((i + 8) + ': ' + l));
