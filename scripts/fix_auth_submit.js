const fs = require('fs');
const path = require('path');

function fixFile(filePath, type) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('import { loginWithEmail, signUpWithEmail } from "@/lib/auth";')) {
    content = content.replace('import Link from "next/link";', 'import { loginWithEmail, signUpWithEmail } from "@/lib/auth";\nimport Link from "next/link";');
  }

  // Replace Admin Logic
  if (type === 'admin') {
    const adminRegex = /const handleLoginSubmit = \(e\) => \{[\s\S]*?setLoginError\("Invalid credentials\. Hint: admin \/ adminpass"\);\s*\}\s*\};/;
    const adminNew = `const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      await loginWithEmail(username.trim(), password.trim());
      setIsLoggedIn(true);
      localStorage.setItem("admin_logged", "true");
      setLoginError("");
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.message.includes("invalid")) {
        try {
          await signUpWithEmail({ name: "Admin", email: username.trim(), password: password.trim() });
          setIsLoggedIn(true);
          localStorage.setItem("admin_logged", "true");
          setLoginError("");
        } catch (e2) {
          setLoginError(e2.message);
        }
      } else {
        setLoginError(err.message);
      }
    }
  };`;
    content = content.replace(adminRegex, adminNew);
    
    // Update placeholders
    content = content.replace('Operator Username', 'Operator Email');
    content = content.replace('Username (e.g. brewmaster)', 'Email (e.g. admin123@gmail.com)');
  }

  // Replace Chaimaker Logic
  if (type === 'chaimaker') {
    const chaiRegex = /const handleLoginSubmit = \(e\) => \{[\s\S]*?setLoginError\("Invalid credentials\. Hint: brewmaster \/ chai"\);\s*\}\s*\};/;
    const chaiNew = `const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      await loginWithEmail(username.trim(), password.trim());
      setIsLoggedIn(true);
      localStorage.setItem("brewmaster_logged", "true");
      setLoginError("");
    } catch (err) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.message.includes("invalid")) {
        try {
          await signUpWithEmail({ name: "Chaimaker", email: username.trim(), password: password.trim() });
          setIsLoggedIn(true);
          localStorage.setItem("brewmaster_logged", "true");
          setLoginError("");
        } catch (e2) {
          setLoginError(e2.message);
        }
      } else {
        setLoginError(err.message);
      }
    }
  };`;
    content = content.replace(chaiRegex, chaiNew);
    
    // Update placeholders
    content = content.replace('Operator Username', 'Operator Email');
    content = content.replace('Username (e.g. brewmaster)', 'Email (e.g. brewmaster@gmail.com)');
  }

  fs.writeFileSync(filePath, content);
}

fixFile(path.join(__dirname, '../app/admin/page.js'), 'admin');
fixFile(path.join(__dirname, '../app/chaimaker/page.js'), 'chaimaker');
console.log('Firebase auth integrated in admin & chaimaker successfully!');
