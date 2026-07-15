const fs = require('fs');
const files = ['app/admin/page.js', 'app/chaimaker/page.js'];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Floor batches
  content = content.replace(/\{\[\s*\{\s*floor:\s*"Floor[\s\S]*?\]\.map\(\(route,\s*i\)\s*=>/g, '{[].map((route, i) =>');
  
  // Kitchen tracking
  content = content.replace(/\{\[\s*\{\s*name:\s*"Classic[\s\S]*?\]\.map\(\(item,\s*idx\)\s*=>/g, '{[].map((item, idx) =>');
  
  // Ratings
  content = content.replace(/\{\[\s*\{\s*stars:\s*5[\s\S]*?\]\.map\(\(item,\s*idx\)\s*=>/g, '{[].map((item, idx) =>');
  
  // Charts
  content = content.replace(/\{\[\s*\{\s*m:\s*"Jan"[\s\S]*?\]\.map\(\(bar,\s*i\)\s*=>/g, '{[].map((bar, i) =>');

  fs.writeFileSync(f, content);
  console.log(`Updated ${f}, matched? ${original !== content}`);
});
