import { Response } from 'express';
import { prisma } from '../config/prisma';
import { PricingEngine } from '../services/pricing.engine';
import { logAudit } from '../common/utils/audit.logger';

export class PricingController {
  static async getAll(req: any, res: Response) {
    try {
      const rules = await prisma.pricingRule.findMany({
        include: {
          client: true,
          slabs: { orderBy: { minKm: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(rules);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: any, res: Response) {
    try {
      const { clientId, vehicleType, ruleName, pricingType, slabs } = req.body;

      const rule = await prisma.pricingRule.create({
        data: {
          clientId,
          vehicleType,
          ruleName,
          pricingType: pricingType || 'KM_SLAB',
          slabs: {
            create: (slabs || []).map((slab: any) => ({
              minKm: parseFloat(slab.minKm),
              maxKm: parseFloat(slab.maxKm),
              rate: parseFloat(slab.rate),
              vendorRate: parseFloat(slab.vendorRate || Math.round(slab.rate * 0.8)),
            })),
          },
        },
        include: { slabs: true, client: true },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'PricingRule',
        entityId: rule.id,
        newValue: rule,
      });

      return res.status(201).json(rule);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async calculatePreview(req: any, res: Response) {
    try {
      const { clientId, vehicleType, totalKm, vendorId, waitingTime, tollAmount, parkingAmount } = req.body;

      if (!clientId || !vehicleType || totalKm === undefined) {
        return res.status(400).json({ error: 'clientId, vehicleType, and totalKm are required' });
      }

      const result = await PricingEngine.calculateTripPricing({
        clientId,
        vehicleType,
        totalKm: parseFloat(totalKm),
        vendorId,
        waitingTime: parseFloat(waitingTime || 0),
        tollAmount: parseFloat(tollAmount || 0),
        parkingAmount: parseFloat(parkingAmount || 0),
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
