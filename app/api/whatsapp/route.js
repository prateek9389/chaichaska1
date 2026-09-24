import { NextResponse } from 'next/server';
import { getWhatsAppConfig } from '@/lib/firestore';

export async function POST(req) {
  try {
    const { number, text } = await req.json();

    if (!number || !text) {
      return NextResponse.json({ error: 'Missing number or text' }, { status: 400 });
    }

    const config = await getWhatsAppConfig();
    if (!config || !config.isEnabled || !config.apiUrl) {
      return NextResponse.json({ error: 'WhatsApp integration is disabled or not configured' }, { status: 400 });
    }

    const headers = {
      'Content-Type': 'application/json'
    };
    if (config.apiKey) {
      headers['apikey'] = config.apiKey;
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
