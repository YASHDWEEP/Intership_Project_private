import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes';
import { apiLimiter } from './common/middleware/rateLimiter';

dotenv.config();

const app = express();

app.use(helmet({
  contentSecurityPolicy: false, // Disable default restrictive CSP for cross-origin PDF viewing & iframe embedding
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
}));

app.use('/api', apiLimiter);

app.use(
  express.json({
    limit: '20mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Root & Health Check
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center; color: #1e3a8a;">
      <h1 style="margin-bottom: 8px;">🚕 CABMITRA Enterprise API</h1>
      <p style="color: #4b5563; font-size: 15px; margin-top: 0;">Cab Operations, Billing & Vendor Settlement Platform API Service</p>
      <div style="margin-top: 20px; padding: 12px; background-color: #f3f4f6; display: inline-block; border-radius: 8px;">
        Status: <strong style="color: #059669;">LIVE ✅</strong> &nbsp;|&nbsp; Health Check: <a href="/health" style="color: #2563eb;">/health</a>
      </div>
    </div>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CABMITRA API Backend', timestamp: new Date() });
});

// API Routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
