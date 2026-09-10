import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address format').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const UserCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().trim().toUpperCase(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  clientId: z.string().nullable().optional(),
  vendorId: z.string().nullable().optional(),
});

export const UserUpdateSchema = z.object({
  name: z.string().min(2).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.string().trim().toUpperCase().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  clientId: z.string().nullable().optional(),
  vendorId: z.string().nullable().optional(),
});

export const ClientCreateSchema = z.object({
  name: z.string().min(2, 'Client company name required').trim(),
  gstNumber: z.string().min(5, 'GST number required').trim(),
  contactPerson: z.string().min(2, 'Contact person name required').trim(),
  contactEmail: z.string().email('Invalid contact email').trim().toLowerCase(),
  phone: z.string().min(7, 'Phone number required').trim(),
  billingCycle: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().default('MONTHLY'),
});

export const VendorCreateSchema = z.object({
  name: z.string().min(2, 'Vendor name required').trim(),
  companyName: z.string().min(2, 'Company name required').trim(),
  gstNumber: z.string().min(5, 'GST number required').trim(),
  phone: z.string().min(7, 'Phone number required').trim(),
  email: z.string().email('Invalid email').trim().toLowerCase(),
  address: z.string().min(2, 'Address required').trim(),
  commissionType: z.enum(['PERCENTAGE', 'FIXED']).optional().default('PERCENTAGE'),
  commissionValue: z.number().min(0, 'Commission value must be >= 0').optional().default(10.0),
});

export const VehicleCreateSchema = z.object({
  vendorId: z.string().min(1, 'Vendor ID required'),
  vehicleNumber: z.string().min(3, 'Vehicle number required').trim().toUpperCase(),
  vehicleType: z.string().min(2, 'Vehicle type required').trim(),
  seatingCapacity: z.number().int().min(1).optional().default(4),
  fuelType: z.enum(['DIESEL', 'PETROL', 'CNG', 'ELECTRIC']).optional().default('DIESEL'),
});

export const TripCreateSchema = z.object({
  tripDate: z.string().min(1, 'Trip date required'),
  clientId: z.string().min(1, 'Client ID required'),
  vendorId: z.string().min(1, 'Vendor ID required'),
  vehicleId: z.string().nullable().optional(),
  vehicleNumber: z.string().min(3, 'Vehicle number required').trim().toUpperCase(),
  vehicleType: z.string().min(2).optional().default('4 Seater'),
  employeeCount: z.number().int().min(1).optional().default(1),
  totalKm: z.number().positive('Total KM must be greater than 0'),
  tripCategory: z.enum(['PICKUP', 'DROP', 'OUTSTATION', 'RENTAL']).optional().default('PICKUP'),
  billCategory: z.enum(['REGULAR', 'ADHOC', 'NIGHT']).optional().default('REGULAR'),
  waitingTime: z.number().min(0).optional().default(0),
  tollAmount: z.number().min(0).optional().default(0),
  parkingAmount: z.number().min(0).optional().default(0),
});

export const InvoiceGenerateSchema = z.object({
  clientId: z.string().min(1, 'Client ID required'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  dueDate: z.string().optional(),
});

export const SettlementGenerateSchema = z.object({
  vendorId: z.string().min(1, 'Vendor ID required'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  deductions: z.array(z.object({
    type: z.string().min(1),
    amount: z.number().min(0),
    reason: z.string().min(1),
  })).optional().default([]),
});

export const PaymentCreateOrderSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID required'),
});

export const PaymentVerifySchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID required'),
  razorpayOrderId: z.string().min(1, 'Order ID required'),
  razorpayPaymentId: z.string().min(1, 'Payment ID required'),
  razorpaySignature: z.string().optional(),
  method: z.string().optional(),
});

export const RoleCreateSchema = z.object({
  name: z.string().min(2, 'Role name required').trim().toUpperCase(),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});
