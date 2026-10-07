/**
 * WhatsApp Hub Evolution API Client & Utilities
 * Supports Evolution API, BiteChez WhatsApp Hub, and Cyberlim WhatsApp Portal.
 */

export const DEFAULT_WHATSAPP_CONFIG = {
  baseUrl: 'https://whatsappapi-1n7u.onrender.com',
  instance: 'user_3k6gybzrauwohmso',
  apiKey: '429683C4C977415CAAFCCE10F7D57E11',
  senderNumber: '+919667623123',
  isEnabled: true,
  mode: 'evolution',
  apiUrl: 'https://whatsappapi-1n7u.onrender.com/message/sendText/user_3k6gybzrauwohmso'
};

export function sanitizeApiKey(key) {
  if (!key) return DEFAULT_WHATSAPP_CONFIG.apiKey;
  let cleaned = String(key).trim();
  if (cleaned.toLowerCase().startsWith('wapi_live_')) {
    cleaned = cleaned.substring('wapi_live_'.length);
  }
  return cleaned.toUpperCase();
}

export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

export function cleanPhoneForApi(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return '+' + cleaned;
}

export class WhatsAppHubClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || DEFAULT_WHATSAPP_CONFIG.baseUrl).replace(/\/+$/, '');
    this.instance = options.instance || DEFAULT_WHATSAPP_CONFIG.instance;
    this.apiKey = sanitizeApiKey(options.apiKey || DEFAULT_WHATSAPP_CONFIG.apiKey);
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey
    };
  }

  /**
   * Check connection status of active WhatsApp instance
   */
  async checkConnectionState() {
    const url = `${this.baseUrl}/instance/connectionState/${encodeURIComponent(this.instance)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, error: err.message || 'Connection timeout or network error' };
    }
  }

  /**
   * Send plain text message
   */
  async sendText(toPhone, text) {
    const formattedPhone = cleanPhoneForApi(toPhone);
    const url = `${this.baseUrl}/message/sendText/${encodeURIComponent(this.instance)}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          number: formattedPhone,
          text: String(text || '').trim()
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, error: err.message || 'Failed to send text message' };
    }
  }

  /**
   * Send Media (Image, Video, Audio, PDF Document)
   */
  async sendMedia({ toPhone, mediaUrl, caption = '', mediaType = 'image', fileName = '', mimeType = '' }) {
    const formattedPhone = cleanPhoneForApi(toPhone);
    const url = `${this.baseUrl}/message/sendMedia/${encodeURIComponent(this.instance)}`;

    let defaultMime = 'image/jpeg';
    let defaultFile = 'file.jpg';

    if (mediaType === 'document') {
      defaultMime = mimeType || 'application/pdf';
      defaultFile = fileName || 'document.pdf';
    } else if (mediaType === 'video') {
      defaultMime = mimeType || 'video/mp4';
      defaultFile = fileName || 'video.mp4';
    } else if (mediaType === 'audio') {
      defaultMime = mimeType || 'audio/mpeg';
      defaultFile = fileName || 'audio.mp3';
    } else {
      defaultMime = mimeType || 'image/jpeg';
      defaultFile = fileName || 'image.jpg';
    }

    const payload = {
      number: formattedPhone,
      mediatype: mediaType,
      mimetype: defaultMime,
      media: mediaUrl,
      caption: caption || '',
      fileName: fileName || defaultFile
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, error: err.message || 'Failed to send media' };
    }
  }

  /**
   * Verify if numbers are active WhatsApp accounts
   */
  async verifyNumbers(numbers = []) {
    const formattedNumbers = (Array.isArray(numbers) ? numbers : [numbers]).map(cleanPhoneForApi);
    const url = `${this.baseUrl}/chat/whatsappNumbers/${encodeURIComponent(this.instance)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ numbers: formattedNumbers }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, error: err.message || 'Failed to verify numbers' };
    }
  }
}
