import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.guard';
import { prisma } from '../../config/prisma';

// In-memory cache for dynamic role permissions with 60s TTL
const permissionCache = new Map<string, { permissions: string[]; timestamp: number }>();
const CACHE_TTL_MS = 60000;

async function getPermissionsForRole(roleName: string): Promise<string[]> {
  const cached = permissionCache.get(roleName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.permissions;
  }

  const roleRecord = await prisma.role.findUnique({
    where: { name: roleName },
    select: { permissions: true },
  });

  const permissions = roleRecord?.permissions || [];
  permissionCache.set(roleName, { permissions, timestamp: Date.now() });
  return permissions;
}

/**
 * Middleware that verifies if the logged-in user possesses the required permission.
 * Super Administrators ('ADMIN' role or '*' permission) bypass explicit token requirements.
 */
export const requirePermission = (requiredPermission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const userRole = req.user.role;

    if (userRole === 'ADMIN') {
      return next();
    }

    try {
      const userPermissions = await getPermissionsForRole(userRole);
      const baseModule = requiredPermission.split('.')[0];

      if (
        userPermissions.includes('*') ||
        userPermissions.includes(requiredPermission) ||
        userPermissions.includes(baseModule)
      ) {
        return next();
      }

      return res.status(403).json({
        error: `Forbidden: Your account role '${userRole}' lacks permission '${requiredPermission}' to execute this action.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Internal server error validating user permissions' });
    }
  };
};
