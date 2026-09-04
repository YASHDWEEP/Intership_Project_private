import { Response } from 'express';
import { prisma } from '../config/prisma';
import { logAudit } from '../common/utils/audit.logger';

export class ClientsController {
  static async getAll(req: any, res: Response) {
    try {
      const clients = await prisma.client.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { trips: true, invoices: true, pricingRules: true },
          },
        },
      });
      return res.json(clients);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: any, res: Response) {
    try {
      const { id } = req.params;
      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          trips: { take: 20, orderBy: { tripDate: 'desc' } },
          pricingRules: { include: { slabs: true } },
          invoices: { orderBy: { generatedAt: 'desc' } },
          importMappings: true,
        },
      });
      if (!client) return res.status(404).json({ error: 'Client not found' });
      return res.json(client);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: any, res: Response) {
    try {
      const { name, gstNumber, contactPerson, contactEmail, phone, billingCycle } = req.body;
      const client = await prisma.client.create({
        data: {
          name,
          gstNumber,
          contactPerson,
          contactEmail,
          phone,
          billingCycle: billingCycle || 'MONTHLY',
        },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Client',
        entityId: client.id,
        newValue: client,
      });

      return res.status(201).json(client);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const oldClient = await prisma.client.findUnique({ where: { id } });
      const client = await prisma.client.update({
        where: { id },
        data: req.body,
      });

      await logAudit({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Client',
        entityId: client.id,
        oldValue: oldClient,
        newValue: client,
      });

      return res.json(client);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
