const fs = require('fs');
let content = fs.readFileSync('app/admin/page.js', 'utf8');

// The file has a duplicate block starting right after the first `const [username, setUsername] = useState("");`
// We need to remove the second duplicate header that starts with `import Link from "next/link";`
// and ends just before the real code continues.

// Strategy: find the first occurrence of the duplicate injection and remove it.
// The duplicate block looks like:
//   const [username, setUsername] = useState("");\nimport Link from "next/link";\n\nexport default function AdminDashboard() {\n  ...up to the first non-duplicate line

// Find and remove the injected duplicate
const duplicateStart = '\nimport Link from "next/link";\n\nexport default function AdminDashboard() {';

// We want to find this pattern that appears INSIDE the function body (after line 9)
// and remove everything from that duplicateStart marker up until the first real line after the duplicate header block ends.
// The duplicate block ends at `const [isOnline, setIsOnline] = useState(true);`

const badBlock = `\nimport Link from "next/link";\n\nexport default function AdminDashboard() {\n  const [isLoggedIn, setIsLoggedIn] = useState(false);\n  const [username, setUsername] = useState("");\n  const [password, setPassword] = useState("");\n  const [loginError, setLoginError] = useState("");\n\n  // Tabs State (1st tab is Dashboard)\n  const [activeTab, setActiveTab] = useState("dashboard"); \n  const [timeFilter, setTimeFilter] = useState("Weekly");\n  const [queueFilter, setQueueFilter] = useState("All"); \n  const [isOnline, setIsOnline] = useState(true);`;

if (content.includes(badBlock)) {
  content = content.replace(badBlock, '');
  fs.writeFileSync('app/admin/page.js', content);
  console.log('Duplicate block removed successfully!');
} else {
  // Try partial match
  const idx = content.indexOf('\nimport Link from "next/link";\n\nexport default');
  if (idx !== -1) {
    // Find the end of the duplicate block - look for the next non-duplicate line
    const endMarker = '  const [isOnline, setIsOnline] = useState(true);\n';
    const endIdx = content.indexOf(endMarker, idx);
    if (endIdx !== -1) {
      content = content.substring(0, idx) + '\n' + content.substring(endIdx + endMarker.length);
      fs.writeFileSync('app/admin/page.js', content);
      console.log('Partial duplicate block removed!');
    } else {
      console.log('Could not find end of duplicate block');
      // Show what is at idx
      console.log('Content around idx:', content.substring(idx, idx + 500));
    }
  } else {
    console.log('No duplicate found - file may already be clean');
    // Show lines 8-25
    const lines = content.split('\n');
    lines.slice(7, 25).forEach((l, i) => console.log((i + 8) + ': ' + l));
  }
}
