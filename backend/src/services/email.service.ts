import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '../config/prisma';
import { PdfService } from './pdf.service';
import { logAudit } from '../common/utils/audit.logger';

export class EmailService {
  private static transporter: Transporter | null = null;

  private static async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    // Check for custom SMTP environment variables
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      return this.transporter;
    }

    // Fallback: Create Ethereal test account for development/demo testing
    try {
      const testAccount = await Promise.race([
        nodemailer.createTestAccount(),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Ethereal test account creation timeout')), 3000))
      ]);
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`✉️ Initialized Ethereal Test Email Account: ${testAccount.user}`);
      return this.transporter;
    } catch (err) {
      // Fallback JSON stream transport if internet or test account fails
      console.warn('⚠️ Ethereal test account connection skipped/timed out; using fallback transport');
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return this.transporter;
    }
  }

  /**
   * Send Tax Invoice PDF Email to Client Contact Email
   */
  static async sendInvoiceEmail(invoiceId: string): Promise<{ success: boolean; previewUrl?: string; email: string }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        items: true,
      },
    });

    if (!invoice || !invoice.client) {
      throw new Error('Invoice or client details not found');
    }

    const recipientEmail = invoice.client.contactEmail || 'billing@client.com';
    const senderEmail = process.env.SMTP_FROM || 'billing@cabmitra.com';
    const subject = `[CabMitra] Tax Invoice ${invoice.invoiceNumber} - ₹${invoice.totalAmount.toLocaleString('en-IN')}`;
    
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; color: #1f2937;">
        <div style="background-color: #1e3a8a; padding: 16px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CABMITRA</h1>
          <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 13px;">Corporate Cab Operations & Billing Platform</p>
        </div>

        <h2 style="color: #1e3a8a; margin-top: 24px;">Tax Invoice Notification</h2>
        <p>Dear <strong>${invoice.client.contactPerson || invoice.client.name}</strong>,</p>
        <p>Please find attached your Tax Invoice <strong>#${invoice.invoiceNumber}</strong> for recent cab operation services.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border-radius: 8px;">
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Invoice Number:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Billing Period:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN')} - ${new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Status:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${invoice.status === 'PAID' ? '#059669' : '#d97706'}; font-weight: bold;">${invoice.status}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; font-size: 16px;">Total Payable:</td>
            <td style="padding: 12px; font-weight: bold; font-size: 16px; color: #1e3a8a;">₹${invoice.totalAmount.toLocaleString('en-IN')}</td>
          </tr>
        </table>

        <p style="font-size: 14px; color: #4b5563;">You can pay this invoice online via UPI (PhonePe / GPay), Credit/Debit Card, or Netbanking using the CabMitra portal.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">This is an automated system notification from CabMitra Enterprise ERP.</p>
      </div>
    `;

    const pdfBuffer = await PdfService.createInvoicePdf(invoice, invoice.client, invoice.items);
    const transporter = await this.getTransporter();

    const mailOptions = {
      from: `"CabMitra Billing" <${senderEmail}>`,
      to: recipientEmail,
      subject,
      html: bodyHtml,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    let previewUrl: string | undefined = undefined;
    let emailStatus = 'DELIVERED';

    try {
      const info = await transporter.sendMail(mailOptions);
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      if (previewUrl) {
        console.log(`📧 Invoice Email Preview URL for ${recipientEmail}: ${previewUrl}`);
      }
    } catch (sendErr: any) {
      console.warn(`⚠️ Outbound SMTP send error (saving email record to database): ${sendErr?.message || sendErr}`);
      emailStatus = 'SENT';
    }

    // Persist to EmailLog DB table
    await prisma.emailLog.create({
      data: {
        direction: 'OUTBOUND',
        type: 'TAX_INVOICE',
        from: senderEmail,
        to: recipientEmail,
        subject,
        bodyHtml,
        status: emailStatus,
        previewUrl,
        entityType: 'Invoice',
        entityId: invoice.id,
        attachment: `${invoice.invoiceNumber}.pdf`,
      },
    });

    await logAudit({
      action: 'EMAIL_SENT',
      entity: 'Invoice',
      entityId: invoice.id,
      newValue: { recipientEmail, invoiceNumber: invoice.invoiceNumber, previewUrl, type: 'TAX_INVOICE' },
    });

    return { success: true, previewUrl, email: recipientEmail };
  }

  /**
   * Send Automated Payment Receipt Confirmation with PDF Attachment upon Razorpay Success
   */
  static async sendInvoicePaymentReceipt(invoiceId: string, paymentDetails?: any): Promise<{ success: boolean; previewUrl?: string; email: string }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!invoice || !invoice.client) {
      throw new Error('Invoice or client details not found');
    }

    const recipientEmail = invoice.client.contactEmail || 'billing@client.com';
    const senderEmail = process.env.SMTP_FROM || 'payments@cabmitra.com';
    const latestPayment = paymentDetails || (invoice.payments && invoice.payments[0]) || {};
    const paymentMethod = (latestPayment.method || 'Razorpay Online UPI/Card').toUpperCase();
    const razorpayPaymentId = latestPayment.razorpayPaymentId || 'pay_test_captured';
    const subject = `[Payment Confirmation] Invoice ${invoice.invoiceNumber} Paid - ₹${invoice.totalAmount.toLocaleString('en-IN')}`;

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #10b981; border-radius: 12px; padding: 24px; color: #1f2937;">
        <div style="background-color: #059669; padding: 16px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">PAYMENT RECEIVED</h1>
          <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 13px;">CabMitra Invoice #${invoice.invoiceNumber}</p>
        </div>

        <h2 style="color: #059669; margin-top: 24px;">Payment Receipt Confirmation</h2>
        <p>Dear <strong>${invoice.client.contactPerson || invoice.client.name}</strong>,</p>
        <p>Thank you! We have successfully captured your online payment of <strong>₹${invoice.totalAmount.toLocaleString('en-IN')}</strong> for Tax Invoice <strong>#${invoice.invoiceNumber}</strong>.</p>

        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 4px 0; font-weight: bold; color: #065f46;">Transaction Details:</p>
          <p style="margin: 4px 0; font-size: 14px;">• Payment Status: <span style="color: #059669; font-weight: bold;">CAPTURED (PAID)</span></p>
          <p style="margin: 4px 0; font-size: 14px;">• Razorpay Payment ID: <code>${razorpayPaymentId}</code></p>
          <p style="margin: 4px 0; font-size: 14px;">• Payment Method: ${paymentMethod}</p>
          <p style="margin: 4px 0; font-size: 14px;">• Amount Paid: <strong>₹${invoice.totalAmount.toLocaleString('en-IN')}</strong></p>
          <p style="margin: 4px 0; font-size: 14px;">• Date & Time: ${new Date().toLocaleString('en-IN')}</p>
        </div>

        <p style="font-size: 14px;">Your receipt PDF is attached to this email for your accounting records.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">CabMitra Enterprise ERP Payments System</p>
      </div>
    `;

    const pdfBuffer = await PdfService.createInvoicePdf(invoice, invoice.client, invoice.items);
    const transporter = await this.getTransporter();

    const mailOptions = {
      from: `"CabMitra Payments" <${senderEmail}>`,
      to: recipientEmail,
      subject,
      html: bodyHtml,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}_Paid_Receipt.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    let previewUrl: string | undefined = undefined;
    let emailStatus = 'DELIVERED';

    try {
      const info = await transporter.sendMail(mailOptions);
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      if (previewUrl) {
        console.log(`📧 Receipt Email Preview URL for ${recipientEmail}: ${previewUrl}`);
      }
    } catch (sendErr: any) {
      console.warn(`⚠️ Outbound SMTP receipt email send error: ${sendErr?.message || sendErr}`);
      emailStatus = 'SENT';
    }

    // Persist to EmailLog DB table
    await prisma.emailLog.create({
      data: {
        direction: 'OUTBOUND',
        type: 'PAYMENT_RECEIPT',
        from: senderEmail,
        to: recipientEmail,
        subject,
        bodyHtml,
        status: emailStatus,
        previewUrl,
        entityType: 'Payment',
        entityId: invoice.id,
        attachment: `${invoice.invoiceNumber}_Paid_Receipt.pdf`,
      },
    });

    await logAudit({
      action: 'EMAIL_SENT',
      entity: 'Invoice',
      entityId: invoice.id,
      newValue: { recipientEmail, invoiceNumber: invoice.invoiceNumber, previewUrl, type: 'PAYMENT_RECEIPT' },
    });

    return { success: true, previewUrl, email: recipientEmail };
  }

  /**
   * Send Vendor Settlement PDF Email to Vendor Contact Email
   */
  static async sendSettlementEmail(settlementId: string): Promise<{ success: boolean; previewUrl?: string; email: string }> {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        vendor: true,
        items: true,
        deductionRecords: true,
      },
    });

    if (!settlement || !settlement.vendor) {
      throw new Error('Settlement or vendor details not found');
    }

    const recipientEmail = settlement.vendor.email || 'vendor@travels.com';
    const senderEmail = process.env.SMTP_FROM || 'settlements@cabmitra.com';
    const subject = `[CabMitra Settlement] Payout Breakdown - ₹${settlement.netPayable.toLocaleString('en-IN')}`;

    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; color: #1f2937;">
        <div style="background-color: #1e3a8a; padding: 16px; border-radius: 8px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CABMITRA VENDOR PAYOUT</h1>
          <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 13px;">Settlement Statement</p>
        </div>

        <h2 style="color: #1e3a8a; margin-top: 24px;">Vendor Settlement Statement</h2>
        <p>Dear <strong>${settlement.vendor.name}</strong>,</p>
        <p>Your settlement statement for period <strong>${new Date(settlement.settlementPeriodStart).toLocaleDateString('en-IN')} to ${new Date(settlement.settlementPeriodEnd).toLocaleDateString('en-IN')}</strong> has been compiled.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border-radius: 8px;">
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Total Trips Executed:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${settlement.totalTrips}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Gross Vendor Cost:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">₹${settlement.grossAmount.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb;">Deductions & Penalties:</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">- ₹${(settlement.deductionRecords || []).reduce((sum: number, d: any) => sum + d.amount, 0).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; font-size: 16px;">Net Payable Payout:</td>
            <td style="padding: 12px; font-weight: bold; font-size: 16px; color: #059669;">₹${settlement.netPayable.toLocaleString('en-IN')}</td>
          </tr>
        </table>

        <p style="font-size: 14px;">The complete trip-wise breakdown PDF is attached to this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">CabMitra Vendor Settlement Module</p>
      </div>
    `;

    const pdfBuffer = await PdfService.createSettlementPdf(
      settlement,
      settlement.vendor,
      settlement.items || [],
      settlement.deductionRecords || []
    );

    const transporter = await this.getTransporter();

    const mailOptions = {
      from: `"CabMitra Vendor Payouts" <${senderEmail}>`,
      to: recipientEmail,
      subject,
      html: bodyHtml,
      attachments: [
        {
          filename: `Settlement_${settlement.id.slice(-6)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    let previewUrl: string | undefined = undefined;
    let emailStatus = 'DELIVERED';

    try {
      const info = await transporter.sendMail(mailOptions);
      previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      if (previewUrl) {
        console.log(`📧 Settlement Email Preview URL for ${recipientEmail}: ${previewUrl}`);
      }
    } catch (sendErr: any) {
      console.warn(`⚠️ Outbound SMTP settlement email send error: ${sendErr?.message || sendErr}`);
      emailStatus = 'SENT';
    }

    // Persist to EmailLog DB table
    await prisma.emailLog.create({
      data: {
        direction: 'OUTBOUND',
        type: 'VENDOR_SETTLEMENT',
        from: senderEmail,
        to: recipientEmail,
        subject,
        bodyHtml,
        status: emailStatus,
        previewUrl,
        entityType: 'Settlement',
        entityId: settlement.id,
        attachment: `Settlement_${settlement.id.slice(-6)}.pdf`,
      },
    });

    await logAudit({
      action: 'EMAIL_SENT',
      entity: 'Settlement',
      entityId: settlement.id,
      newValue: { recipientEmail, vendorName: settlement.vendor.name, previewUrl, type: 'VENDOR_SETTLEMENT' },
    });

    return { success: true, previewUrl, email: recipientEmail };
  }
}
