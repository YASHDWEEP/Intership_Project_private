import { Response } from 'express';
import { prisma } from '../config/prisma';
import { logAudit } from '../common/utils/audit.logger';

const DEFAULT_SYSTEM_ROLES = [
  {
    name: 'ADMIN',
    description: 'System Administrator with full access to all system modules and user management',
    isSystem: true,
    permissions: ['*'],
  },
  {
    name: 'OPERATIONS',
    description: 'Operations Controller managing trips, fleet vehicles, imports, clients, and vendors',
    isSystem: true,
    permissions: ['dashboard', 'trips', 'import-center', 'clients', 'vendors', 'vehicles', 'email-center'],
  },
  {
    name: 'ACCOUNTS',
    description: 'Finance & Accounts Manager handling invoices, client payments, vendor settlements, and financial reports',
    isSystem: true,
    permissions: ['dashboard', 'trips', 'clients', 'vendors', 'invoices', 'payments', 'settlements', 'reports', 'email-center'],
  },
  {
    name: 'VENDOR',
    description: 'Vendor Transport Partner viewing assigned trips, earnings, payout settlements, and communication center',
    isSystem: true,
    permissions: ['dashboard', 'trips', 'settlements', 'email-center'],
  },
  {
    name: 'CLIENT',
    description: 'Corporate Client Portal user viewing trip history, client billing tax invoices, payments, and reports',
    isSystem: true,
    permissions: ['dashboard', 'invoices', 'payments', 'reports', 'email-center'],
  },
  {
    name: 'EMPLOYEE',
    description: 'Employee/Driver account with access to assigned trip details and email center',
    isSystem: false,
    permissions: ['dashboard', 'trips', 'email-center'],
  },
  {
    name: 'MANAGER',
    description: 'Department Manager overseeing operational performance, trip analytics, and reports',
    isSystem: false,
    permissions: ['dashboard', 'trips', 'reports', 'clients', 'vendors', 'vehicles', 'email-center'],
  },
];

export class RolesController {
  private static async seedDefaultRolesIfNeeded() {
    const count = await prisma.role.count();
    if (count === 0) {
      for (const r of DEFAULT_SYSTEM_ROLES) {
        await prisma.role.upsert({
          where: { name: r.name },
          update: {},
          create: {
            name: r.name,
            description: r.description,
            isSystem: r.isSystem,
            permissions: r.permissions,
          },
        });
      }
    }
  }

  static async getAll(req: any, res: Response) {
    try {
      await RolesController.seedDefaultRolesIfNeeded();

      const roles = await prisma.role.findMany({
        orderBy: { createdAt: 'asc' },
      });

      // Get user count per role
      const userCounts = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      });

      const countMap: Record<string, number> = {};
      userCounts.forEach((uc) => {
        countMap[uc.role] = uc._count.id;
      });

      const enriched = roles.map((r) => ({
        ...r,
        userCount: countMap[r.name] || 0,
      }));

      return res.json(enriched);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async create(req: any, res: Response) {
    try {
      const { name, description, permissions } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Role name is required' });
      }

      const roleName = String(name).trim().toUpperCase();
      const existing = await prisma.role.findUnique({ where: { name: roleName } });

      if (existing) {
        return res.status(400).json({ error: `Role '${roleName}' already exists in system` });
      }

      const newRole = await prisma.role.create({
        data: {
          name: roleName,
          description: description || `Custom system role: ${roleName}`,
          isSystem: false,
          permissions: Array.isArray(permissions) ? permissions : ['dashboard', 'trips'],
        },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'CREATE',
        entity: 'Role',
        entityId: newRole.id,
        newValue: newRole,
      });

      return res.status(201).json(newRole);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const { description, permissions } = req.body;

      const existing = await prisma.role.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Role not found' });

      const updated = await prisma.role.update({
        where: { id },
        data: {
          description: description !== undefined ? description : existing.description,
          permissions: Array.isArray(permissions) ? permissions : existing.permissions,
        },
      });

      await logAudit({
        userId: req.user?.id,
        action: 'UPDATE',
        entity: 'Role',
        entityId: id,
        oldValue: existing,
        newValue: updated,
      });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async delete(req: any, res: Response) {
    try {
      const { id } = req.params;
      const role = await prisma.role.findUnique({ where: { id } });
      if (!role) return res.status(404).json({ error: 'Role not found' });

      if (role.isSystem) {
        return res.status(400).json({ error: `Built-in system role '${role.name}' cannot be deleted` });
      }

      const usersWithRole = await prisma.user.count({ where: { role: role.name } });
      if (usersWithRole > 0) {
        return res.status(400).json({
          error: `Cannot delete role '${role.name}' because ${usersWithRole} user account(s) are currently assigned to it. Reassign these users first.`,
        });
      }

      await prisma.role.delete({ where: { id } });

      await logAudit({
        userId: req.user?.id,
        action: 'DELETE',
        entity: 'Role',
        entityId: id,
        oldValue: role,
      });

      return res.json({ message: `Role '${role.name}' deleted successfully` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
