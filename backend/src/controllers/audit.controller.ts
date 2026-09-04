import { Response } from 'express';
import { prisma } from '../config/prisma';

export class AuditController {
  static async getLogs(req: any, res: Response) {
    try {
      const logs = await prisma.auditLog.findMany({
        take: 100,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { name: true, email: true, role: true } },
        },
      });
      return res.json(logs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getNotifications(req: any, res: Response) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      return res.json(notifications);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async markNotificationRead(req: any, res: Response) {
    try {
      const { id } = req.params;
      await prisma.notification.update({
        where: { id },
        data: { read: true },
      });
      return res.json({ message: 'Notification marked as read' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
