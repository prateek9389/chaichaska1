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
  apiUrl: 'https://whatsappapi-1n7u.onrender.com/message/sendText/user_3k6gybzrauwohmso',
  autoSendPaymentQr: true,
  paymentQrDelaySec: 15,
  paymentQrCaption: `💳 *Scan & Pay via UPI | Chai Chaska*

Hi *{name}*,
Your order *{orderId}* is now *Preparing & Brewing fresh* in our kitchen! 🔥🫖

Please scan the UPI QR code above with any app (Paytm / Google Pay / PhonePe / BHIM) to complete your payment of *{amount}*.

📱 *Instant UPI Payment*
UPI ID: paytm.s2splxe@pty

After paying,Please send us the screenshot for verification then our brewmaster will update your order status to *Paid*. Thank you! 🫖✨`
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

async function safeFetchJson(url, options = {}, timeoutMs = 35000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timer);

    const rawText = await res.text();
    let data = null;
    if (rawText && rawText.trim()) {
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        const plainSummary = rawText.replace(/<[^>]*>?/gm, '').trim().slice(0, 140);
        return {
          ok: false,
          status: res.status,
          error: `WhatsApp Server returned status ${res.status}: ${plainSummary || 'Non-JSON response'}`
        };
      }
    } else {
      data = {};
    }

    if (!res.ok) {
      const errorMsg = data?.response?.message || data?.error || data?.message || `WhatsApp Server error (HTTP ${res.status})`;
      return { ok: false, status: res.status, error: errorMsg, data };
    }

    return { ok: true, status: res.status, data };
  } catch (err) {
    clearTimeout(timer);
    const isAbort = err.name === 'AbortError' || String(err.message || '').toLowerCase().includes('abort');
    return {
      ok: false,
      status: isAbort ? 504 : 500,
      error: isAbort
        ? 'WhatsApp server request timed out (server took too long to reply). Please retry.'
        : (err.message || 'WhatsApp network request failed')
    };
  }
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
  async checkConnectionState(targetInstance) {
    const inst = targetInstance || this.instance;
    const url = `${this.baseUrl}/instance/connectionState/${encodeURIComponent(inst)}`;
    return safeFetchJson(url, {
      method: 'GET',
      headers: this.getHeaders(),
      cache: 'no-store'
    }, 20000);
  }

  /**
   * Send plain text message
   */
  async sendText(toPhone, text) {
    const formattedPhone = cleanPhoneForApi(toPhone);
    const url = `${this.baseUrl}/message/sendText/${encodeURIComponent(this.instance)}`;

    return safeFetchJson(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        number: formattedPhone,
        text: String(text || '').trim()
      })
    }, 35000);
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

    return safeFetchJson(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    }, 45000);
  }

  /**
   * Verify if numbers are active WhatsApp accounts
   */
  async verifyNumbers(numbers = []) {
    const formattedNumbers = (Array.isArray(numbers) ? numbers : [numbers]).map(cleanPhoneForApi);
    const url = `${this.baseUrl}/chat/whatsappNumbers/${encodeURIComponent(this.instance)}`;

    return safeFetchJson(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ numbers: formattedNumbers })
    }, 25000);
  }

  /**
   * Connect to instance and obtain live WhatsApp login QR code
   */
  async getQrCode(targetInstance) {
    const inst = targetInstance || this.instance;
    // 1. First check if instance is already open/connected
    const conn = await this.checkConnectionState(inst);
    if (conn.ok && (conn.data?.instance?.state === 'open' || conn.data?.instance?.state === 'connected')) {
      return { ok: true, isConnected: true, data: conn.data };
    }

    // 2. If not connected, request QR code from connect endpoint
    const url = `${this.baseUrl}/instance/connect/${encodeURIComponent(inst)}`;
    return safeFetchJson(url, {
      method: 'GET',
      headers: this.getHeaders(),
      cache: 'no-store'
    }, 35000);
  }

  /**
   * Scan and fetch all instances registered on the Evolution API server
   */
  async fetchInstances() {
    const url = `${this.baseUrl}/instance/fetchInstances`;
    return safeFetchJson(url, {
      method: 'GET',
      headers: this.getHeaders(),
      cache: 'no-store'
    }, 25000);
  }

  /**
   * Restart an instance
   */
  async restartInstance(targetInstance) {
    const inst = targetInstance || this.instance;
    const url = `${this.baseUrl}/instance/restart/${encodeURIComponent(inst)}`;
    return safeFetchJson(url, {
      method: 'POST',
      headers: this.getHeaders()
    }, 30000);
  }

  /**
   * Logout from WhatsApp on the specified instance
   */
  async logoutInstance(targetInstance) {
    const inst = targetInstance || this.instance;
    const url = `${this.baseUrl}/instance/logout/${encodeURIComponent(inst)}`;
    return safeFetchJson(url, {
      method: 'DELETE',
      headers: this.getHeaders()
    }, 30000);
  }

  /**
   * Delete an instance
   */
  async deleteInstance(targetInstance) {
    const inst = targetInstance || this.instance;
    const url = `${this.baseUrl}/instance/delete/${encodeURIComponent(inst)}`;
    return safeFetchJson(url, {
      method: 'DELETE',
      headers: this.getHeaders()
    }, 30000);
  }

  /**
   * Create a new instance and obtain live QR code
   */
  async createInstance(newInstanceName) {
    const targetName = String(newInstanceName || this.instance).trim();
    const url = `${this.baseUrl}/instance/create`;
    const res = await safeFetchJson(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        instanceName: targetName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    }, 35000);

    if (res.ok && res.data) {
      const qrcodeData = res.data.qrcode || {};
      const base64 = qrcodeData.base64 || res.data.base64 || null;
      const pairingCode = qrcodeData.pairingCode || null;
      const instName = res.data.instance?.instanceName || res.data.instance?.name || targetName;
      return {
        ...res,
        data: {
          ...res.data,
          instanceName: instName,
          base64,
          pairingCode
        }
      };
    }
    return res;
  }
}
