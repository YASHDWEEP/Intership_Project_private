import { Response } from 'express';
import { prisma } from '../config/prisma';
import { PdfService } from '../services/pdf.service';
import { EmailService } from '../services/email.service';
import { logAudit } from '../common/utils/audit.logger';

export class InvoicesController {
  static async getAll(req: any, res: Response) {
    try {
      let where: any = {};
      if (req.user?.role === 'CLIENT' && req.user.clientId) {
        where.clientId = req.user.clientId;
      }

      const invoices = await prisma.invoice.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, gstNumber: true, contactEmail: true } },
          payments: { orderBy: { createdAt: 'desc' } },
          _count: { select: { trips: true, items: true } },
        },
      });
      return res.json(invoices);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: any, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          client: true,
          items: true,
          payments: { orderBy: { createdAt: 'desc' } },
          trips: { orderBy: { tripDate: 'asc' } },
        },
      });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      return res.json(invoice);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async generateInvoice(req: any, res: Response) {
    try {
      const { clientId, startDate, endDate, dueDate } = req.body;
      if (!clientId || !startDate || !endDate) {
        return res.status(400).json({ error: 'clientId, startDate, and endDate are required' });
      }

      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) return res.status(404).json({ error: 'Client not found' });

      // Fetch un-invoiced trips for client in date range
      const trips = await prisma.trip.findMany({
        where: {
          clientId,
          tripDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          invoiceId: null,
        },
      });

      if (trips.length === 0) {
        return res.status(400).json({ error: 'No un-invoiced trips found for this client in the selected date range.' });
      }

      // Group trips by Vehicle Type & KM Slab for line items
      const itemGroups: Record<string, { count: number; totalRevenue: number; avgRate: number }> = {};
      let subtotal = 0;

      trips.forEach((t) => {
        const key = `${t.vehicleType} (${t.kmSlab})`;
        if (!itemGroups[key]) {
          itemGroups[key] = { count: 0, totalRevenue: 0, avgRate: t.tripRate };
        }
        itemGroups[key].count += 1;
        itemGroups[key].totalRevenue += t.tripRevenue;
        subtotal += t.tripRevenue;
      });

      // Calculate 5% GST (2.5% CGST + 2.5% SGST)
      const taxRate = 0.05;
      const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
      const totalAmount = subtotal + taxAmount;

      // Sequential Invoice Number
      const count = await prisma.invoice.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const generatedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      // Execute in Transaction
      const invoice = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.create({
          data: {
            invoiceNumber,
            clientId,
            billingPeriodStart: new Date(startDate),
            billingPeriodEnd: new Date(endDate),
            subtotal,
            taxAmount,
            totalAmount,
            status: 'GENERATED',
            dueDate: generatedDueDate,
          },
        });

        // Create line items
        for (const [description, data] of Object.entries(itemGroups)) {
          await tx.invoiceItem.create({
            data: {
              invoiceId: inv.id,
              description: `${description} Cab Operations`,
              quantity: data.count,
              rate: Math.round((data.totalRevenue / data.count) * 100) / 100,
              amount: data.totalRevenue,
            },
          });
        }

        // Link trips to invoice
        await tx.trip.updateMany({
          where: {
            id: { in: trips.map((t) => t.id) },
          },
          data: {
            invoiceId: inv.id,
            status: 'INVOICED',
          },
        });

        return inv;
      });

      await logAudit({
        userId: req.user?.id,
        action: 'GENERATE_INVOICE',
        entity: 'Invoice',
        entityId: invoice.id,
        newValue: { invoiceNumber, totalAmount, tripsCount: trips.length },
      });

      return res.status(201).json(invoice);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async downloadPdf(req: any, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          client: true,
          items: true,
        },
      });

      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const pdfBuffer = await PdfService.createInvoicePdf(invoice, invoice.client, invoice.items);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async sendEmail(req: any, res: Response) {
    try {
      const { id } = req.params;
      const result = await EmailService.sendInvoiceEmail(id);
      return res.json({
        message: `Invoice PDF email sent successfully to ${result.email}`,
        previewUrl: result.previewUrl,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async updateStatus(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const invoice = await prisma.invoice.update({
        where: { id },
        data: { status },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'UPDATE_STATUS',
        entity: 'Invoice',
        entityId: id,
        newValue: { status },
      });

      return res.json(invoice);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
