import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
    clientId?: string | null;
    vendorId?: string | null;
  };
}

export const authGuard = (allowedRoles: string[] = []) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = String(req.query.token);
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }
    try {
      const secret = process.env.JWT_SECRET || 'cabmitra_super_secret_jwt_key_2026';
      const decoded = jwt.verify(token, secret) as any;
      req.user = decoded;

      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: `Forbidden: Role '${decoded.role}' does not have access to this resource` });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: Token signature invalid or expired' });
    }
  };
};
