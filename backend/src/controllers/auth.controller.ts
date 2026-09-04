import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          client: true,
          vendor: true,
        },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials. User not found.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
      }

      if (user.status !== 'ACTIVE') {
        return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
      }

      const tokenPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clientId: user.clientId,
        vendorId: user.vendorId,
      };

      const secret = process.env.JWT_SECRET || 'cabmitra_super_secret_jwt_key_2026';
      const token = jwt.sign(tokenPayload, secret, { expiresIn: '7d' });

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clientId: user.clientId,
          vendorId: user.vendorId,
          clientName: user.client?.name,
          vendorName: user.vendor?.name,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  static async getMe(req: any, res: Response) {
    try {
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          client: true,
          vendor: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        vendorId: user.vendorId,
        clientName: user.client?.name,
        vendorName: user.vendor?.name,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
