const fs = require('fs');
const file = 'whatsapp-server.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('/logout')) {
  const replacement = `
app.get('/status', (req, res) => {
    res.json({
        isReady,
        qr: qrCodeData
    });
});

app.post('/logout', async (req, res) => {
    isReady = false;
    qrCodeData = null;
    console.log("Logging out local WhatsApp client...");
    try {
        await client.logout();
    } catch(e) {
        console.log("Logout threw error, destroying instead:", e.message);
        try { await client.destroy(); } catch(ex) {}
    }
    
    // Give time for files to unlock, then delete auth dir and re-initialize
    setTimeout(() => {
        try { 
            const fs = require('fs');
            fs.rmSync('./.wwebjs_auth', { recursive: true, force: true }); 
        } catch(err) {
            console.log("Could not delete .wwebjs_auth:", err.message);
        }
        client.initialize();
    }, 2000);
    
    res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/send-message', async (req, res) => {
`;
  content = content.replace(/app\.get\('\/status'[\s\S]*?app\.post\('\/send-message',\s*async\s*\(req,\s*res\)\s*=>\s*\{/, replacement);
  fs.writeFileSync(file, content);
  console.log("Patched whatsapp-server.js successfully");
} else {
  console.log("Already patched");
}
