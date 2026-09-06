import axios from 'axios';
import { prisma } from '../config/prisma';

const API_BASE = 'http://localhost:5000/api';

async function runPaymentFixesTestSuite() {
  console.log('====================================================');
  console.log('  STARTING AUTOMATED TEST SUITE FOR THE 3 FIXES    ');
  console.log('====================================================\n');

  let adminToken = '';
  let testClientId = '';
  let testVendorId = '';
  let passedCount = 0;
  let totalCount = 0;

  function recordResult(testName: string, passed: boolean, details: string = '') {
    totalCount++;
    if (passed) {
      passedCount++;
      console.log(`✅ PASSED [${totalCount}]: ${testName} ${details}`);
    } else {
      console.error(`❌ FAILED [${totalCount}]: ${testName} - ${details}`);
    }
  }

  try {
    // 1. Authenticate Admin User
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@cabmitra.com',
      password: 'Password@123',
    });
    adminToken = adminLogin.data.token;
    console.log('🔒 Logged in as Admin user');

    // 2. Fetch Clients
    const clientsRes = await axios.get(`${API_BASE}/clients`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const clientObj = clientsRes.data[0];
    testClientId = clientObj.id;
    console.log(`🏢 Selected Corporate Client: ${clientObj.name} (${testClientId})`);

    // 3. Setup clean baseline date range for Test 1
    const startDate = '2026-08-01';
    const endDate = '2026-08-31';
    const testStart = new Date(startDate);
    const testEnd = new Date(endDate);

    // Fetch vendor for dummy trip creation if needed
    const vendor = await prisma.vendor.findFirst();
    testVendorId = vendor ? vendor.id : '';

    // Clean up previous test invoices/items/payments/trips for test client to ensure a 100% clean baseline
    const oldInvoices = await prisma.invoice.findMany({ where: { clientId: testClientId } });
    const oldInvIds = oldInvoices.map((i) => i.id);

    if (oldInvIds.length > 0) {
      await prisma.payment.deleteMany({ where: { invoiceId: { in: oldInvIds } } });
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: oldInvIds } } });
      await prisma.trip.updateMany({
        where: { invoiceId: { in: oldInvIds } },
        data: { invoiceId: null, status: 'VALIDATED' },
      });
      await prisma.invoice.deleteMany({ where: { id: { in: oldInvIds } } });
    }

    // Ensure at least one un-invoiced trip exists in this period
    const existingUninvoiced = await prisma.trip.findFirst({
      where: { clientId: testClientId, tripDate: { gte: testStart, lte: testEnd }, invoiceId: null },
    });

    if (!existingUninvoiced) {
      const vendor = await prisma.vendor.findFirst();
      testVendorId = vendor ? vendor.id : 'v1';
      await prisma.trip.create({
        data: {
          clientId: testClientId,
          vendorId: testVendorId,
          vehicleType: 'Sedan (Dzire)',
          vehicleNumber: 'KA-01-AB-1234',
          tripDate: new Date('2026-08-15'),
          kmSlab: '80KM/8HR',
          totalKm: 75,
          tripRate: 2500,
          tripRevenue: 2500,
          vendorCost: 2000,
          status: 'VALIDATED',
        },
      });
      console.log('🚗 Created dummy validated trip for idempotency test');
    }

    // ----------------------------------------------------
    // TEST 1: Duplicate Invoices Idempotency Check
    // ----------------------------------------------------
    console.log('\n--- TESTING FIX #1: Duplicate Invoice Idempotency ---');
    const genPayload = {
      clientId: testClientId,
      startDate,
      endDate,
    };

    // Fire 5 concurrent API requests to generate invoice for exact same client and date range
    const reqPromises = Array(5)
      .fill(null)
      .map(() =>
        axios.post(`${API_BASE}/invoices/generate`, genPayload, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
      );

    const responses = await Promise.all(reqPromises);
    const invoiceIds = responses.map((r) => r.data.id);
    const invoiceNumbers = responses.map((r) => r.data.invoiceNumber);

    const allIdenticalIds = invoiceIds.every((id) => id === invoiceIds[0]);
    const allIdenticalNums = invoiceNumbers.every((num) => num === invoiceNumbers[0]);

    // Check DB count for this exact period & client
    const dbInvoices = await prisma.invoice.findMany({
      where: {
        clientId: testClientId,
        billingPeriodStart: testStart,
        billingPeriodEnd: testEnd,
        status: { notIn: ['CANCELLED', 'REFUNDED', 'FAILED'] },
      },
    });
    const dbInvoiceCount = dbInvoices.length;

    recordResult(
      'Issue #1 - Duplicate Invoice Protection',
      allIdenticalIds && allIdenticalNums && dbInvoiceCount === 1,
      `5 concurrent requests generated exact same Invoice #${invoiceNumbers[0]} (DB Count: ${dbInvoiceCount}, Invoices: ${dbInvoices.map(i => i.invoiceNumber).join(', ')})`
    );

    const testInvoiceId = invoiceIds[0];

    // ----------------------------------------------------
    // TEST 2: Razorpay Card Payment Verification Flow
    // ----------------------------------------------------
    console.log('\n--- TESTING FIX #2: Razorpay Card Payment Flow ---');

    // Step A: Create Payment Order
    const orderRes = await axios.post(
      `${API_BASE}/payments/create-order`,
      { invoiceId: testInvoiceId },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const orderData = orderRes.data;
    const generatedPaymentId = `pay_card_test_${Date.now()}`;

    // Step B: Verify Payment via Card
    const verifyRes = await axios.post(
      `${API_BASE}/payments/verify`,
      {
        invoiceId: testInvoiceId,
        razorpayOrderId: orderData.orderId,
        razorpayPaymentId: generatedPaymentId,
        razorpaySignature: 'TEST_VERIFIED',
        method: 'CARD',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const verifySuccess = verifyRes.data.success === true && verifyRes.data.status === 'PAID';

    // Verify DB state
    const dbInvoiceAfterPay = await prisma.invoice.findUnique({ where: { id: testInvoiceId } });
    const dbPaymentAfterPay = await prisma.payment.findFirst({ where: { razorpayOrderId: orderData.orderId } });
    const dbTripsAfterPay = await prisma.trip.findMany({ where: { invoiceId: testInvoiceId } });

    const isInvoicePaid = dbInvoiceAfterPay?.status === 'PAID';
    const isPaymentCaptured = dbPaymentAfterPay?.status === 'CAPTURED' && dbPaymentAfterPay?.method === 'CARD';
    const areTripsSettled = dbTripsAfterPay.every((t) => t.status === 'SETTLED');

    recordResult(
      'Issue #2 - Razorpay Card Payment Verification',
      verifySuccess && isInvoicePaid && isPaymentCaptured && areTripsSettled,
      `PaymentCaptured=${isPaymentCaptured}, InvoiceStatus=${dbInvoiceAfterPay?.status}, TripsSettled=${areTripsSettled}`
    );

    // ----------------------------------------------------
    // TEST 3: Failed Payment Execution & Receipt Test
    // ----------------------------------------------------
    console.log('\n--- TESTING FIX #3: Payment Failure & Direct Receipt ---');

    // Create a new trip & generate second invoice to test failure flow
    await prisma.trip.create({
      data: {
        clientId: testClientId,
        vendorId: testVendorId || 'v1',
        vehicleType: 'SUV (Innova)',
        vehicleNumber: 'KA-02-CD-5678',
        tripDate: new Date('2026-09-01'),
        kmSlab: '80KM/8HR',
        totalKm: 80,
        tripRate: 3500,
        tripRevenue: 3500,
        vendorCost: 2800,
        status: 'VALIDATED',
      },
    });

    const gen2Res = await axios.post(
      `${API_BASE}/invoices/generate`,
      { clientId: testClientId, startDate: '2026-09-01', endDate: '2026-09-05' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const invoice2Id = gen2Res.data.id;

    // Simulate Razorpay FAILED response
    const failRes = await axios.post(
      `${API_BASE}/payments/mark-failed`,
      {
        invoiceId: invoice2Id,
        razorpayOrderId: `order_fail_test_${Date.now()}`,
        reason: 'Card issuer authorization declined (Bank error 403)',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    const markFailedSuccess = failRes.data.success === true && failRes.data.status === 'FAILED';

    // Verify DB state for failed invoice
    const dbInvoiceFailed = await prisma.invoice.findUnique({ where: { id: invoice2Id } });
    const dbPaymentFailed = await prisma.payment.findFirst({ where: { invoiceId: invoice2Id } });

    const isInvoiceMarkedFailed = dbInvoiceFailed?.status === 'FAILED';
    const isPaymentMarkedFailed =
      dbPaymentFailed?.status === 'FAILED' && (dbPaymentFailed?.failureReason || '').includes('Card issuer');

    // Fetch payment status endpoint
    const statusRes = await axios.get(`${API_BASE}/payments/status/${invoice2Id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statusReturnsFailed = statusRes.data.invoiceStatus === 'FAILED' && statusRes.data.payment?.status === 'FAILED';

    recordResult(
      'Issue #3 - Failed Payment Direct Execution & Failure Status',
      markFailedSuccess && isInvoiceMarkedFailed && isPaymentMarkedFailed && statusReturnsFailed,
      `InvoiceStatus=${dbInvoiceFailed?.status}, PaymentStatus=${dbPaymentFailed?.status}, Reason="${dbPaymentFailed?.failureReason}"`
    );

    // Final Summary
    console.log('\n====================================================');
    console.log(`  SUITE SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
    console.log('====================================================\n');

    if (passedCount === totalCount) {
      console.log('🎉 ALL 3 FIXES VERIFIED SUCCESSFULLY AND PASS 100%!');
      process.exit(0);
    } else {
      console.error('❌ SOME TESTS FAILED! Please review logs.');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('❌ Test Suite Runtime Exception:', err.response?.data || err.message);
    process.exit(1);
  }
}

runPaymentFixesTestSuite();
