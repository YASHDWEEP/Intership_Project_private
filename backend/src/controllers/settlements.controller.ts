import { Response } from 'express';
import { prisma } from '../config/prisma';
import { SettlementEngine } from '../services/settlement.engine';
import { PdfService } from '../services/pdf.service';
import { EmailService } from '../services/email.service';
import { logAudit } from '../common/utils/audit.logger';

export class SettlementsController {
  static async getAll(req: any, res: Response) {
    try {
      let where: any = {};
      if (req.user?.role === 'VENDOR' && req.user.vendorId) {
        where.vendorId = req.user.vendorId;
      }

      const settlements = await prisma.settlement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: { select: { id: true, name: true, companyName: true } },
          payments: true,
          deductionRecords: true,
          _count: { select: { trips: true, items: true } },
        },
      });
      return res.json(settlements);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: any, res: Response) {
    try {
      const { id } = req.params;
      const settlement = await prisma.settlement.findUnique({
        where: { id },
        include: {
          vendor: true,
          items: true,
          deductionRecords: true,
          payments: true,
          trips: { take: 50, orderBy: { tripDate: 'asc' } },
        },
      });
      if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
      return res.json(settlement);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async calculatePreview(req: any, res: Response) {
    try {
      const { vendorId, startDate, endDate, deductions } = req.body;
      if (!vendorId || !startDate || !endDate) {
        return res.status(400).json({ error: 'vendorId, startDate, and endDate are required' });
      }

      const result = await SettlementEngine.calculateSettlement({
        vendorId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        deductionsList: deductions || [],
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async generate(req: any, res: Response) {
    try {
      const { vendorId, startDate, endDate, deductions } = req.body;
      if (!vendorId || !startDate || !endDate) {
        return res.status(400).json({ error: 'vendorId, startDate, and endDate are required' });
      }

      const settlement = await SettlementEngine.generateAndSaveSettlement(
        {
          vendorId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          deductionsList: deductions || [],
        },
        req.user?.id
      );

      return res.status(201).json(settlement);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async approve(req: any, res: Response) {
    try {
      const { id } = req.params;
      const settlement = await prisma.settlement.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'APPROVE_SETTLEMENT',
        entity: 'Settlement',
        entityId: id,
        newValue: { status: 'APPROVED' },
      });

      return res.json(settlement);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async recordPayment(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { amount, paymentMethod, referenceNumber } = req.body;

      const settlement = await prisma.settlement.findUnique({ where: { id } });
      if (!settlement) return res.status(404).json({ error: 'Settlement not found' });

      // Execute in Transaction
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            settlementId: id,
            amount: parseFloat(amount || settlement.netPayable),
            paymentMethod: paymentMethod || 'BANK_TRANSFER',
            referenceNumber: referenceNumber || `REF-${Date.now()}`,
            status: 'SUCCESS',
          },
        });

        const updatedSettlement = await tx.settlement.update({
          where: { id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        });

        // Update connected trips to SETTLED
        await tx.trip.updateMany({
          where: { settlementId: id },
          data: { status: 'SETTLED' },
        });

        return { payment, settlement: updatedSettlement };
      });

      await logAudit({
        userId: req.user?.id,
        action: 'PAY',
        entity: 'Settlement',
        entityId: id,
        newValue: { amount, paymentMethod, referenceNumber },
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async downloadPdf(req: any, res: Response) {
    try {
      const { id } = req.params;
      const settlement = await prisma.settlement.findUnique({
        where: { id },
        include: {
          vendor: true,
          items: true,
          deductionRecords: true,
        },
      });

      if (!settlement) return res.status(404).json({ error: 'Settlement not found' });

      const pdfBuffer = await PdfService.createSettlementPdf(
        settlement,
        settlement.vendor,
        settlement.items,
        settlement.deductionRecords
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Settlement_${settlement.id.slice(-6)}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async sendEmail(req: any, res: Response) {
    try {
      const { id } = req.params;
      const result = await EmailService.sendSettlementEmail(id);
      return res.json({
        message: `Settlement PDF email sent successfully to ${result.email}`,
        previewUrl: result.previewUrl,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
