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
import { UsersController } from '../controllers/users.controller';
import { RolesController } from '../controllers/roles.controller';
import { authGuard } from '../common/guards/auth.guard';
import { requirePermission } from '../common/guards/permission.guard';
import { authLimiter } from '../common/middleware/rateLimiter';
import { validateBody } from '../common/middleware/validate.middleware';
import {
  LoginSchema,
  UserCreateSchema,
  UserUpdateSchema,
  ClientCreateSchema,
  VendorCreateSchema,
  VehicleCreateSchema,
  TripCreateSchema,
  InvoiceGenerateSchema,
  SettlementGenerateSchema,
  PaymentCreateOrderSchema,
  PaymentVerifySchema,
  RoleCreateSchema,
} from '../common/validators/schemas';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel (.xlsx) files are allowed.'));
    }
  },
});

const router = Router();

// Health & Keep-Alive Route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CABMITRA API', timestamp: new Date(), uptime: process.uptime() });
});

// Auth Routes
router.post('/auth/login', authLimiter, validateBody(LoginSchema), AuthController.login);
router.get('/auth/me', authGuard(), AuthController.getMe);

// Clients Routes
router.get('/clients', authGuard(), requirePermission('clients.read'), ClientsController.getAll);
router.get('/clients/:id', authGuard(), requirePermission('clients.read'), ClientsController.getById);
router.post('/clients', authGuard(['ADMIN']), requirePermission('clients.create'), validateBody(ClientCreateSchema), ClientsController.create);
router.put('/clients/:id', authGuard(['ADMIN']), requirePermission('clients.update'), ClientsController.update);

// Vendors Routes
router.get('/vendors', authGuard(), requirePermission('vendors.read'), VendorsController.getAll);
router.get('/vendors/:id', authGuard(), requirePermission('vendors.read'), VendorsController.getById);
router.post('/vendors', authGuard(['ADMIN']), requirePermission('vendors.create'), validateBody(VendorCreateSchema), VendorsController.create);
router.put('/vendors/:id', authGuard(['ADMIN']), requirePermission('vendors.update'), VendorsController.update);

// Vehicles Routes
router.get('/vehicles', authGuard(), VehiclesController.getAll);
router.post('/vehicles', authGuard(['ADMIN', 'OPERATIONS']), validateBody(VehicleCreateSchema), VehiclesController.create);
router.put('/vehicles/:id', authGuard(['ADMIN', 'OPERATIONS']), VehiclesController.update);

// Pricing Rules Routes
router.get('/pricing-rules', authGuard(), PricingController.getAll);
router.post('/pricing-rules', authGuard(['ADMIN']), PricingController.create);
router.post('/pricing-rules/calculate-preview', authGuard(), PricingController.calculatePreview);

// Trips Routes
router.get('/trips', authGuard(), requirePermission('trips.read'), TripsController.getAll);
router.post('/trips', authGuard(['ADMIN', 'OPERATIONS']), requirePermission('trips.create'), validateBody(TripCreateSchema), TripsController.create);
router.put('/trips/:id', authGuard(['ADMIN', 'OPERATIONS']), requirePermission('trips.update'), TripsController.update);
router.delete('/trips/:id', authGuard(['ADMIN']), requirePermission('trips.delete'), TripsController.delete);

// Excel / CSV Import Center Routes
router.post('/imports/upload', authGuard(['ADMIN', 'OPERATIONS']), upload.single('file'), ImportController.uploadAndReadHeaders);
router.post('/imports/save-mapping', authGuard(['ADMIN', 'OPERATIONS']), ImportController.saveMappingTemplate);
router.post('/imports/process', authGuard(['ADMIN', 'OPERATIONS']), ImportController.processImport);
router.get('/imports/history', authGuard(), ImportController.getHistory);

// Invoice Routes
router.get('/invoices', authGuard(['ADMIN', 'ACCOUNTS', 'CLIENT']), requirePermission('invoices.read'), InvoicesController.getAll);
router.get('/invoices/:id', authGuard(['ADMIN', 'ACCOUNTS', 'CLIENT']), requirePermission('invoices.read'), InvoicesController.getById);
router.post('/invoices/generate', authGuard(['ADMIN', 'ACCOUNTS']), requirePermission('invoices.create'), validateBody(InvoiceGenerateSchema), InvoicesController.generateInvoice);
router.get('/invoices/:id/pdf', authGuard(['ADMIN', 'ACCOUNTS', 'CLIENT']), requirePermission('invoices.read'), InvoicesController.downloadPdf);
router.post('/invoices/:id/send-email', authGuard(['ADMIN', 'ACCOUNTS', 'CLIENT']), requirePermission('invoices.read'), InvoicesController.sendEmail);
router.put('/invoices/:id/status', authGuard(['ADMIN', 'ACCOUNTS']), requirePermission('invoices.approve'), InvoicesController.updateStatus);

// Vendor Settlement Routes
router.get('/settlements', authGuard(), requirePermission('settlements.read'), SettlementsController.getAll);
router.get('/settlements/:id', authGuard(), requirePermission('settlements.read'), SettlementsController.getById);
router.post('/settlements/calculate-preview', authGuard(['ADMIN', 'ACCOUNTS']), requirePermission('settlements.create'), SettlementsController.calculatePreview);
router.post('/settlements/generate', authGuard(['ADMIN', 'ACCOUNTS']), requirePermission('settlements.create'), validateBody(SettlementGenerateSchema), SettlementsController.generate);
router.put('/settlements/:id/approve', authGuard(['ADMIN', 'ACCOUNTS']), requirePermission('settlements.approve'), SettlementsController.approve);
router.post('/settlements/:id/pay', authGuard(['ADMIN', 'ACCOUNTS']), requirePermission('settlements.approve'), SettlementsController.recordPayment);
router.get('/settlements/:id/pdf', authGuard(), requirePermission('settlements.read'), SettlementsController.downloadPdf);
router.post('/settlements/:id/send-email', authGuard(), requirePermission('settlements.read'), SettlementsController.sendEmail);
router.delete('/settlements/:id', authGuard(['ADMIN', 'ACCOUNTS']), requirePermission('settlements.approve'), SettlementsController.delete);

// Dashboard & Analytics Routes
router.get('/analytics/dashboard', authGuard(), AnalyticsController.getDashboard);

// Reports Routes
router.get('/reports/trips', authGuard(), requirePermission('reports.read'), ReportsController.getTripReport);
router.get('/reports/profit-loss', authGuard(['ADMIN', 'ACCOUNTS']), requirePermission('reports.read'), ReportsController.getProfitLossReport);

// Audit Logs & Notifications Routes
router.get('/audit-logs', authGuard(['ADMIN']), AuditController.getLogs);
router.get('/notifications', authGuard(), AuditController.getNotifications);
router.put('/notifications/:id/read', authGuard(), AuditController.markNotificationRead);

// Razorpay Payment System Routes
router.post('/payments/create-order', authGuard(), validateBody(PaymentCreateOrderSchema), PaymentsController.createOrder);
router.post('/payments/verify', authGuard(), validateBody(PaymentVerifySchema), PaymentsController.verifyPayment);
router.post('/payments/mark-failed', authGuard(), PaymentsController.markFailed);
router.post('/payments/webhook/razorpay', PaymentsController.handleWebhook);
router.post('/payments/test-webhook-trigger', PaymentsController.triggerTestWebhook);
router.get('/payments/status/:invoiceId', authGuard(), PaymentsController.getPaymentStatus);
router.get('/payments', authGuard(), PaymentsController.getAll);
router.post('/payments/:id/refund', authGuard(['ADMIN', 'ACCOUNTS']), PaymentsController.refund);

// Email Center & Communication Hub Routes
router.get('/emails', authGuard(), EmailsController.getAll);
router.get('/emails/:id', authGuard(), EmailsController.getById);
router.post('/emails/simulate-inbound', authGuard(), EmailsController.simulateInbound);

// User & Role Management Routes (Admin Only)
router.get('/users', authGuard(['ADMIN']), UsersController.getAll);
router.get('/users/:id', authGuard(['ADMIN']), UsersController.getById);
router.post('/users', authGuard(['ADMIN']), validateBody(UserCreateSchema), UsersController.create);
router.put('/users/:id', authGuard(['ADMIN']), validateBody(UserUpdateSchema), UsersController.update);
router.delete('/users/:id', authGuard(['ADMIN']), UsersController.delete);

// Dynamic Role Management Routes
router.get('/roles', authGuard(), RolesController.getAll);
router.post('/roles', authGuard(['ADMIN']), validateBody(RoleCreateSchema), RolesController.create);
router.put('/roles/:id', authGuard(['ADMIN']), RolesController.update);
router.delete('/roles/:id', authGuard(['ADMIN']), RolesController.delete);

export default router;
