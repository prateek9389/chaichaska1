const fs = require('fs');
const path = require('path');

function updateLogin(filePath, expectedEmail) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace Admin
  if (expectedEmail === 'admin123@gmail.com') {
    const adminTarget = `  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {`;
    const adminReplacement = `  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (username.trim().toLowerCase() !== "admin123@gmail.com") {
      setLoginError("Access denied. Admin portal is restricted.");
      return;
    }
    try {`;
    if (!content.includes('admin123@gmail.com") {')) {
        content = content.replace(adminTarget, adminReplacement);
    }
  }

  // Replace Chaimaker
  if (expectedEmail === 'brewmaster@gmail.com') {
    const chaiTarget = `  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {`;
    const chaiReplacement = `  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (username.trim().toLowerCase() !== "brewmaster@gmail.com") {
      setLoginError("Access denied. Brewmaster portal is restricted.");
      return;
    }
    try {`;
    if (!content.includes('brewmaster@gmail.com") {')) {
        content = content.replace(chaiTarget, chaiReplacement);
    }
  }

  fs.writeFileSync(filePath, content);
}

updateLogin(path.join(__dirname, '../app/admin/page.js'), 'admin123@gmail.com');
updateLogin(path.join(__dirname, '../app/chaimaker/page.js'), 'brewmaster@gmail.com');
console.log('Login restrictions applied!');
