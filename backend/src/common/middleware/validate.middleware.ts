import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        const fieldName = firstIssue?.path.join('.') || 'body';
        const msg = firstIssue ? `${fieldName}: ${firstIssue.message}` : 'Invalid input data';
        return res.status(400).json({
          error: `Validation Error: ${msg}`,
          details: err.issues,
        });
      }
      return res.status(400).json({ error: err.message || 'Invalid input data' });
    }
  };
}
