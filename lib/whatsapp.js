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

  /**
   * Connect to instance and obtain live WhatsApp login QR code
   */
  async getQrCode(targetInstance) {
    const inst = targetInstance || this.instance;
    const url = `${this.baseUrl}/instance/connect/${encodeURIComponent(inst)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

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
      return { ok: false, error: err.message || 'Failed to fetch QR code from WhatsApp server' };
    }
  }

  /**
   * Scan and fetch all instances registered on the Evolution API server
   */
  async fetchInstances() {
    const url = `${this.baseUrl}/instance/fetchInstances`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

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
      return { ok: false, error: err.message || 'Failed to fetch instances from WhatsApp server' };
    }
  }

  /**
   * Restart an instance
   */
  async restartInstance(targetInstance) {
    const inst = targetInstance || this.instance;
    const url = `${this.baseUrl}/instance/restart/${encodeURIComponent(inst)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, error: err.message || 'Failed to restart WhatsApp instance' };
    }
  }

  /**
   * Logout from WhatsApp on the specified instance
   */
  async logoutInstance(targetInstance) {
    const inst = targetInstance || this.instance;
    const url = `${this.baseUrl}/instance/logout/${encodeURIComponent(inst)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, error: err.message || 'Failed to logout WhatsApp instance' };
    }
  }

  /**
   * Delete an instance
   */
  async deleteInstance(targetInstance) {
    const inst = targetInstance || this.instance;
    const url = `${this.baseUrl}/instance/delete/${encodeURIComponent(inst)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, error: err.message || 'Failed to delete instance' };
    }
  }

  /**
   * Create a new instance
   */
  async createInstance(newInstanceName) {
    const url = `${this.baseUrl}/instance/create`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          instanceName: String(newInstanceName || this.instance).trim(),
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      clearTimeout(timeout);
      return { ok: false, error: err.message || 'Failed to create instance' };
    }
  }
}
