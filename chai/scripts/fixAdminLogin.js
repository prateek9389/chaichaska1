const fs = require('fs');
let content = fs.readFileSync('app/admin/page.js', 'utf8');

const oldLogin = `  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (username === "brewmaster" && password === "chai") {`;

const newLogin = `  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const uname = username.trim().toLowerCase();
    const pwd = password.trim();
    if (uname === "brewmaster" && pwd === "chai") {`;

if (content.includes(oldLogin)) {
    content = content.replace(oldLogin, newLogin);
    fs.writeFileSync('app/admin/page.js', content);
    console.log('Successfully updated login check.');
} else {
    console.log('Could not find oldLogin block.');
}
