import PDFDocument from 'pdfkit';
import { getWhatsAppConfig } from '@/lib/firestore';
import { DEFAULT_WHATSAPP_CONFIG, cleanPhoneForApi } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * Generate a comprehensive, multi-section executive PDF report buffer using PDFKit
 */
function generateStatsPdfBuffer({ filterInfo, stats = {}, customNote = '', generatedAt }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        info: {
          Title: `Chai Chaska Order & Revenue Report - ${filterInfo}`,
          Author: 'Chai Chaska Brewmaster Terminal',
          Subject: 'Executive Sales & Operations Statistics',
          CreationDate: new Date()
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const pageWidth = 595.28;
      const contentWidth = pageWidth - 72; // 523.28
      const left = 36;
      let y = 36;

      // -------------------------------------------------------------
      // 1. BRAND HEADER & REPORT METADATA
      // -------------------------------------------------------------
      doc.rect(left, y, contentWidth, 70).fill('#2C1B0D');

      doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold');
      doc.text('CHAI CHASKA', left + 18, y + 14);

      doc.fillColor('#F59E0B').fontSize(9.5).font('Helvetica-Bold');
      doc.text('EXECUTIVE REVENUE & OPERATIONS ANALYTICS REPORT', left + 18, y + 42);

      // Right side metadata
      doc.fillColor('#FDE68A').fontSize(8.5).font('Helvetica');
      doc.text(`Period: ${filterInfo || 'All Orders'}`, left + contentWidth - 220, y + 15, { width: 205, align: 'right' });
      doc.fillColor('#CBD5E1').fontSize(8).font('Helvetica');
      doc.text(`Generated: ${generatedAt || new Date().toLocaleString('en-IN')}`, left + contentWidth - 220, y + 30, { width: 205, align: 'right' });
      doc.text('Terminal: Brewmaster Dashboard', left + contentWidth - 220, y + 44, { width: 205, align: 'right' });

      y += 80;

      // Custom Note if any
      if (customNote && customNote.trim()) {
        doc.rect(left, y, contentWidth, 24).fill('#FEF3C7').stroke('#FDE68A');
        doc.fillColor('#92400E').fontSize(8.5).font('Helvetica-Bold');
        doc.text(`Note from Brewmaster: ${customNote.trim()}`, left + 10, y + 7, { width: contentWidth - 20 });
        y += 32;
      }

      // Extract Core Values
      const totalRev = Number(stats.totalRevenue) || 0;
      const totalOrd = Number(stats.totalOrders) || 0;
      const deliveredOrd = Number(stats.deliveredCount) || 0;
      const totalCups = Number(stats.totalItems) || 0;
      const prepOrd = Number(stats.preparingCount) || 0;
      const aov = Number(stats.aov) || (totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0);
      const avgCupPrice = Number(stats.avgCupPrice) || (totalCups > 0 ? Math.round(totalRev / totalCups) : 0);

      const pmt = stats.paymentBreakdown || {};
      const ch = stats.channelBreakdown || {};
      const onlineOrd = Number(ch.onlineOrders) || 0;
      const onlineRev = Number(ch.onlineRevenue) || 0;
      const offlineOrd = Number(ch.offlineOrders) || 0;
      const offlineRev = Number(ch.offlineRevenue) || 0;
      const upiRev = Number(pmt.upiRevenue) || onlineRev;
      const cashRev = Number(pmt.cashRevenue) || offlineRev;
      const paidRev = Number(pmt.paidRevenue) || (deliveredOrd > 0 ? totalRev : 0);

      const deliveredRate = totalOrd > 0 ? Math.round((deliveredOrd / totalOrd) * 100) : 0;

      // -------------------------------------------------------------
      // 2. 6-KPI EXECUTIVE TILES (2 Rows x 3 Columns)
      // -------------------------------------------------------------
      const cardW3 = (contentWidth - 16) / 3;
      const cardH = 50;

      const kpisRow1 = [
        { label: 'TOTAL SALES REVENUE', value: `Rs. ${totalRev.toLocaleString('en-IN')}`, sub: `${totalOrd} total orders`, bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', subColor: '#3B82F6' },
        { label: 'AVG ORDER VALUE (AOV)', value: `Rs. ${aov.toLocaleString('en-IN')}`, sub: `Rs. ${avgCupPrice} avg per cup`, bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', subColor: '#16A34A' },
        { label: 'TOTAL CUPS / ITEMS', value: `${totalCups} cups`, sub: `${(stats.topProducts || []).length} unique items`, bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', subColor: '#D97706' }
      ];

      kpisRow1.forEach((kpi, idx) => {
        const cx = left + idx * (cardW3 + 8);
        doc.rect(cx, y, cardW3, cardH).fill(kpi.bg).stroke(kpi.border);

        doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold');
        doc.text(kpi.label, cx + 10, y + 7);

        doc.fillColor(kpi.text).fontSize(14).font('Helvetica-Bold');
        doc.text(kpi.value, cx + 10, y + 19);

        doc.fillColor(kpi.subColor).fontSize(7.5).font('Helvetica');
        doc.text(kpi.sub, cx + 10, y + 36);
      });

      y += cardH + 8;

      const kpisRow2 = [
        { label: 'DELIVERED RATE', value: `${deliveredRate}% (${deliveredOrd})`, sub: `${prepOrd} currently active`, bg: '#FAF5FF', border: '#E9D5FF', text: '#6B21A8', subColor: '#9333EA' },
        { label: 'UPI / DIGITAL SALES', value: `Rs. ${upiRev.toLocaleString('en-IN')}`, sub: `${Number(pmt.upiOrders) || onlineOrd} online payments`, bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1', subColor: '#0284C7' },
        { label: 'COUNTER CASH SALES', value: `Rs. ${cashRev.toLocaleString('en-IN')}`, sub: `${Number(pmt.cashOrders) || offlineOrd} counter walk-ins`, bg: '#F8FAFC', border: '#CBD5E1', text: '#334155', subColor: '#64748B' }
      ];

      kpisRow2.forEach((kpi, idx) => {
        const cx = left + idx * (cardW3 + 8);
        doc.rect(cx, y, cardW3, cardH).fill(kpi.bg).stroke(kpi.border);

        doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold');
        doc.text(kpi.label, cx + 10, y + 7);

        doc.fillColor(kpi.text).fontSize(13.5).font('Helvetica-Bold');
        doc.text(kpi.value, cx + 10, y + 19);

        doc.fillColor(kpi.subColor).fontSize(7.5).font('Helvetica');
        doc.text(kpi.sub, cx + 10, y + 36);
      });

      y += cardH + 12;

      // -------------------------------------------------------------
      // 3. FINANCIAL & CHANNEL BREAKDOWN STATION
      // -------------------------------------------------------------
      doc.rect(left, y, contentWidth, 36).fill('#F8FAFC').stroke('#E2E8F0');

      doc.fillColor('#1E293B').fontSize(8).font('Helvetica-Bold');
      doc.text('CHANNEL SPLIT:', left + 10, y + 8);

      const onlineShare = totalRev > 0 ? Math.round((onlineRev / totalRev) * 100) : 0;
      const offlineShare = totalRev > 0 ? (100 - onlineShare) : 0;

      doc.font('Helvetica').fontSize(8).fillColor('#334155');
      doc.text(`Online App Orders: ${onlineOrd} (Rs. ${onlineRev.toLocaleString('en-IN')} • ${onlineShare}%)`, left + 90, y + 8);
      doc.text(`Counter Walk-in: ${offlineOrd} (Rs. ${offlineRev.toLocaleString('en-IN')} • ${offlineShare}%)`, left + 280, y + 8);

      doc.fillColor('#15803D').fontSize(8).font('Helvetica-Bold');
      doc.text(`Paid Collection: Rs. ${paidRev.toLocaleString('en-IN')}`, left + 90, y + 21);
      doc.fillColor('#64748B').fontSize(8).font('Helvetica');
      doc.text(`Avg Revenue Per Cup: Rs. ${avgCupPrice}  •  Overall AOV: Rs. ${aov}`, left + 280, y + 21);

      y += 46;

      // -------------------------------------------------------------
      // 4. TOP SELLING PRODUCTS & REVENUE CONTRIBUTION TABLE
      // -------------------------------------------------------------
      doc.fillColor('#2C1B0D').fontSize(10.5).font('Helvetica-Bold');
      doc.text('ITEMIZED PRODUCT SALES & REVENUE CONTRIBUTION', left, y);
      y += 12;

      const topProducts = Array.isArray(stats.topProducts) ? stats.topProducts.slice(0, 12) : [];
      
      // Table Header
      const thY = y;
      doc.rect(left, thY, contentWidth, 18).fill('#2C1B0D');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      doc.text('#', left + 8, thY + 5);
      doc.text('PRODUCT / CHAI VARIANT', left + 28, thY + 5);
      doc.text('CUPS SOLD', left + 260, thY + 5, { width: 55, align: 'right' });
      doc.text('UNIT AVG (Rs.)', left + 325, thY + 5, { width: 55, align: 'right' });
      doc.text('REVENUE (Rs.)', left + 390, thY + 5, { width: 65, align: 'right' });
      doc.text('% SHARE', left + 465, thY + 5, { width: 45, align: 'right' });
      y += 18;

      if (topProducts.length === 0) {
        doc.rect(left, y, contentWidth, 22).fill('#FFFFFF').stroke('#E2E8F0');
        doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text('No product sales recorded in this period.', left + 12, y + 6);
        y += 26;
      } else {
        topProducts.forEach((item, i) => {
          const rowY = y;
          const isEven = i % 2 === 0;
          doc.rect(left, rowY, contentWidth, 16).fill(isEven ? '#FFFFFF' : '#F8FAFC').stroke('#F1F5F9');

          const sharePct = totalRev > 0 ? ((item.revenue / totalRev) * 100).toFixed(1) : '0.0';
          const itemAvgPrice = item.qty > 0 ? Math.round(item.revenue / item.qty) : 0;

          doc.fillColor('#64748B').fontSize(7.5).font('Helvetica');
          doc.text(String(i + 1), left + 8, rowY + 4);

          doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold');
          doc.text(String(item.name || 'Special Chai').slice(0, 38), left + 28, rowY + 4);

          doc.fillColor('#0284C7').fontSize(7.5).font('Helvetica-Bold');
          doc.text(`${item.qty || 0}`, left + 260, rowY + 4, { width: 55, align: 'right' });

          doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
          doc.text(`Rs. ${itemAvgPrice}`, left + 325, rowY + 4, { width: 55, align: 'right' });

          doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold');
          doc.text(`Rs. ${(item.revenue || 0).toLocaleString('en-IN')}`, left + 390, rowY + 4, { width: 65, align: 'right' });

          doc.fillColor('#64748B').fontSize(7.5).font('Helvetica');
          doc.text(`${sharePct}%`, left + 465, rowY + 4, { width: 45, align: 'right' });

          y += 16;
        });
        y += 10;
      }

      // -------------------------------------------------------------
      // 5. DAILY REVENUE TIMELINE & TOP LOCATIONS
      // -------------------------------------------------------------
      const dailyBreakdown = Array.isArray(stats.dailyBreakdown) ? stats.dailyBreakdown.slice(0, 5) : [];
      const locationBreakdown = Array.isArray(stats.locationBreakdown) ? stats.locationBreakdown.slice(0, 4) : [];

      if (y < 670 && (dailyBreakdown.length > 0 || locationBreakdown.length > 0)) {
        const colW = (contentWidth - 12) / 2;

        // LEFT: Daily Table
        doc.fillColor('#2C1B0D').fontSize(10).font('Helvetica-Bold');
        doc.text('DAILY REVENUE TIMELINE', left, y);

        // RIGHT: Locations Header
        doc.text('TOP DELIVERY DESKS & LOCATIONS', left + colW + 12, y);
        y += 12;

        const subTableY = y;

        // Daily Header
        doc.rect(left, subTableY, colW, 16).fill('#334155');
        doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
        doc.text('DATE', left + 8, subTableY + 4);
        doc.text('ORDERS', left + 100, subTableY + 4, { width: 45, align: 'right' });
        doc.text('SALES (Rs.)', left + 155, subTableY + 4, { width: 90, align: 'right' });

        // Location Header
        doc.rect(left + colW + 12, subTableY, colW, 16).fill('#334155');
        doc.fillColor('#FFFFFF').fontSize(7.5).font('Helvetica-Bold');
        doc.text('LOCATION / DESK', left + colW + 20, subTableY + 4);
        doc.text('ORDERS', left + colW + 140, subTableY + 4, { width: 45, align: 'right' });
        doc.text('REVENUE (Rs.)', left + colW + 195, subTableY + 4, { width: 55, align: 'right' });

        let dailyY = subTableY + 16;
        dailyBreakdown.forEach((d, idx) => {
          const isEven = idx % 2 === 0;
          doc.rect(left, dailyY, colW, 14).fill(isEven ? '#FFFFFF' : '#F8FAFC').stroke('#F1F5F9');
          doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(String(d.date || '-'), left + 8, dailyY + 3);
          doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica-Bold').text(String(d.count || 0), left + 100, dailyY + 3, { width: 45, align: 'right' });
          doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold').text(`Rs. ${(d.revenue || 0).toLocaleString('en-IN')}`, left + 155, dailyY + 3, { width: 90, align: 'right' });
          dailyY += 14;
        });

        let locY = subTableY + 16;
        locationBreakdown.forEach((l, idx) => {
          const isEven = idx % 2 === 0;
          doc.rect(left + colW + 12, locY, colW, 14).fill(isEven ? '#FFFFFF' : '#F8FAFC').stroke('#F1F5F9');
          doc.fillColor('#334155').fontSize(7.5).font('Helvetica-Bold').text(String(l.location || 'Desk Delivery').slice(0, 18), left + colW + 20, locY + 3);
          doc.fillColor('#0F172A').fontSize(7.5).font('Helvetica').text(String(l.count || 0), left + colW + 140, locY + 3, { width: 45, align: 'right' });
          doc.fillColor('#15803D').fontSize(7.5).font('Helvetica-Bold').text(`Rs. ${(l.revenue || 0).toLocaleString('en-IN')}`, left + colW + 195, locY + 3, { width: 55, align: 'right' });
          locY += 14;
        });

        y = Math.max(dailyY, locY) + 12;
      }

      // -------------------------------------------------------------
      // 6. OFFICIAL FOOTER STAMP
      // -------------------------------------------------------------
      const bottomY = 790;
      doc.moveTo(left, bottomY).lineTo(left + contentWidth, bottomY).strokeColor('#E2E8F0').stroke();

      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica');
      doc.text('Chai Chaska • Authentic Karak Masala Chai, Premium Snacks & Fast Desk Delivery', left, bottomY + 6);
      doc.text('Confidential Store Report • Generated via Chai Chaska Brewmaster Terminal', left + contentWidth - 250, bottomY + 6, { width: 250, align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * API ROUTE:
 * POST /api/send-stats-pdf
 * Body: { to, filterInfo, stats, customNote, downloadOnly }
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { to, filterInfo = 'Custom Period', stats = {}, customNote = '', downloadOnly = false } = body;

    const generatedAt = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // 1. Generate the PDF Buffer
    const pdfBuffer = await generateStatsPdfBuffer({
      filterInfo,
      stats,
      customNote,
      generatedAt
    });

    // 2. If client just wants to download or preview the file directly:
    if (downloadOnly) {
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Chai_Chaska_Stats_${Date.now()}.pdf"`,
          'Content-Length': String(pdfBuffer.length)
        }
      });
    }

    // 3. Otherwise: Send via WhatsApp to recipient
    if (!to || !String(to).trim()) {
      return Response.json({ error: 'Recipient phone number is required to send stats PDF.' }, { status: 400 });
    }

    const formattedTo = cleanPhoneForApi(to);
    if (!formattedTo) {
      return Response.json({ error: 'Invalid recipient phone number format.' }, { status: 400 });
    }

    // Load WhatsApp Server Config
    const config = await getWhatsAppConfig();
    const baseUrl = (config?.baseUrl || DEFAULT_WHATSAPP_CONFIG.baseUrl).replace(/\/+$/, '');
    const instance = config?.instance || DEFAULT_WHATSAPP_CONFIG.instance;
    const apiKey = config?.apiKey || DEFAULT_WHATSAPP_CONFIG.apiKey;

    const totalRev = Number(stats.totalRevenue) || 0;
    const totalOrd = Number(stats.totalOrders) || 0;
    const deliveredOrd = Number(stats.deliveredCount) || 0;
    const prepOrd = Number(stats.preparingCount) || 0;
    const totalCups = Number(stats.totalItems) || 0;
    const aov = Number(stats.aov) || (totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0);
    const avgCupPrice = Number(stats.avgCupPrice) || (totalCups > 0 ? Math.round(totalRev / totalCups) : 0);

    const ch = stats.channelBreakdown || {};
    const onlineOrd = Number(ch.onlineOrders) || 0;
    const onlineRev = Number(ch.onlineRevenue) || 0;
    const offlineOrd = Number(ch.offlineOrders) || 0;
    const offlineRev = Number(ch.offlineRevenue) || 0;

    const pmt = stats.paymentBreakdown || {};
    const upiRev = Number(pmt.upiRevenue) || onlineRev;
    const upiOrd = Number(pmt.upiOrders) || onlineOrd;
    const cashRev = Number(pmt.cashRevenue) || offlineRev;
    const cashOrd = Number(pmt.cashOrders) || offlineOrd;
    const paidRev = Number(pmt.paidRevenue) || (deliveredOrd > 0 ? totalRev : 0);
    const pendingRev = Number(pmt.pendingRevenue) || 0;

    const onlineShare = totalRev > 0 ? Math.round((onlineRev / totalRev) * 100) : 0;
    const offlineShare = totalRev > 0 ? (100 - onlineShare) : 0;
    const deliveredRate = totalOrd > 0 ? Math.round((deliveredOrd / totalOrd) * 100) : 0;
    const paidRate = totalRev > 0 ? Math.round((paidRev / totalRev) * 100) : 100;

    const topItems = (stats.topProducts || []).slice(0, 6);
    const topSummary = topItems.length > 0
      ? topItems.map((it, i) => `  ${i + 1}. *${it.name}* • ${it.qty} cups • *₹${(it.revenue || 0).toLocaleString('en-IN')}*`).join('\n')
      : '  No products recorded.';

    const topLocs = (stats.locationBreakdown || []).slice(0, 4);
    const locSummary = topLocs.length > 0
      ? topLocs.map(l => `  📍 *${l.location}*: ${l.count} orders (₹${(l.revenue || 0).toLocaleString('en-IN')})`).join('\n')
      : '';

    // Comprehensive WhatsApp Message Caption with Complete Information
    const caption = `📊 *CHAI CHASKA | COMPLETE OPERATIONS & REVENUE REPORT*
📅 *Period:* ${filterInfo}
🕒 *Generated:* ${generatedAt}
${customNote ? `\n📝 *Brewmaster Note:* ${customNote}` : ''}
━━━━━━━━━━━━━━━━━━━━
💰 *FINANCIAL & REVENUE TOTALS*
• *Total Sales Revenue:* *₹${totalRev.toLocaleString('en-IN')}*
• *Average Order Value (AOV):* ₹${aov.toLocaleString('en-IN')}
• *Average Revenue / Cup:* ₹${avgCupPrice}
• *Paid Revenue:* ₹${paidRev.toLocaleString('en-IN')} (${paidRate}%)
${pendingRev > 0 ? `• *Pending Collection:* ₹${pendingRev.toLocaleString('en-IN')}\n` : ''}
💳 *PAYMENT METHODS SPLIT*
• 📲 *UPI / Digital:* ₹${upiRev.toLocaleString('en-IN')} (${upiOrd} orders)
• 💵 *Cash at Counter:* ₹${cashRev.toLocaleString('en-IN')} (${cashOrd} orders)

📈 *CHANNELS BREAKDOWN*
• 📱 *Online Desk Delivery:* ${onlineOrd} orders • ₹${onlineRev.toLocaleString('en-IN')} (${onlineShare}%)
• 🏪 *Counter Walk-in:* ${offlineOrd} orders • ₹${offlineRev.toLocaleString('en-IN')} (${offlineShare}%)

📦 *ORDER FULFILLMENT & VOLUME*
• *Total Orders Placed:* ${totalOrd}
• *Delivered Successfully:* ${deliveredOrd} (${deliveredRate}%)
• *In Prep / Queue:* ${prepOrd} orders
• *Total Cups / Items Sold:* *${totalCups} cups*

🏆 *TOP SELLING BEVERAGES (BY VOLUME & REVENUE)*
${topSummary}
${locSummary ? `\n🏢 *TOP DELIVERY LOCATIONS*\n${locSummary}` : ''}
━━━━━━━━━━━━━━━━━━━━
📎 *Attached Document:* Full executive PDF report with product tallies & daily revenue timelines.
_Dispatched via Chai Chaska Brewmaster Terminal_ 🫖✨`;

    // Convert PDF buffer to Base64
    const pdfBase64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const cleanFileName = `Chai_Chaska_Stats_${String(filterInfo).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    const mediaUrl = `${baseUrl}/message/sendMedia/${encodeURIComponent(instance)}`;
    const mediaRes = await fetch(mediaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: formattedTo,
        mediatype: 'document',
        mimetype: 'application/pdf',
        media: pdfBase64,
        caption: caption,
        fileName: cleanFileName
      })
    });

    const mediaData = await mediaRes.json().catch(() => ({ success: mediaRes.ok }));

    if (!mediaRes.ok && !mediaData?.success) {
      return Response.json({
        error: mediaData?.response?.message || mediaData?.error || 'Failed to dispatch PDF via WhatsApp Evolution API',
        data: mediaData
      }, { status: mediaRes.status || 500 });
    }

    return Response.json({
      success: true,
      message: `✅ Full stats & revenue PDF report successfully delivered to ${formattedTo}!`,
      to: formattedTo,
      filterInfo,
      data: mediaData
    });
  } catch (error) {
    console.error('Error in /api/send-stats-pdf:', error);
    return Response.json({ error: error.message || 'Internal server error while generating or sending stats PDF' }, { status: 500 });
  }
}
