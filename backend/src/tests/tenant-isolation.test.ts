import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../app';

const SECRET = process.env.JWT_SECRET || 'cabmitra_super_secret_jwt_key_2026';

function signToken(user: any) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientId: user.clientId,
      vendorId: user.vendorId,
    },
    SECRET,
    { expiresIn: '1h' }
  );
}

let server: http.Server;
let port: number;

async function request(
  method: string,
  path: string,
  token?: string,
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request(
      `http://localhost:${port}${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch (e) {}
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== MULTI-TENANT CLIENT DATA ISOLATION SECURITY AUDIT TEST SUITE ===\n');

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      port = typeof address === 'object' && address ? address.port : 3999;
      console.log(`Test server running on port ${port}`);
      resolve();
    });
  });

  try {

    // Seed system default roles in DB catalog so permissions like 'trips' exist for CLIENT role
    await prisma.role.upsert({
      where: { name: 'CLIENT' },
      update: { permissions: ['dashboard', 'trips', 'trips.read', 'invoices', 'invoices.read', 'payments', 'reports', 'email-center'] },
      create: {
        name: 'CLIENT',
        description: 'Corporate Client Portal user',
        isSystem: true,
        permissions: ['dashboard', 'trips', 'trips.read', 'invoices', 'invoices.read', 'payments', 'reports', 'email-center'],
      },
    });

    // Setup test data in DB
    const pwdHash = '$2a$10$76d29H3F8r6f5r8h9s1u2e3i4o5p6a7b8c9d0e1f2g3h4i5j6k';

    // 1. Create Tenant A (Infosys) & Tenant B (Wipro)

    const infosysClient = await prisma.client.upsert({
      where: { id: 'test-client-infosys' },
      update: { name: 'Infosys Test' },
      create: {
        id: 'test-client-infosys',
        name: 'Infosys Test',
        gstNumber: '29AAACI1681G1Z0',
        contactPerson: 'Rajesh S',
        contactEmail: 'rajesh.s@infosys-test.com',
        phone: '9876543210',
      },
    });

    const wiproClient = await prisma.client.upsert({
      where: { id: 'test-client-wipro' },
      update: { name: 'Wipro Test' },
      create: {
        id: 'test-client-wipro',
        name: 'Wipro Test',
        gstNumber: '29AAACW1234G1Z1',
        contactPerson: 'Suresh M',
        contactEmail: 'suresh.m@wipro-test.com',
        phone: '9876543211',
      },
    });

    const vendor = await prisma.vendor.upsert({
      where: { id: 'test-vendor-1' },
      update: {},
      create: {
        id: 'test-vendor-1',
        name: 'Test Vendor Travels',
        companyName: 'Test Vendor Private Limited',
        gstNumber: '29AAABV5678G1Z2',
        phone: '9998887770',
        email: 'ops@testvendor.com',
        address: 'Bangalore',
      },
    });

    // Create Client Users
    const infosysUser = await prisma.user.upsert({
      where: { email: 'client.infosys@test.com' },
      update: { clientId: infosysClient.id },
      create: {
        id: 'user-infosys-1',
        name: 'Infosys Client User',
        email: 'client.infosys@test.com',
        passwordHash: pwdHash,
        role: 'CLIENT',
        clientId: infosysClient.id,
      },
    });

    const wiproUser = await prisma.user.upsert({
      where: { email: 'client.wipro@test.com' },
      update: { clientId: wiproClient.id },
      create: {
        id: 'user-wipro-1',
        name: 'Wipro Client User',
        email: 'client.wipro@test.com',
        passwordHash: pwdHash,
        role: 'CLIENT',
        clientId: wiproClient.id,
      },
    });

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin.super@test.com' },
      update: {},
      create: {
        id: 'user-admin-1',
        name: 'Super Admin User',
        email: 'admin.super@test.com',
        passwordHash: pwdHash,
        role: 'ADMIN',
      },
    });

    // Create test trips for both tenants
    const infosysTrip = await prisma.trip.create({
      data: {
        tripDate: new Date(),
        clientId: infosysClient.id,
        vendorId: vendor.id,
        vehicleNumber: 'KA-01-INF-1001',
        vehicleType: '4 Seater',
        totalKm: 25.5,
        tripRevenue: 850.0,
        vendorCost: 650.0,
        status: 'VALIDATED',
      },
    });

    const wiproTrip = await prisma.trip.create({
      data: {
        tripDate: new Date(),
        clientId: wiproClient.id,
        vendorId: vendor.id,
        vehicleNumber: 'KA-01-WIP-2002',
        vehicleType: '6 Seater',
        totalKm: 40.0,
        tripRevenue: 1400.0,
        vendorCost: 1100.0,
        status: 'VALIDATED',
      },
    });

    // Create test invoice for Wipro
    const wiproInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-TEST-WIPRO-${Date.now()}`,
        clientId: wiproClient.id,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        subtotal: 1400.0,
        taxAmount: 70.0,
        totalAmount: 1470.0,
        status: 'GENERATED',
        dueDate: new Date(Date.now() + 864000000),
      },
    });

    const infosysToken = signToken(infosysUser);
    const wiproToken = signToken(wiproUser);
    const adminToken = signToken(adminUser);

    let passed = 0;
    let failed = 0;

    function assertTest(condition: boolean, title: string, details?: string) {
      if (condition) {
        console.log(`[PASS] ${title}`);
        passed++;
      } else {
        console.error(`[FAIL] ${title} - ${details || 'Assertion failed'}`);
        failed++;
      }
    }

    // Scenario 1: Infosys logs in -> can access Infosys data
    const res1 = await request('GET', '/api/trips', infosysToken);
    const infosysTrips = res1.body.data || [];
    const onlyInfosysData = res1.status === 200 && infosysTrips.length > 0 && infosysTrips.every((t: any) => t.clientId === infosysClient.id);
    assertTest(onlyInfosysData, '1. Infosys logs in -> can access Infosys data only', `Status: ${res1.status}, Count: ${infosysTrips.length}, ClientIds: ${infosysTrips.map((t: any) => t.clientId).join(',')}`);

    // Scenario 2: Infosys logs in -> cannot access Company B (Wipro) data
    const res2 = await request('GET', `/api/trips?clientId=${wiproClient.id}`, infosysToken);
    const triesToFetchWipro = res2.status === 403 || (res2.status === 200 && (res2.body.data || []).every((t: any) => t.clientId === infosysClient.id));
    assertTest(triesToFetchWipro, '2. Infosys logs in -> cannot access Company B (Wipro) data');

    // Scenario 3: Infosys attempts to download Company B's report -> 403 Forbidden
    const res3 = await request('GET', `/api/reports/trips?clientId=${wiproClient.id}`, infosysToken);
    assertTest(res3.status === 403, '3. Infosys attempts to download Company B report -> 403 Forbidden', `Got status ${res3.status}`);

    // Scenario 4: Infosys attempts to generate Company B's report/invoice -> request rejected with 403
    const res4 = await request('POST', '/api/invoices/generate', infosysToken, {
      clientId: wiproClient.id,
      startDate: new Date(Date.now() - 864000000).toISOString(),
      endDate: new Date().toISOString(),
    });
    assertTest(res4.status === 403, '4. Infosys attempts to generate Company B invoice -> 403 Forbidden', `Got status ${res4.status}`);

    // Scenario 5: Infosys attempts to access Company B's payment/invoice status using ID -> 403 Forbidden
    const res5 = await request('GET', `/api/payments/status/${wiproInvoice.id}`, infosysToken);
    assertTest(res5.status === 403, '5. Infosys attempts to access Company B payment status using ID -> 403 Forbidden', `Got status ${res5.status}`);

    // Scenario 6: Infosys modifies clientId in request body during trip creation -> backend overrides/rejects
    const res6 = await request('POST', '/api/trips', infosysToken, {
      tripDate: new Date().toISOString(),
      clientId: wiproClient.id, // malicious body manipulation
      vendorId: vendor.id,
      vehicleNumber: 'KA-01-INF-9999',
      vehicleType: '4 Seater',
      totalKm: 15.0,
    });
    const bodyTamperPrevented = res6.status === 403 || (res6.status === 201 && res6.body.clientId === infosysClient.id);
    assertTest(bodyTamperPrevented, '6. Infosys modifies clientId in request body -> backend overrides/rejects cross-tenant assignment');

    // Scenario 7: Infosys modifies clientId in URL/query parameter -> backend prevents access
    const res7 = await request('GET', `/api/clients/${wiproClient.id}`, infosysToken);
    assertTest(res7.status === 403, '7. Infosys modifies clientId in URL -> backend prevents access with 403 Forbidden', `Got status ${res7.status}`);

    // Scenario 8: Infosys cannot access another tenant's files/documents (Invoice PDF)
    const res8 = await request('GET', `/api/invoices/${wiproInvoice.id}/pdf`, infosysToken);
    assertTest(res8.status === 403, "8. Infosys cannot access another tenant's files/documents (Invoice PDF -> 403 Forbidden)", `Got status ${res8.status}`);

    // Scenario 9: Company B (Wipro) cannot access Infosys's data
    const res9 = await request('GET', `/api/clients/${infosysClient.id}`, wiproToken);
    assertTest(res9.status === 403, "9. Company B (Wipro) cannot access Infosys's client details -> 403 Forbidden", `Got status ${res9.status}`);

    // Scenario 10: Admin / Super Admin functionality continues to work according to authorized role
    const res10 = await request('GET', '/api/clients', adminToken);
    assertTest(res10.status === 200 && Array.isArray(res10.body) && res10.body.length >= 2, '10. Admin / Super Admin functionality continues to work across all client tenants', `Got status ${res10.status}`);

    console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);

    // Clean up created test data
    await prisma.trip.deleteMany({ where: { id: { in: [infosysTrip.id, wiproTrip.id] } } }).catch(() => {});
    await prisma.invoice.deleteMany({ where: { id: wiproInvoice.id } }).catch(() => {});

    server.close();
    await prisma.$disconnect();
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    server.close();
    await prisma.$disconnect();
    process.exit(1);
  }

}

runTests();
