import { NextResponse } from 'next/server';
import { getWhatsAppConfig } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getWhatsAppConfig();
    const apiUrl = config?.apiUrl || process.env.WHATSAPP_LIVE_API_URL || '';

    // If the user configured an external LIVE API (like bitechez.com),
    // bypass the local QR code check and just tell the frontend it's connected.
    if (apiUrl && !apiUrl.includes('127.0.0.1') && !apiUrl.includes('localhost')) {
      return NextResponse.json({ isReady: true, qr: null, isError: false });
    }

    // Otherwise, check the local node server for QR/status
    const res = await fetch('http://127.0.0.1:3001/status', { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ isReady: false, qr: null, isError: true }, { status: 500 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ isReady: false, qr: null, isError: true }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { number, text } = await req.json();

    if (!number || !text) {
      return NextResponse.json({ error: 'Missing number or text' }, { status: 400 });
    }

    const config = await getWhatsAppConfig();
    
    // Default to enabled and local Node.js server if not explicitly configured otherwise
    const isEnabled = config?.isEnabled !== false; 
    const apiUrl = config?.apiUrl || process.env.WHATSAPP_LIVE_API_URL || 'http://127.0.0.1:3001/send-message';
    const apiKey = config?.apiKey || process.env.WHATSAPP_LIVE_API_KEY || '';

    if (!isEnabled) {
      return NextResponse.json({ error: 'WhatsApp integration is disabled' }, { status: 400 });
    }

    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['apikey'] = apiKey;
    }

    // Call the external API or local server
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ number, text })
    });

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
