import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes';

dotenv.config();

const app = express();

app.use(cors());
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
