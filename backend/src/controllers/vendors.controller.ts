import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { logAudit } from '../common/utils/audit.logger';
import { isClientUser } from '../common/guards/tenant.guard';

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

      if (isClientUser(req)) {
        // Return sanitized basic vendor list for client users without financial earnings or settlements
        return res.json(
          vendors.map((v) => ({
            id: v.id,
            name: v.name,
            companyName: v.companyName,
            phone: v.phone,
            email: v.email,
            vehicles: v.vehicles.map((veh) => ({ id: veh.id, vehicleNumber: veh.vehicleNumber, vehicleType: veh.vehicleType })),
          }))
        );
      }

      // Calculate total earnings & pending settlements dynamically for Admin/Accounts/Operations
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
          settlements: !isClientUser(req) ? { orderBy: { createdAt: 'desc' } } : false,
        },
      });
      if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

      if (isClientUser(req)) {
        return res.json({
          id: vendor.id,
          name: vendor.name,
          companyName: vendor.companyName,
          vehicles: vendor.vehicles,
        });
      }

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

      // Automatically provision/link VENDOR user role account if email provided
      if (email) {
        const normalizedEmail = String(email).toLowerCase().trim();
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!existingUser) {
          const passwordHash = await bcrypt.hash('Password@123', 10);
          await prisma.user.create({
            data: {
              name: name || companyName || 'Vendor Partner',
              email: normalizedEmail,
              passwordHash,
              role: 'VENDOR',
              status: 'ACTIVE',
              vendorId: vendor.id,
            },
          });
        } else {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              role: 'VENDOR',
              vendorId: vendor.id,
            },
          });
        }
      }

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
