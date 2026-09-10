import http from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import app from '../app';
import { roundMoney, calculateGst, calculateCommission } from '../common/utils/money.util';

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

async function runSecurityMatrixTests() {
  console.log('================================================================');
  console.log('=== CABMITRA FULL SECURITY HARDENING & FINANCIAL TEST MATRIX ===');
  console.log('================================================================\n');

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      port = typeof address === 'object' && address ? address.port : 4050;
      console.log(`🔒 Test server initialized on port ${port}`);
      resolve();
    });
  });

  let passed = 0;
  let failed = 0;

  function assertTest(condition: boolean, title: string, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title} - ${details || 'Assertion failed'}`);
      failed++;
    }
  }

  try {
    const pwdHash = '$2a$10$76d29H3F8r6f5r8h9s1u2e3i4o5p6a7b8c9d0e1f2g3h4i5j6k';

    // Seed test tenants
    const clientA = await prisma.client.upsert({
      where: { id: 'sec-client-alpha' },
      update: {},
      create: {
        id: 'sec-client-alpha',
        name: 'Client Alpha Security Test',
        gstNumber: '29AAAAA1111A1Z1',
        contactPerson: 'Alice',
        contactEmail: 'alice@alpha-sec.com',
        phone: '9111111111',
      },
    });

    const clientB = await prisma.client.upsert({
      where: { id: 'sec-client-beta' },
      update: {},
      create: {
        id: 'sec-client-beta',
        name: 'Client Beta Security Test',
        gstNumber: '29BBBBB2222B1Z2',
        contactPerson: 'Bob',
        contactEmail: 'bob@beta-sec.com',
        phone: '9222222222',
      },
    });

    const userClientA = await prisma.user.upsert({
      where: { email: 'sec.user.alpha@test.com' },
      update: { clientId: clientA.id },
      create: {
        id: 'user-sec-alpha',
        name: 'Alpha User',
        email: 'sec.user.alpha@test.com',
        passwordHash: pwdHash,
        role: 'CLIENT',
        clientId: clientA.id,
      },
    });

    const userOps = await prisma.user.upsert({
      where: { email: 'sec.ops@test.com' },
      update: {},
      create: {
        id: 'user-sec-ops',
        name: 'Ops User',
        email: 'sec.ops@test.com',
        passwordHash: pwdHash,
        role: 'OPERATIONS',
      },
    });

    const tokenClientA = signToken(userClientA);
    const tokenOps = signToken(userOps);

    // Scenario 1: Unauthenticated API request -> 401
    const res1 = await request('GET', '/api/clients');
    assertTest(res1.status === 401, '1. Unauthenticated API request returns 401 Unauthorized', `Status: ${res1.status}`);

    // Scenario 2: Authenticated but unauthorized role accessing admin user management -> 403
    const res2 = await request('GET', '/api/users', tokenOps);
    assertTest(res2.status === 403, '2. Authenticated non-admin accessing /api/users returns 403 Forbidden', `Status: ${res2.status}`);

    // Scenario 3: Client A accesses Client B's client resource -> 403
    const res3 = await request('GET', `/api/clients/${clientB.id}`, tokenClientA);
    assertTest(res3.status === 403, "3. Client A attempting to access Client B's details returns 403 Forbidden", `Status: ${res3.status}`);

    // Scenario 4: User modifies tenantId / clientId in body -> Rejected by Zod validation / tenant guard
    const res4 = await request('POST', '/api/trips', tokenClientA, {
      tripDate: new Date().toISOString(),
      clientId: clientB.id,
      vendorId: 'dummy-vendor',
      vehicleNumber: 'KA-01-SEC-1234',
      totalKm: -15.0, // negative KM
    });
    assertTest(res4.status === 400 || res4.status === 403, '4. Tampered request body (negative KM / modified tenantId) rejected with 400/403', `Status: ${res4.status}`);

    // Scenario 5: User enumeration prevention on login
    const res5 = await request('POST', '/api/auth/login', undefined, {
      email: 'nonexistent.user.test@cabmitra.com',
      password: 'WrongPassword123!',
    });
    assertTest(
      res5.status === 401 && res5.body?.error === 'Invalid email or password.',
      '5. User enumeration prevention returns generic "Invalid email or password" error',
      `Error: ${JSON.stringify(res5.body)}`
    );

    // Scenario 6: Financial engine decimal precision verification
    const val1 = roundMoney(0.1 + 0.2);
    const taxVal = calculateGst(1000.0, 5.0);
    const commVal = calculateCommission(1550.5, 10.0);
    assertTest(val1 === 0.3 && taxVal === 50.0 && commVal === 155.05, '6. Financial decimal rounding utility precision verified (0.1+0.2=0.3, GST=50, Comm=155.05)');

    // Scenario 7: Invalid Invoice State Transition (PAID -> DRAFT) -> 400
    const invTest = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-SEC-TEST-${Date.now()}`,
        clientId: clientA.id,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        subtotal: 1000.0,
        taxAmount: 50.0,
        totalAmount: 1050.0,
        status: 'PAID',
        dueDate: new Date(),
      },
    });

    const res7 = await request('PUT', `/api/invoices/${invTest.id}/status`, signToken({ role: 'ADMIN' }), {
      status: 'DRAFT',
    });
    assertTest(res7.status === 400, '7. Illegal invoice state transition (PAID -> DRAFT) rejected with HTTP 400', `Status: ${res7.status}`);

    // Clean up test invoice
    await prisma.invoice.delete({ where: { id: invTest.id } }).catch(() => {});

    console.log(`\n================================================================`);
    console.log(`=== SECURITY MATRIX TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
    console.log(`================================================================\n`);

    server.close();
    await prisma.$disconnect();
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Security Matrix Test error:', err);
    server.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

runSecurityMatrixTests();
