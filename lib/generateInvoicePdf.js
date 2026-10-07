import PDFDocument from 'pdfkit';

/**
 * Generate a beautifully styled Chai Chaska Tax Invoice PDF buffer
 * with precise item prices, quantities, and totals.
 */
export async function generateInvoicePdfBuffer(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const primaryColor = '#2c1b0d'; // Warm Espresso Dark
      const accentColor = '#d97706';  // Warm Amber
      const textColor = '#334155';    // Slate Gray
      const lightBg = '#fdf8f4';      // Warm Cream Tint

      const orderId = order.orderId || order.id || 'ID-00001';
      const customerName = order.customer || order.customerName || order.address?.firstName || 'Valued Customer';
      const location = order.office || order.address || order.location || 'Desk Delivery';
      const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const orderTime = new Date(order.createdAt || Date.now()).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // 1. TOP HEADER BRAND BANNER
      doc.rect(40, 40, 515, 75).fill(primaryColor);

      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
         .text('CHAI CHASKA', 60, 56);

      doc.fillColor('#fde68a').fontSize(10).font('Helvetica')
         .text('Corporate Desk Chai & Authentic Brews', 60, 82);

      doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
         .text('TAX INVOICE', 420, 58, { align: 'right', width: 120 });

      doc.fillColor('#cbd5e1').fontSize(9).font('Helvetica')
         .text(`Original for Recipient`, 420, 78, { align: 'right', width: 120 });

      // 2. INVOICE META & CUSTOMER DETAILS
      doc.rect(40, 125, 515, 80).fill(lightBg).stroke('#e2e8f0');

      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
         .text('Billed To (Customer):', 55, 138);

      doc.fillColor(textColor).fontSize(11).font('Helvetica-Bold')
         .text(customerName, 55, 153);

      doc.fillColor(textColor).fontSize(9).font('Helvetica')
         .text(`Destination: ${location}`, 55, 168)
         .text(`Phone: ${order.phone || 'N/A'}`, 55, 182);

      // Meta Right Column
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
         .text('Invoice Details:', 340, 138);

      doc.fillColor(textColor).fontSize(9).font('Helvetica')
         .text(`Invoice No: INV-${String(orderId).replace('#', '')}`, 340, 153)
         .text(`Order Date: ${orderDate} at ${orderTime}`, 340, 168)
         .text(`Payment: ${order.paymentMethod || 'Cash on Delivery'} (${order.paymentStatus || 'Paid'})`, 340, 182);

      // 3. TABLE HEADER (5 COLUMNS)
      let tableTop = 225;
      doc.rect(40, tableTop, 515, 26).fill(accentColor);

      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
         .text('ITEM DESCRIPTION', 55, tableTop + 8)
         .text('CUSTOMIZATION', 235, tableTop + 8)
         .text('QTY', 345, tableTop + 8, { width: 35, align: 'center' })
         .text('PRICE', 390, tableTop + 8, { width: 60, align: 'right' })
         .text('AMOUNT', 460, tableTop + 8, { width: 80, align: 'right' });

      // 4. PARSE ITEMS & ACCURATE ITEM PRICING
      let currentY = tableTop + 26;
      let rawItems = [];

      const itemsList = order.itemsList || order.items;

      if (Array.isArray(itemsList) && itemsList.length > 0) {
        rawItems = itemsList.map(it => {
          const qty = parseInt(it.quantity, 10) || 1;
          const rawPrice = it.price !== undefined ? it.price : (it.priceNum !== undefined ? it.priceNum : null);
          let unitPrice = 0;
          if (rawPrice !== null) {
            unitPrice = parseFloat(String(rawPrice).replace(/[^\d.]/g, '')) || 0;
          }
          return {
            name: it.name || it.item || 'Chai Chaska Special',
            sugar: it.sugar || order.sugar || 'Regular',
            quantity: qty,
            unitPrice: unitPrice
          };
        });
      } else if (order.item || order.items) {
        const itemStr = typeof order.item === 'string' ? order.item : (typeof order.items === 'string' ? order.items : '');
        const itemNames = itemStr.split('+').map(s => s.trim()).filter(Boolean);
        
        rawItems = itemNames.map(name => {
          const qtyMatch = name.match(/x(\d+)/i);
          const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
          const cleanName = name.replace(/x\d+/i, '').trim();
          return {
            name: cleanName || 'Kadak Chai',
            sugar: order.sugar || 'Regular',
            quantity: qty,
            unitPrice: 0
          };
        });
      }

      if (rawItems.length === 0) {
        rawItems = [{ name: 'Chai Chaska Special Kadak Chai', sugar: 'Regular', quantity: 1, unitPrice: 0 }];
      }

      // Total order amount parsing
      const orderTotalNum = parseFloat(String(order.total || order.price || order.totalAmount || '0').replace(/[^\d.]/g, '')) || 0;

      // If unit prices are 0 (e.g. from plain string), calculate unit price proportionally from total
      const totalQty = rawItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
      let calculatedSubtotal = 0;

      rawItems.forEach(it => {
        if (it.unitPrice <= 0 && orderTotalNum > 0 && totalQty > 0) {
          it.unitPrice = Math.round(orderTotalNum / totalQty);
        }
        it.total = it.unitPrice * (it.quantity || 1);
        calculatedSubtotal += it.total;
      });

      // If calculated subtotal differs from final total due to rounding, align subtotal
      const finalSubtotal = calculatedSubtotal > 0 ? calculatedSubtotal : orderTotalNum;
      const finalGrandTotal = orderTotalNum > 0 ? orderTotalNum : finalSubtotal;
      const discountNum = Math.max(0, finalSubtotal - finalGrandTotal);

      // Render Table Rows
      rawItems.forEach((it, idx) => {
        const isEven = idx % 2 === 0;
        doc.rect(40, currentY, 515, 28).fill(isEven ? '#ffffff' : '#f8fafc').stroke('#f1f5f9');

        const itemName = it.name;
        const custom = it.sugar ? `Sugar: ${it.sugar}` : 'Standard Recipe';
        const qty = it.quantity || 1;
        const priceFormatted = `₹${it.unitPrice.toFixed(0)}`;
        const amountFormatted = `₹${it.total.toFixed(0)}`;

        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
           .text(itemName, 55, currentY + 9, { width: 175, ellipsis: true });

        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica')
           .text(custom, 235, currentY + 9, { width: 105, ellipsis: true });

        doc.fillColor(textColor).fontSize(9).font('Helvetica')
           .text(String(qty), 345, currentY + 9, { width: 35, align: 'center' });

        doc.fillColor(textColor).fontSize(9).font('Helvetica')
           .text(priceFormatted, 390, currentY + 9, { width: 60, align: 'right' });

        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold')
           .text(amountFormatted, 460, currentY + 9, { width: 80, align: 'right' });

        currentY += 28;
      });

      // 5. TOTALS SUMMARY BOX
      currentY += 15;

      doc.rect(320, currentY, 235, discountNum > 0 ? 88 : 74).fill(lightBg).stroke('#e2e8f0');

      doc.fillColor(textColor).fontSize(9).font('Helvetica')
         .text('Subtotal:', 335, currentY + 10)
         .text(`₹${finalSubtotal.toFixed(0)}`, 450, currentY + 10, { width: 90, align: 'right' });

      let summaryOffset = 26;
      if (discountNum > 0) {
        doc.fillColor('#16a34a').fontSize(9).font('Helvetica')
           .text('Coupon Discount:', 335, currentY + summaryOffset)
           .text(`-₹${discountNum.toFixed(0)}`, 450, currentY + summaryOffset, { width: 90, align: 'right' });
        summaryOffset += 16;
      }

      doc.fillColor(textColor).fontSize(9).font('Helvetica')
         .text('Desk Delivery & Taxes:', 335, currentY + summaryOffset)
         .text('FREE (₹0)', 450, currentY + summaryOffset, { width: 90, align: 'right' });

      const grandTotalY = currentY + summaryOffset + 16;
      doc.rect(320, grandTotalY, 235, 30).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
         .text('Grand Total:', 335, grandTotalY + 9)
         .text(`₹${finalGrandTotal.toFixed(0)}`, 450, grandTotalY + 9, { width: 90, align: 'right' });

      // 6. REVIEW & APPRECIATION CALLOUT
      currentY = grandTotalY + 50;
      doc.rect(40, currentY, 515, 65).fill('#f0fdf4').stroke('#86efac');

      doc.fillColor('#15803d').fontSize(11).font('Helvetica-Bold')
         .text('⭐ Love your Chai? We would love your feedback!', 55, currentY + 14);

      doc.fillColor('#166534').fontSize(8.5).font('Helvetica')
         .text('Your 5-star review helps our chai makers brew happiness every single day.\nLeave your quick review or reorder your favorite chai at: https://www.chaichaska.co.in/orders', 55, currentY + 32, { width: 485 });

      // 7. FOOTER
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
         .text('Chai Chaska Private Limited • Jaipur / Corporate Outlets • Support: +91 96676 23123', 40, 770, { align: 'center', width: 515 })
         .text('This is a computer-generated tax invoice. Thank you for choosing Chai Chaska! ☕', 40, 782, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
