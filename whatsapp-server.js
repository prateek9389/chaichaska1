const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const port = 3001;

// Use LocalAuth to save the session so you don't have to scan the QR code every time
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
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
    }
});

let isReady = false;

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('\n--- SCAN THIS QR CODE WITH WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n✅ WhatsApp Client is READY and connected!');
    isReady = true;
});

client.on('authenticated', () => {
    console.log('✅ Authenticated successfully!');
});

client.on('auth_failure', msg => {
    console.error('❌ Authentication failure', msg);
    isReady = false;
});

client.on('disconnected', (reason) => {
    console.log('❌ Client was disconnected', reason);
    isReady = false;
});

client.initialize();

// API Endpoint to send messages
app.post('/send-message', async (req, res) => {
    try {
        if (!isReady) {
            return res.status(503).json({ error: 'WhatsApp client is not ready yet. Please scan the QR code in the terminal running this server.' });
        }

        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'Missing "to" (phone number) or "message" (text) in request body.' });
        }

        // WhatsApp IDs usually look like: 919999999999@c.us
        let formattedNumber = to.replace(/\D/g, "");
        if (formattedNumber.length === 10) {
            formattedNumber = "91" + formattedNumber;
        }
        
        const chatId = formattedNumber + "@c.us";

        // Send the message
        await client.sendMessage(chatId, message);
        console.log(`📤 Sent message to ${formattedNumber}: ${message.replace(/\n/g, ' ')}`);
        
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
