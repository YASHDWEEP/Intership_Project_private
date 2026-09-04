import { Response } from 'express';
import { prisma } from '../config/prisma';

export class EmailsController {
  static async getAll(req: any, res: Response) {
    try {
      const { direction, type, search } = req.query;

      let where: any = {};
      if (direction && direction !== 'ALL') {
        where.direction = direction;
      }
      if (type && type !== 'ALL') {
        where.type = type;
      }
      if (search) {
        where.OR = [
          { to: { contains: search } },
          { from: { contains: search } },
          { subject: { contains: search } },
        ];
      }

      const emails = await prisma.emailLog.findMany({
        where,
        orderBy: { sentAt: 'desc' },
      });

      return res.json(emails);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: any, res: Response) {
    try {
      const { id } = req.params;
      const email = await prisma.emailLog.findUnique({
        where: { id },
      });

      if (!email) return res.status(404).json({ error: 'Email log not found' });
      return res.json(email);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async simulateInbound(req: any, res: Response) {
    try {
      const { from, subject, bodyHtml, clientName } = req.body;

      const emailLog = await prisma.emailLog.create({
        data: {
          direction: 'INBOUND',
          type: 'INBOUND_QUERY',
          from: from || 'rajesh.s@infosys.com',
          to: 'support@cabmitra.com',
          subject: subject || `Re: Cab Operations Invoice Query (${clientName || 'Infosys'})`,
          bodyHtml: bodyHtml || `<p>Hi CabMitra Support Team,</p><p>We have reviewed the August cab operations invoice. Could you please share the detailed trip logs for whitefield pickup routes?</p><p>Regards,<br><strong>${clientName || 'Infosys Limited'}</strong></p>`,
          status: 'DELIVERED',
          entityType: 'Query',
        },
      });

      return res.status(201).json(emailLog);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
