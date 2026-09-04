import PDFDocument from 'pdfkit';

export class PdfService {
  static createInvoicePdf(invoice: any, client: any, items: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });

        // Brand Header
        doc.font('Helvetica-Bold').fillColor('#1E3A8A').fontSize(24).text('CABMITRA', 40, 40);
        doc.font('Helvetica').fillColor('#4B5563').fontSize(10).text('Cab Operations & Corporate Billing Platform', 40, 68);
        doc.text('GSTIN: 29AAAAA0000A1Z5 | contact@cabmitra.com', 40, 82);

        // Invoice Badge
        doc.font('Helvetica-Bold').fillColor('#1E3A8A').fontSize(18).text('TAX INVOICE', 400, 40, { align: 'right' });
        doc.font('Helvetica').fillColor('#374151').fontSize(10).text(`Invoice No: ${invoice.invoiceNumber}`, 400, 65, { align: 'right' });
        doc.text(`Date: ${new Date(invoice.generatedAt).toLocaleDateString('en-IN')}`, 400, 80, { align: 'right' });
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 400, 95, { align: 'right' });

        doc.moveTo(40, 115).lineTo(555, 115).strokeColor('#E5E7EB').stroke();

        // Bill To section
        doc.font('Helvetica-Bold').fillColor('#1F2937').fontSize(12).text('Billed To:', 40, 130);
        doc.font('Helvetica').fillColor('#4B5563').fontSize(10).text(client.name, 40, 148);
        doc.text(`GSTIN: ${client.gstNumber}`, 40, 162);
        doc.text(`Contact: ${client.contactPerson} (${client.contactEmail})`, 40, 176);

        // Period section
        doc.font('Helvetica-Bold').fillColor('#1F2937').fontSize(12).text('Billing Period:', 350, 130);
        doc.font('Helvetica').fillColor('#4B5563').fontSize(10).text(
          `${new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN')} to ${new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN')}`,
          350,
          148
        );

        // Table Headers
        const tableTop = 210;
        doc.rect(40, tableTop, 515, 24).fill('#F3F4F6');
        doc.font('Helvetica-Bold').fillColor('#374151').fontSize(10).text('#', 48, tableTop + 7);
        doc.text('Description / Vehicle Type', 80, tableTop + 7);
        doc.text('Qty', 320, tableTop + 7);
        doc.text('Rate (₹)', 380, tableTop + 7);
        doc.text('Amount (₹)', 470, tableTop + 7, { align: 'right' });

        let y = tableTop + 30;
        items.forEach((item, index) => {
          doc.font('Helvetica').fillColor('#4B5563').fontSize(9).text(String(index + 1), 48, y);
          doc.text(item.description, 80, y, { width: 230 });
          doc.text(String(item.quantity), 320, y);
          doc.text(item.rate.toFixed(2), 380, y);
          doc.text(item.amount.toFixed(2), 470, y, { align: 'right' });
          y += 22;
        });

        doc.moveTo(40, y).lineTo(555, y).strokeColor('#E5E7EB').stroke();
        y += 15;

        // Financial Breakdown
        const cgst = invoice.taxAmount / 2;
        const sgst = invoice.taxAmount / 2;

        doc.font('Helvetica').fillColor('#374151').fontSize(10).text('Subtotal:', 350, y);
        doc.text(`₹ ${invoice.subtotal.toFixed(2)}`, 470, y, { align: 'right' });
        y += 18;

        doc.text('CGST (2.5%):', 350, y);
        doc.text(`₹ ${cgst.toFixed(2)}`, 470, y, { align: 'right' });
        y += 18;

        doc.text('SGST (2.5%):', 350, y);
        doc.text(`₹ ${sgst.toFixed(2)}`, 470, y, { align: 'right' });
        y += 18;

        doc.rect(345, y, 210, 26).fill('#1E3A8A');
        doc.font('Helvetica-Bold').fillColor('#FFFFFF').fontSize(11).text('Total Amount Payable:', 355, y + 7);
        doc.text(`₹ ${invoice.totalAmount.toFixed(2)}`, 470, y + 7, { align: 'right' });

        // Footer
        doc.fillColor('#9CA3AF').fontSize(9).text('Thank you for partnering with CabMitra. This is a computer-generated invoice.', 40, 780, {
          align: 'center',
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  static createSettlementPdf(settlement: any, vendor: any, items: any[], deductions: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });

        // Header
        doc.fillColor('#1E3A8A').fontSize(22).text('CABMITRA VENDOR SETTLEMENT', 40, 40);
        doc.fillColor('#4B5563').fontSize(10).text(`Settlement ID: ${settlement.id}`, 40, 68);
        doc.text(`Period: ${new Date(settlement.settlementPeriodStart).toLocaleDateString('en-IN')} - ${new Date(settlement.settlementPeriodEnd).toLocaleDateString('en-IN')}`, 40, 82);

        doc.moveTo(40, 105).lineTo(555, 105).strokeColor('#E5E7EB').stroke();

        // Vendor Info
        doc.fillColor('#1F2937').fontSize(12).text('Vendor Details:', 40, 120);
        doc.fillColor('#4B5563').fontSize(10).text(`Vendor Name: ${vendor.name}`, 40, 138);
        doc.text(`Company: ${vendor.companyName}`, 40, 152);
        doc.text(`GSTIN: ${vendor.gstNumber}`, 40, 166);
        doc.text(`Phone: ${vendor.phone} | Email: ${vendor.email}`, 40, 180);

        // Summary Cards
        const cardY = 205;
        doc.rect(40, cardY, 155, 50).fill('#EFF6FF');
        doc.fillColor('#1E40AF').fontSize(9).text('TOTAL TRIPS', 50, cardY + 10);
        doc.fontSize(16).text(String(settlement.totalTrips), 50, cardY + 24);

        doc.rect(210, cardY, 155, 50).fill('#ECFDF5');
        doc.fillColor('#065F46').fontSize(9).text('GROSS EARNINGS', 220, cardY + 10);
        doc.fontSize(16).text(`₹ ${settlement.grossAmount.toFixed(2)}`, 220, cardY + 24);

        doc.rect(380, cardY, 175, 50).fill('#FEF2F2');
        doc.fillColor('#991B1B').fontSize(9).text('NET PAYABLE AMOUNT', 390, cardY + 10);
        doc.fontSize(16).text(`₹ ${settlement.netPayable.toFixed(2)}`, 390, cardY + 24);

        // Trip Breakdown Header
        let y = 275;
        doc.fillColor('#1F2937').fontSize(12).text('Settlement Breakdown', 40, y);
        y += 20;

        doc.rect(40, y, 515, 22).fill('#F3F4F6');
        doc.fillColor('#374151').fontSize(9).text('Slab / Category', 50, y + 6);
        doc.text('Trip Amount (₹)', 250, y + 6);
        doc.text('Deductions (₹)', 380, y + 6);
        doc.text('Payable (₹)', 480, y + 6, { align: 'right' });
        y += 26;

        items.slice(0, 12).forEach((item) => {
          doc.fillColor('#4B5563').fontSize(9).text(item.slab, 50, y);
          doc.text(item.tripAmount.toFixed(2), 250, y);
          doc.text(item.deduction.toFixed(2), 380, y);
          doc.text(item.payableAmount.toFixed(2), 480, y, { align: 'right' });
          y += 20;
        });

        doc.moveTo(40, y).lineTo(555, y).strokeColor('#E5E7EB').stroke();
        y += 15;

        // Deductions list if any
        if (deductions.length > 0) {
          doc.fillColor('#1F2937').fontSize(11).text('Applied Deductions / Penalties:', 40, y);
          y += 18;
          deductions.forEach((d) => {
            doc.fillColor('#EF4444').fontSize(9).text(`• ${d.type} - ${d.reason}: ₹${d.amount.toFixed(2)}`, 50, y);
            y += 16;
          });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
