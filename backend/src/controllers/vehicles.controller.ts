import { Response } from 'express';
import { prisma } from '../config/prisma';
import { logAudit } from '../common/utils/audit.logger';

export class VehiclesController {
  static async getAll(req: any, res: Response) {
    try {
      const vehicles = await prisma.vehicle.findMany({
        orderBy: { vehicleNumber: 'asc' },
        include: {
          vendor: true,
          _count: { select: { trips: true } },
        },
      });
      return res.json(vehicles);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: any, res: Response) {
    try {
      const { vendorId, vehicleNumber, vehicleType, seatingCapacity, fuelType } = req.body;
      const cleanVehicleNumber = String(vehicleNumber).trim().toUpperCase();

      const existing = await prisma.vehicle.findUnique({
        where: { vehicleNumber: cleanVehicleNumber },
      });
      if (existing) {
        return res.status(400).json({ error: `Vehicle number '${cleanVehicleNumber}' is already registered.` });
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          vendorId,
          vehicleNumber: cleanVehicleNumber,
          vehicleType,
          seatingCapacity: parseInt(seatingCapacity || 4),
          fuelType: fuelType || 'DIESEL',
        },
        include: { vendor: true },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Vehicle',
        entityId: vehicle.id,
        newValue: vehicle,
      });

      return res.status(201).json(vehicle);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const vehicle = await prisma.vehicle.update({
        where: { id },
        data: req.body,
        include: { vendor: true },
      });
      return res.json(vehicle);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
