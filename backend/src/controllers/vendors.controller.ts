import { Response } from 'express';
import { prisma } from '../config/prisma';
import { logAudit } from '../common/utils/audit.logger';

export class VendorsController {
  static async getAll(req: any, res: Response) {
    try {
      const vendors = await prisma.vendor.findMany({
        orderBy: { name: 'asc' },
        include: {
          vehicles: true,
          _count: {
            select: { trips: true, settlements: true },
          },
        },
      });

      // Calculate total earnings & pending settlements dynamically
      const result = await Promise.all(
        vendors.map(async (v) => {
          const tripStats = await prisma.trip.aggregate({
            where: { vendorId: v.id },
            _sum: { vendorCost: true },
            _count: { id: true },
          });

          const settlementStats = await prisma.settlement.aggregate({
            where: { vendorId: v.id, status: 'PAID' },
            _sum: { netPayable: true },
          });

          const totalEarnings = tripStats._sum.vendorCost || 0;
          const paidSettlement = settlementStats._sum.netPayable || 0;
          const pendingSettlement = Math.max(0, totalEarnings - paidSettlement);

          return {
            ...v,
            totalTrips: tripStats._count.id,
            totalEarnings,
            paidSettlement,
            pendingSettlement,
          };
        })
      );

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: any, res: Response) {
    try {
      const { id } = req.params;
      const vendor = await prisma.vendor.findUnique({
        where: { id },
        include: {
          vehicles: true,
          trips: { take: 20, orderBy: { tripDate: 'desc' } },
          settlements: { orderBy: { createdAt: 'desc' } },
        },
      });
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
      return res.json(vendor);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: any, res: Response) {
    try {
      const { name, companyName, gstNumber, phone, email, address, commissionType, commissionValue } = req.body;
      const vendor = await prisma.vendor.create({
        data: {
          name,
          companyName,
          gstNumber,
          phone,
          email,
          address,
          commissionType: commissionType || 'PERCENTAGE',
          commissionValue: commissionValue !== undefined ? parseFloat(commissionValue) : 10.0,
        },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Vendor',
        entityId: vendor.id,
        newValue: vendor,
      });

      return res.status(201).json(vendor);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const oldVendor = await prisma.vendor.findUnique({ where: { id } });
      const vendor = await prisma.vendor.update({
        where: { id },
        data: req.body,
      });

      await logAudit({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Vendor',
        entityId: vendor.id,
        oldValue: oldVendor,
        newValue: vendor,
      });

      return res.json(vendor);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
