import { NextResponse } from 'next/server';
import { getWhatsAppConfig } from '@/lib/firestore';
import { DEFAULT_WHATSAPP_CONFIG, cleanPhoneForApi } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = (await getWhatsAppConfig()) || DEFAULT_WHATSAPP_CONFIG;
    const mode = config.mode || 'evolution';

    if (mode === 'evolution' || (!config.mode && config.instance)) {
      const baseUrl = (config.baseUrl || DEFAULT_WHATSAPP_CONFIG.baseUrl).replace(/\/+$/, '');
      const instance = config.instance || DEFAULT_WHATSAPP_CONFIG.instance;
      const apiKey = config.apiKey || DEFAULT_WHATSAPP_CONFIG.apiKey;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const state = data?.instance?.state || data?.state || 'open';
          const isReady = state === 'open' || state === 'connected';

          return NextResponse.json({
            isReady,
            state,
            mode: 'evolution',
            instance: instance,
            serverUrl: baseUrl,
            senderNumber: config.senderNumber || DEFAULT_WHATSAPP_CONFIG.senderNumber,
            raw: data,
            isError: false
          });
        } else {
          return NextResponse.json({
            isReady: false,
            state: 'disconnected',
            mode: 'evolution',
            status: res.status,
            isError: true,
            error: `API returned status ${res.status}`
          });
        }
      } catch (err) {
        return NextResponse.json({
          isReady: false,
          state: 'unreachable',
          mode: 'evolution',
          isError: true,
          error: err.name === 'AbortError' ? 'Connection timed out' : (err.message || 'Cannot reach server')
        });
      }
    }

    // Local Node Server Fallback
    try {
      const res = await fetch('http://127.0.0.1:3001/status', { cache: 'no-store' });
      if (!res.ok) {
        return NextResponse.json({ isReady: false, qr: null, mode: 'local', isError: true }, { status: 500 });
      }
      const data = await res.json();
      return NextResponse.json({ ...data, mode: 'local' });
    } catch (error) {
      return NextResponse.json({ isReady: false, qr: null, mode: 'local', isError: true }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ isReady: false, qr: null, isError: true, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { number, to, text, message } = body;

    const targetNumber = cleanPhoneForApi(number || to);
    const targetText = text || message;

    if (!targetNumber || !targetText) {
      return NextResponse.json({ error: 'Missing phone number or text message' }, { status: 400 });
    }

    const config = (await getWhatsAppConfig()) || DEFAULT_WHATSAPP_CONFIG;
    const isEnabled = config?.isEnabled !== false;

    if (!isEnabled) {
      return NextResponse.json({ error: 'WhatsApp integration is currently disabled' }, { status: 400 });
    }

    const baseUrl = (config.baseUrl || DEFAULT_WHATSAPP_CONFIG.baseUrl).replace(/\/+$/, '');
    const instance = config.instance || DEFAULT_WHATSAPP_CONFIG.instance;
    const apiKey = config.apiKey || DEFAULT_WHATSAPP_CONFIG.apiKey;

    const targetUrl = config.mode === 'custom' && config.apiUrl
      ? config.apiUrl
      : `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({ number: targetNumber, text: targetText }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const data = await response.json().catch(async () => {
      const txt = await response.text();
      return { raw: txt };
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data
    });
  } catch (error) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 });
  }
}
