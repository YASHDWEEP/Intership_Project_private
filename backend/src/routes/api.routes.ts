import { Router } from 'express';
import multer from 'multer';
import { AuthController } from '../controllers/auth.controller';
import { ClientsController } from '../controllers/clients.controller';
import { VendorsController } from '../controllers/vendors.controller';
import { VehiclesController } from '../controllers/vehicles.controller';
import { PricingController } from '../controllers/pricing.controller';
import { TripsController } from '../controllers/trips.controller';
import { ImportController } from '../controllers/import.controller';
import { InvoicesController } from '../controllers/invoices.controller';
import { SettlementsController } from '../controllers/settlements.controller';
import { AnalyticsController } from '../controllers/analytics.controller';
import { ReportsController } from '../controllers/reports.controller';
import { AuditController } from '../controllers/audit.controller';
import { PaymentsController } from '../controllers/payments.controller';
import { EmailsController } from '../controllers/emails.controller';
import { authGuard } from '../common/guards/auth.guard';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// Health & Keep-Alive Route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CABMITRA API', timestamp: new Date(), uptime: process.uptime() });
});

// Auth Routes
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authGuard(), AuthController.getMe);

// Clients Routes
router.get('/clients', authGuard(), ClientsController.getAll);
router.get('/clients/:id', authGuard(), ClientsController.getById);
router.post('/clients', authGuard(['ADMIN']), ClientsController.create);
router.put('/clients/:id', authGuard(['ADMIN']), ClientsController.update);

// Vendors Routes
router.get('/vendors', authGuard(), VendorsController.getAll);
router.get('/vendors/:id', authGuard(), VendorsController.getById);
router.post('/vendors', authGuard(['ADMIN']), VendorsController.create);
router.put('/vendors/:id', authGuard(['ADMIN']), VendorsController.update);

// Vehicles Routes
router.get('/vehicles', authGuard(), VehiclesController.getAll);
router.post('/vehicles', authGuard(['ADMIN', 'OPERATIONS']), VehiclesController.create);
router.put('/vehicles/:id', authGuard(['ADMIN', 'OPERATIONS']), VehiclesController.update);

// Pricing Rules Routes
router.get('/pricing-rules', authGuard(), PricingController.getAll);
router.post('/pricing-rules', authGuard(['ADMIN']), PricingController.create);
router.post('/pricing-rules/calculate-preview', authGuard(), PricingController.calculatePreview);

// Trips Routes
router.get('/trips', authGuard(), TripsController.getAll);
router.post('/trips', authGuard(['ADMIN', 'OPERATIONS']), TripsController.create);
router.put('/trips/:id', authGuard(['ADMIN', 'OPERATIONS']), TripsController.update);
router.delete('/trips/:id', authGuard(['ADMIN']), TripsController.delete);

// Excel / CSV Import Center Routes
router.post('/imports/upload', authGuard(['ADMIN', 'OPERATIONS']), upload.single('file'), ImportController.uploadAndReadHeaders);
router.post('/imports/save-mapping', authGuard(['ADMIN', 'OPERATIONS']), ImportController.saveMappingTemplate);
router.post('/imports/process', authGuard(['ADMIN', 'OPERATIONS']), ImportController.processImport);
router.get('/imports/history', authGuard(), ImportController.getHistory);

// Invoice Routes
router.get('/invoices', authGuard(), InvoicesController.getAll);
router.get('/invoices/:id', authGuard(), InvoicesController.getById);
router.post('/invoices/generate', authGuard(['ADMIN', 'ACCOUNTS']), InvoicesController.generateInvoice);
router.get('/invoices/:id/pdf', authGuard(), InvoicesController.downloadPdf);
router.post('/invoices/:id/send-email', authGuard(), InvoicesController.sendEmail);
router.put('/invoices/:id/status', authGuard(['ADMIN', 'ACCOUNTS']), InvoicesController.updateStatus);

// Vendor Settlement Routes
router.get('/settlements', authGuard(), SettlementsController.getAll);
router.get('/settlements/:id', authGuard(), SettlementsController.getById);
router.post('/settlements/calculate-preview', authGuard(['ADMIN', 'ACCOUNTS']), SettlementsController.calculatePreview);
router.post('/settlements/generate', authGuard(['ADMIN', 'ACCOUNTS']), SettlementsController.generate);
router.put('/settlements/:id/approve', authGuard(['ADMIN', 'ACCOUNTS']), SettlementsController.approve);
router.post('/settlements/:id/pay', authGuard(['ADMIN', 'ACCOUNTS']), SettlementsController.recordPayment);
router.get('/settlements/:id/pdf', authGuard(), SettlementsController.downloadPdf);
router.post('/settlements/:id/send-email', authGuard(), SettlementsController.sendEmail);

// Dashboard & Analytics Routes
router.get('/analytics/dashboard', authGuard(), AnalyticsController.getDashboard);

// Reports Routes
router.get('/reports/trips', authGuard(), ReportsController.getTripReport);
router.get('/reports/profit-loss', authGuard(['ADMIN', 'ACCOUNTS']), ReportsController.getProfitLossReport);

// Audit Logs & Notifications Routes
router.get('/audit-logs', authGuard(['ADMIN']), AuditController.getLogs);
router.get('/notifications', authGuard(), AuditController.getNotifications);
router.put('/notifications/:id/read', authGuard(), AuditController.markNotificationRead);

// Razorpay Payment System Routes
router.post('/payments/create-order', authGuard(), PaymentsController.createOrder);
router.post('/payments/verify', authGuard(), PaymentsController.verifyPayment);
router.post('/payments/webhook/razorpay', PaymentsController.handleWebhook);
router.post('/payments/test-webhook-trigger', PaymentsController.triggerTestWebhook);
router.get('/payments/status/:invoiceId', authGuard(), PaymentsController.getPaymentStatus);
router.get('/payments', authGuard(), PaymentsController.getAll);
router.post('/payments/:id/refund', authGuard(['ADMIN', 'ACCOUNTS']), PaymentsController.refund);

// Email Center & Communication Hub Routes
router.get('/emails', authGuard(), EmailsController.getAll);
router.get('/emails/:id', authGuard(), EmailsController.getById);
router.post('/emails/simulate-inbound', authGuard(), EmailsController.simulateInbound);

export default router;
