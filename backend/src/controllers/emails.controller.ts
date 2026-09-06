import { Response } from 'express';
import { prisma } from '../config/prisma';
import { isClientUser } from '../common/guards/tenant.guard';

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

      if (isClientUser(req)) {
        const client = req.user.clientId
          ? await prisma.client.findUnique({ where: { id: req.user.clientId } })
          : null;
        const clientEmails = [req.user.email, client?.contactEmail].filter(Boolean) as string[];

        where.OR = clientEmails.map((email) => ({
          OR: [{ to: { contains: email } }, { from: { contains: email } }],
        })).flat();
      }

      if (search) {
        const searchCond = [
          { to: { contains: String(search) } },
          { from: { contains: String(search) } },
          { subject: { contains: String(search) } },
        ];
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: searchCond }];
          delete where.OR;
        } else {
          where.OR = searchCond;
        }
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

      if (isClientUser(req)) {
        const client = req.user.clientId
          ? await prisma.client.findUnique({ where: { id: req.user.clientId } })
          : null;
        const clientEmails = [req.user.email, client?.contactEmail].filter(Boolean) as string[];
        const isParticipant = clientEmails.some(
          (e) => email.to.toLowerCase().includes(e.toLowerCase()) || email.from.toLowerCase().includes(e.toLowerCase())
        );

        if (!isParticipant) {
          return res.status(403).json({ error: 'Forbidden: You cannot access emails belonging to another tenant' });
        }
      }

      return res.json(email);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async simulateInbound(req: any, res: Response) {
    try {
      let { from, subject, bodyHtml, clientName } = req.body;

      if (isClientUser(req)) {
        const client = req.user.clientId
          ? await prisma.client.findUnique({ where: { id: req.user.clientId } })
          : null;
        from = req.user.email || client?.contactEmail || 'rajesh.s@infosys.com';
        clientName = client?.name || req.user.clientName || 'Infosys Limited';
      }

      const senderEmail = from || 'rajesh.s@infosys.com';
      const companyName = clientName || 'Infosys Limited';

      const emailLog = await prisma.emailLog.create({
        data: {
          direction: 'INBOUND',
          type: 'INBOUND_QUERY',
          from: senderEmail,
          to: 'support@cabmitra.com',
          subject: subject || `Re: Cab Operations Invoice & Route Query (${companyName})`,
          bodyHtml: bodyHtml || `<p>Hi CabMitra Support Team,</p><p>We have reviewed the August cab operations invoice. Could you please share the detailed trip logs and vehicle route breakdown for our Whitefield pickup routes?</p><p>Regards,<br><strong>Rajesh Sharma</strong><br>${companyName} Transport Desk</p>`,
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

