import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { logAudit } from '../common/utils/audit.logger';

export class UsersController {
  private static ensureAdmin(req: any, res: Response): boolean {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Access Denied: Only ADMIN accounts are authorized to view, assign, or delete user access roles.' });
      return false;
    }
    return true;
  }

  static async getAll(req: any, res: Response) {
    try {
      if (!UsersController.ensureAdmin(req, res)) return;
      const { role, status, search } = req.query;

      const where: any = {};
      if (role) where.role = String(role).toUpperCase();
      if (status) where.status = String(status).toUpperCase();
      if (search) {
        where.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          clientId: true,
          vendorId: true,
          createdAt: true,
          updatedAt: true,
          client: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      return res.json(users);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async getById(req: any, res: Response) {
    try {
      if (!UsersController.ensureAdmin(req, res)) return;
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          clientId: true,
          vendorId: true,
          createdAt: true,
          updatedAt: true,
          client: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      if (!user) return res.status(404).json({ error: 'User role not found' });
      return res.json(user);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: any, res: Response) {
    try {
      if (!UsersController.ensureAdmin(req, res)) return;
      const { name, email, password, role, status, clientId, vendorId } = req.body;

      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Name, email, password, and role are required' });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

      if (existingUser) {
        return res.status(400).json({ error: `A user account with email '${normalizedEmail}' already exists` });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          name: String(name).trim(),
          email: normalizedEmail,
          passwordHash,
          role: String(role).toUpperCase().trim(),
          status: status || 'ACTIVE',
          clientId: clientId || null,
          vendorId: vendorId || null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          clientId: true,
          vendorId: true,
          createdAt: true,
          client: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        newValue: user,
      });

      return res.status(201).json(user);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: any, res: Response) {
    try {
      if (!UsersController.ensureAdmin(req, res)) return;
      const { id } = req.params;
      const { name, email, password, role, status, clientId, vendorId } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        return res.status(404).json({ error: 'User account not found' });
      }

      const updateData: any = {};
      if (name) updateData.name = String(name).trim();
      if (email) updateData.email = String(email).toLowerCase().trim();
      if (role) updateData.role = String(role).toUpperCase().trim();
      if (status) updateData.status = String(status).toUpperCase();
      if (clientId !== undefined) updateData.clientId = clientId || null;
      if (vendorId !== undefined) updateData.vendorId = vendorId || null;

      if (password && String(password).trim().length > 0) {
        updateData.passwordHash = await bcrypt.hash(String(password), 10);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          clientId: true,
          vendorId: true,
          updatedAt: true,
          client: { select: { id: true, name: true } },
          vendor: { select: { id: true, name: true } },
        },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: user.id,
        oldValue: existingUser,
        newValue: user,
      });

      return res.json(user);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async delete(req: any, res: Response) {
    try {
      if (!UsersController.ensureAdmin(req, res)) return;
      const { id } = req.params;

      if (req.user?.id === id) {
        return res.status(400).json({ error: 'You cannot delete your own active admin account' });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ error: 'User account not found' });
      }

      await prisma.user.delete({ where: { id } });

      await logAudit({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'User',
        entityId: id,
        oldValue: user,
      });

      return res.json({ message: `User account '${user.name}' (${user.role}) deleted successfully` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
