const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const port = 3001;

const fs = require('fs');

let browserPath = '';
if (fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')) {
    browserPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
} else if (fs.existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')) {
    browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
}

const puppeteerOptions = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
    ]
};
if (browserPath) {
    puppeteerOptions.executablePath = browserPath;
}

// Use LocalAuth to save the session so you don't have to scan the QR code every time
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: puppeteerOptions
});

let isReady = false;
let qrCodeString = null;

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('\n--- SCAN THIS QR CODE WITH WHATSAPP ---');
    qrcode.generate(qr, { small: true });
    qrCodeString = qr;
});

client.on('ready', () => {
    console.log('\n✅ WhatsApp Client is READY and connected!');
    isReady = true;
    qrCodeString = null;
});

client.on('authenticated', () => {
    console.log('✅ Authenticated successfully!');
    qrCodeString = null;
});

client.on('auth_failure', msg => {
    console.error('❌ Authentication failure', msg);
    isReady = false;
});

client.on('disconnected', (reason) => {
    console.log('❌ Client was disconnected', reason);
    isReady = false;
    qrCodeString = null;
});

client.initialize();

// API Endpoint to get status and QR

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

    try {
        if (!isReady) {
            return res.status(503).json({ error: 'WhatsApp client is not ready yet. Please scan the QR code in the terminal running this server.' });
        }

        const toPhone = req.body.to || req.body.number;
        const msgText = req.body.message || req.body.text;

        if (!toPhone || !msgText) {
            return res.status(400).json({ error: 'Missing phone number ("to" or "number") or text ("message" or "text") in request body.' });
        }

        // WhatsApp IDs usually look like: 919999999999@c.us
        let formattedNumber = String(toPhone).replace(/\D/g, "");
        if (formattedNumber.length === 10) {
            formattedNumber = "91" + formattedNumber;
        }
        
        const chatId = formattedNumber + "@c.us";

        // Send the message
        await client.sendMessage(chatId, msgText);
        console.log(`📤 Sent message to ${formattedNumber}: ${msgText.replace(/\n/g, ' ')}`);
        
        return res.status(200).json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('❌ Error sending message:', error);
        return res.status(500).json({ error: 'Failed to send message', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`\n🚀 WhatsApp Microservice is running on http://localhost:${port}`);
    console.log('Waiting for WhatsApp client to initialize...');
});
