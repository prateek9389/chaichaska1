const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../app/admin/page.js');
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('const [subscriptions, setSubscriptions] = useState([]);')) {
  content = content.replace(
    'const [activeInvoice, setActiveInvoice] = useState(null);',
    'const [activeInvoice, setActiveInvoice] = useState(null);\n  const [subscriptions, setSubscriptions] = useState([]);'
  );
}

content = content.replace(
  'const activeSubs = [];',
  'const activeSubs = subscriptions;'
);

fs.writeFileSync(file, content);
console.log('Fixed subscriptions state successfully!');
