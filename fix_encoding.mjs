import fs from 'fs';
import path from 'path';

const files = [
  'lib/firestore.js',
  'app/api/cashfree/create-order/route.js',
  'app/api/cashfree/verify/route.js'
];

for (const file of files) {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    // Remove all null bytes (0x00)
    const cleaned = buffer.filter(b => b !== 0x00);
    let text = cleaned.toString('utf8');
    // Remove the // touch line if present
    text = text.replace(/\/\/\s*touch/g, '');
    fs.writeFileSync(filePath, text, 'utf8');
    console.log('Fixed:', file);
  }
}
