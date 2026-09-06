import { Response } from 'express';
import { prisma } from '../config/prisma';
import { PricingEngine } from '../services/pricing.engine';
import { logAudit } from '../common/utils/audit.logger';
import { isClientUser, validateTenantAccess } from '../common/guards/tenant.guard';

export class TripsController {
  static async getAll(req: any, res: Response) {
    try {
      const {
        page = '1',
        limit = '25',
        search = '',
        clientId,
        vendorId,
        status,
        startDate,
        endDate,
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Role-based data restriction for Vendor & Client users
      let filterClientId = clientId;
      let filterVendorId = vendorId;

      if (isClientUser(req)) {
        if (clientId && String(clientId) !== req.user.clientId) {
          return res.status(403).json({ error: 'Forbidden: You cannot access trips for another company tenant' });
        }
        filterClientId = req.user.clientId;
      }
      if (req.user?.role === 'VENDOR' && req.user.vendorId) {
        filterVendorId = req.user.vendorId;
      }

      const where: any = {};
      if (filterClientId) where.clientId = filterClientId;
      if (filterVendorId) where.vendorId = filterVendorId;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.tripDate = {};
        if (startDate) where.tripDate.gte = new Date(startDate);
        if (endDate) where.tripDate.lte = new Date(endDate);
      }

      if (search) {
        where.OR = [
          { vehicleNumber: { contains: search } },
          { vehicleType: { contains: search } },
          { kmSlab: { contains: search } },
        ];
      }

      const [trips, total] = await Promise.all([
        prisma.trip.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { tripDate: 'desc' },
          include: {
            client: { select: { id: true, name: true } },
            vendor: { select: { id: true, name: true } },
            vehicle: { select: { id: true, vehicleNumber: true } },
          },
        }),
        prisma.trip.count({ where }),
      ]);

      return res.json({
        data: trips,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: any, res: Response) {
    try {
      let {
        tripDate,
        clientId,
        vendorId,
        vehicleId,
        vehicleNumber,
        vehicleType,
        employeeCount,
        totalKm,
        tripCategory,
        billCategory,
        waitingTime,
        tollAmount,
        parkingAmount,
      } = req.body;

      if (isClientUser(req)) {
        if (clientId && String(clientId) !== req.user.clientId) {
          return res.status(403).json({ error: 'Forbidden: You cannot create trips for another company tenant' });
        }
        clientId = req.user.clientId;
      }

      if (!tripDate || !clientId || !vendorId || !vehicleNumber || totalKm === undefined) {
        return res.status(400).json({ error: 'Missing mandatory trip fields' });
      }

      const parsedKm = parseFloat(totalKm);
      if (parsedKm <= 0) {
        return res.status(400).json({ error: 'Total KM must be greater than 0' });
      }

      // Compute pricing
      const pricing = await PricingEngine.calculateTripPricing({
        clientId,
        vehicleType: vehicleType || '4 Seater',
        totalKm: parsedKm,
        vendorId,
        waitingTime: parseFloat(waitingTime || 0),
        tollAmount: parseFloat(tollAmount || 0),
        parkingAmount: parseFloat(parkingAmount || 0),
      });

      const trip = await prisma.trip.create({
        data: {
          tripDate: new Date(tripDate),
          clientId,
          vendorId,
          vehicleId: vehicleId || null,
          vehicleNumber: String(vehicleNumber).trim().toUpperCase(),
          vehicleType: vehicleType || '4 Seater',
          employeeCount: parseInt(employeeCount || 1),
          totalKm: parsedKm,
          tripCategory: tripCategory || 'PICKUP',
          billCategory: billCategory || 'REGULAR',
          waitingTime: parseFloat(waitingTime || 0),
          tollAmount: parseFloat(tollAmount || 0),
          parkingAmount: parseFloat(parkingAmount || 0),
          kmSlab: pricing.kmSlab,
          tripRate: pricing.tripRate,
          tripRevenue: pricing.tripRevenue,
          vendorCost: pricing.vendorCost,
          status: 'VALIDATED',
          source: 'MANUAL',
        },
        include: { client: true, vendor: true },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Trip',
        entityId: trip.id,
        newValue: trip,
      });

      return res.status(201).json(trip);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const oldTrip = await prisma.trip.findUnique({ where: { id } });
      if (!oldTrip) return res.status(404).json({ error: 'Trip not found' });

      if (!validateTenantAccess(req, res, oldTrip.clientId)) return;

      if (isClientUser(req) && req.body.clientId && String(req.body.clientId) !== req.user.clientId) {
        return res.status(403).json({ error: 'Forbidden: You cannot assign a trip to another company tenant' });
      }

      // Recalculate pricing if KM or vehicleType changed
      let updateData = { ...req.body };
      if (isClientUser(req)) {
        updateData.clientId = req.user.clientId;
      }

      if (req.body.totalKm || req.body.vehicleType || req.body.clientId) {
        const pricing = await PricingEngine.calculateTripPricing({
          clientId: updateData.clientId || oldTrip.clientId,
          vehicleType: req.body.vehicleType || oldTrip.vehicleType,
          totalKm: parseFloat(req.body.totalKm || oldTrip.totalKm),
          vendorId: req.body.vendorId || oldTrip.vendorId,
        });

        updateData = {
          ...updateData,
          kmSlab: pricing.kmSlab,
          tripRate: pricing.tripRate,
          tripRevenue: pricing.tripRevenue,
          vendorCost: pricing.vendorCost,
        };
      }

      const trip = await prisma.trip.update({
        where: { id },
        data: updateData,
        include: { client: true, vendor: true },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Trip',
        entityId: trip.id,
        oldValue: oldTrip,
        newValue: trip,
      });

      return res.json(trip);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async delete(req: any, res: Response) {
    try {
      const { id } = req.params;
      const oldTrip = await prisma.trip.findUnique({ where: { id } });
      if (!oldTrip) return res.status(404).json({ error: 'Trip not found' });

      if (!validateTenantAccess(req, res, oldTrip.clientId)) return;

      await prisma.trip.delete({ where: { id } });

      await logAudit({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Trip',
        entityId: id,
        oldValue: oldTrip,
      });

      return res.json({ message: 'Trip deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}

