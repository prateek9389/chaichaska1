import { NextResponse } from 'next/server';
import { WhatsAppHubClient, cleanPhoneForApi } from '@/lib/whatsapp';
import { getWhatsAppConfig } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      action, // 'sendText' | 'sendMedia' | 'verifyNumber' | 'checkStatus'
      baseUrl,
      instance,
      apiKey,
      number,
      text,
      mediaUrl,
      caption,
      mediaType,
      fileName,
      mimeType,
      numbers
    } = body;

    // Use parameters from request if provided (allows real-time testing of unstored inputs),
    // otherwise fallback to saved Firestore config
    const savedConfig = (await getWhatsAppConfig()) || {};
    const effectiveBaseUrl = baseUrl || savedConfig.baseUrl || 'https://whatsappapi-1n7u.onrender.com';
    const effectiveInstance = instance || savedConfig.instance || 'user_3k6gybzrauwohmso';
    const effectiveApiKey = apiKey || savedConfig.apiKey || 'wapi_live_429683c4c977415caafcce10f7d57e11';

    const client = new WhatsAppHubClient({
      baseUrl: effectiveBaseUrl,
      instance: effectiveInstance,
      apiKey: effectiveApiKey
    });

    const startTime = Date.now();

    if (action === 'checkStatus') {
      const result = await client.checkConnectionState();
      const latencyMs = Date.now() - startTime;
      return NextResponse.json({
        action: 'checkStatus',
        latencyMs,
        ...result
      });
    }

    if (action === 'sendText') {
      if (!number || !text) {
        return NextResponse.json({ ok: false, error: 'Recipient number and text message are required' }, { status: 400 });
      }

      const result = await client.sendText(number, text);
      const latencyMs = Date.now() - startTime;
      return NextResponse.json({
        action: 'sendText',
        number: cleanPhoneForApi(number),
        latencyMs,
        ...result
      });
    }

    if (action === 'sendMedia') {
      if (!number || !mediaUrl) {
        return NextResponse.json({ ok: false, error: 'Recipient number and media URL are required' }, { status: 400 });
      }

      const result = await client.sendMedia({
        toPhone: number,
        mediaUrl,
        caption,
        mediaType: mediaType || 'image',
        fileName,
        mimeType
      });
      const latencyMs = Date.now() - startTime;
      return NextResponse.json({
        action: 'sendMedia',
        number: cleanPhoneForApi(number),
        latencyMs,
        ...result
      });
    }

    if (action === 'verifyNumber') {
      const targetNumbers = numbers && numbers.length > 0 ? numbers : [number];
      if (!targetNumbers || targetNumbers.filter(Boolean).length === 0) {
        return NextResponse.json({ ok: false, error: 'At least one phone number is required' }, { status: 400 });
      }

      const result = await client.verifyNumbers(targetNumbers);
      const latencyMs = Date.now() - startTime;
      return NextResponse.json({
        action: 'verifyNumber',
        latencyMs,
        ...result
      });
    }

    return NextResponse.json({ ok: false, error: `Unsupported test action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error('WhatsApp Test API Error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
