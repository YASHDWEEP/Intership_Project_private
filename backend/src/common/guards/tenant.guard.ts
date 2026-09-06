import { Response } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name: string;
  clientId?: string | null;
  vendorId?: string | null;
}

/**
 * Checks if the authenticated request belongs to a corporate CLIENT role.
 */
export function isClientUser(req: any): boolean {
  return req.user?.role === 'CLIENT';
}

/**
 * Ensures the logged-in client user can only access resources belonging to their own tenant.
 * If the user is a CLIENT role and resourceClientId does not match req.user.clientId,
 * sends a 403 Forbidden HTTP response and returns false.
 */
export function validateTenantAccess(req: any, res: Response, resourceClientId: string | null | undefined): boolean {
  if (isClientUser(req)) {
    const userClientId = req.user?.clientId;
    if (!userClientId || !resourceClientId || userClientId !== resourceClientId) {
      res.status(403).json({
        error: 'Forbidden: You do not have authorization to access or modify resources belonging to another company tenant.',
      });
      return false;
    }
  }
  return true;
}

/**
 * Resolves the effective clientId for database queries and mutations.
 * For CLIENT role users, ALWAYS returns req.user.clientId, ignoring any frontend-supplied clientId.
 * For ADMIN/ACCOUNTS/OPERATIONS users, returns requestedClientId if provided, or undefined.
 */
export function getEffectiveClientId(req: any, requestedClientId?: string | null): string | undefined {
  if (isClientUser(req)) {
    return req.user?.clientId || undefined;
  }
  return requestedClientId ? String(requestedClientId) : undefined;
}

/**
 * Scopes a Prisma query filter object with tenant isolation.
 * For CLIENT role users, forces `clientId = req.user.clientId`.
 */
export function scopeTenantWhere<T extends Record<string, any>>(req: any, baseWhere: T = {} as T): T {
  if (isClientUser(req)) {
    return {
      ...baseWhere,
      clientId: req.user?.clientId,
    };
  }
  return baseWhere;
}
