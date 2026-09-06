import { Response } from 'express';
import { prisma } from '../config/prisma';
import { PdfService } from '../services/pdf.service';
import { EmailService } from '../services/email.service';
import { logAudit } from '../common/utils/audit.logger';
import { isClientUser, validateTenantAccess, getEffectiveClientId } from '../common/guards/tenant.guard';

export class InvoicesController {
  static async getAll(req: any, res: Response) {
    try {
      let where: any = {};
      if (isClientUser(req)) {
        where.clientId = req.user.clientId;
      }

      const invoices = await prisma.invoice.findMany({
        where,
        orderBy: { generatedAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, gstNumber: true, contactEmail: true } },
          payments: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, status: true, amount: true, method: true, createdAt: true },
          },
          _count: { select: { trips: true, items: true } },
        },
      });

      // Filter out duplicate ghost invoices (0 trips, status GENERATED/PENDING when a PAID invoice exists for same client & period)
      const paidKeys = new Set(
        invoices
          .filter((i) => i.status === 'PAID')
          .map((i) => `${i.clientId}_${i.billingPeriodStart.toISOString().split('T')[0]}_${i.billingPeriodEnd.toISOString().split('T')[0]}`)
      );

      const cleanInvoices = invoices.filter((i) => {
        if (i.status === 'PAID') return true;
        const key = `${i.clientId}_${i.billingPeriodStart.toISOString().split('T')[0]}_${i.billingPeriodEnd.toISOString().split('T')[0]}`;
        if (paidKeys.has(key) && i._count.trips === 0) {
          return false;
        }
        return true;
      });

      return res.json(cleanInvoices);
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

      if (!validateTenantAccess(req, res, invoice.clientId)) return;

      return res.json(invoice);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async generateInvoice(req: any, res: Response) {
    let { clientId, startDate, endDate, dueDate } = req.body;

    if (isClientUser(req)) {
      if (clientId && String(clientId) !== req.user.clientId) {
        return res.status(403).json({ error: 'Forbidden: You cannot generate invoices for another company tenant' });
      }
      clientId = req.user.clientId;
    }

    if (!clientId || !startDate || !endDate) {
      return res.status(400).json({ error: 'clientId, startDate, and endDate are required' });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const start = new Date(startDate);
    const end = new Date(endDate);

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Pre-check: If active invoice already exists for exact client & date range, return it immediately (Idempotency)
        const existingActiveInvoice = await prisma.invoice.findFirst({
          where: {
            clientId,
            billingPeriodStart: start,
            billingPeriodEnd: end,
            status: { notIn: ['CANCELLED', 'REFUNDED', 'FAILED'] },
          },
          include: {
            client: { select: { id: true, name: true, gstNumber: true, contactEmail: true } },
            payments: { orderBy: { createdAt: 'desc' } },
            _count: { select: { trips: true, items: true } },
          },
        });

        if (existingActiveInvoice) {
          return res.status(200).json({
            ...existingActiveInvoice,
            alreadyExists: true,
            message: 'Invoice for this client and billing period has already been generated successfully.',
          });
        }

        // Execute in Transaction with 30s timeout and internal duplicate check
        const invoice = await prisma.$transaction(
          async (tx) => {
            // PostgreSQL Advisory Transaction Lock to serialize concurrent invoice generation for exact client & period
            const lockKey = `inv_gen_${clientId}_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

            // Internal Transaction Check (strictly serialized by advisory lock)
            const doubleCheck = await tx.invoice.findFirst({
              where: {
                clientId,
                billingPeriodStart: start,
                billingPeriodEnd: end,
                status: { notIn: ['CANCELLED', 'REFUNDED', 'FAILED'] },
              },
              include: {
                client: { select: { id: true, name: true, gstNumber: true, contactEmail: true } },
                payments: { orderBy: { createdAt: 'desc' } },
                _count: { select: { trips: true, items: true } },
              },
            });

            if (doubleCheck) {
              return {
                ...doubleCheck,
                alreadyExists: true,
                message: 'Invoice for this client and billing period has already been generated successfully.',
              };
            }

            // Fetch un-invoiced trips inside transaction
            const trips = await tx.trip.findMany({
              where: {
                clientId,
                tripDate: {
                  gte: start,
                  lte: end,
                },
                invoiceId: null,
              },
            });

            if (trips.length === 0) {
              throw new Error('No un-invoiced trips found for this client in the selected date range.');
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

            // Calculate unique sequential Invoice Number
            let count = await tx.invoice.count();
            let invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
            let numAttempts = 0;
            while (numAttempts < 10) {
              const existingNum = await tx.invoice.findUnique({ where: { invoiceNumber } });
              if (!existingNum) break;
              count++;
              invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
              numAttempts++;
            }

            const generatedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

            const inv = await tx.invoice.create({
              data: {
                invoiceNumber,
                clientId,
                billingPeriodStart: start,
                billingPeriodEnd: end,
                subtotal,
                taxAmount,
                totalAmount,
                status: 'GENERATED',
                dueDate: generatedDueDate,
              },
            });

            // Bulk Create line items
            const itemEntries = Object.entries(itemGroups);
            if (itemEntries.length > 0) {
              await tx.invoiceItem.createMany({
                data: itemEntries.map(([description, data]) => ({
                  invoiceId: inv.id,
                  description: `${description} Cab Operations`,
                  quantity: data.count,
                  rate: Math.round((data.totalRevenue / data.count) * 100) / 100,
                  amount: data.totalRevenue,
                })),
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
          },
          {
            maxWait: 10000,
            timeout: 30000,
          }
        );

        await logAudit({
          userId: req.user?.id,
          action: 'GENERATE_INVOICE',
          entity: 'Invoice',
          entityId: invoice.id,
          newValue: { invoiceNumber: invoice.invoiceNumber, totalAmount: invoice.totalAmount },
        });

        // Asynchronously trigger automated tax invoice email to corporate client
        EmailService.sendInvoiceEmail(invoice.id).catch((err) => {
          console.error('Failed to send automated invoice email:', err);
        });

        if ((invoice as any).alreadyExists) {
          return res.status(200).json(invoice);
        }
        return res.status(201).json(invoice);
      } catch (err: any) {
        if (err.message && err.message.includes('No un-invoiced trips found')) {
          return res.status(400).json({ error: err.message });
        }

        if (attempt < maxRetries) {
          // Wait 150ms before retrying to allow concurrent transaction to commit
          await new Promise((resolve) => setTimeout(resolve, 150));
          continue;
        }

        return res.status(500).json({ error: err.message });
      }
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

      if (!validateTenantAccess(req, res, invoice.clientId)) return;

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
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      if (!validateTenantAccess(req, res, invoice.clientId)) return;

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
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      if (!validateTenantAccess(req, res, invoice.clientId)) return;

      const updated = await prisma.invoice.update({
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

      if (status === 'PAID') {
        // Asynchronously trigger automated payment receipt email to client
        EmailService.sendInvoicePaymentReceipt(id).catch((err) => {
          console.error('Failed to send payment receipt email:', err);
        });
      }

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}

