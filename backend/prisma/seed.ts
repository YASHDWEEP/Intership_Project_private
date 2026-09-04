import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CabMitra Database Seeding...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.importError.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.importMapping.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.deduction.deleteMany();
  await prisma.settlementItem.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.pricingSlab.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.client.deleteMany();

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Create Clients
  const clientsData = [
    { name: 'Infosys Limited', gstNumber: '29AAACI1681G1ZD', contactPerson: 'Rajesh Sharma', contactEmail: 'rajesh.s@infosys.com', phone: '+91 98801 23456', billingCycle: 'MONTHLY' },
    { name: 'Tata Consultancy Services', gstNumber: '27AAACT2891H1ZE', contactPerson: 'Priya Sundaram', contactEmail: 'priya.s@tcs.com', phone: '+91 98200 67890', billingCycle: 'MONTHLY' },
    { name: 'Wipro Enterprise', gstNumber: '29AAACW4521F1ZA', contactPerson: 'Anish Varma', contactEmail: 'anish.v@wipro.com', phone: '+91 98450 11223', billingCycle: 'MONTHLY' },
    { name: 'Tech Mahindra', gstNumber: '27AAACT1299K1ZB', contactPerson: 'Siddharth Rao', contactEmail: 'sid.rao@techm.com', phone: '+91 97110 99887', billingCycle: 'WEEKLY' },
    { name: 'Accenture India', gstNumber: '29AAACA9922P1ZC', contactPerson: 'Neha Gupta', contactEmail: 'neha.g@accenture.com', phone: '+91 99000 44556', billingCycle: 'MONTHLY' },
  ];

  const clients = [];
  for (const c of clientsData) {
    const created = await prisma.client.create({ data: c });
    clients.push(created);
  }

  // 2. Create Vendors
  const vendorsData = [
    { name: 'Ramesh Transport Solutions', companyName: 'Ramesh Travels Pvt Ltd', gstNumber: '29ABCDE1234F1Z1', phone: '+91 98451 00001', email: 'ramesh@rameshtravels.com', address: 'Koramangala 4th Block, Bengaluru', commissionType: 'PERCENTAGE', commissionValue: 10.0 },
    { name: 'Sri Ganesh Fleet Services', companyName: 'Sri Ganesh Fleet LLP', gstNumber: '29BCDEF2345G1Z2', phone: '+91 98451 00002', email: 'contact@ganeshfleet.com', address: 'Electronic City Phase 1, Bengaluru', commissionType: 'PERCENTAGE', commissionValue: 8.5 },
    { name: 'Venkateshwara Cabs', companyName: 'Venkateshwara Motors', gstNumber: '29CDEFG3456H1Z3', phone: '+91 98451 00003', email: 'info@venkatcabs.in', address: 'Whitefield Main Rd, Bengaluru', commissionType: 'FIXED', commissionValue: 50.0 },
    { name: 'Blue Sky Cabs', companyName: 'Blue Sky Logistics', gstNumber: '29DEFGH4567I1Z4', phone: '+91 98451 00004', email: 'dispatch@blueskycabs.com', address: 'HSR Layout, Bengaluru', commissionType: 'PERCENTAGE', commissionValue: 10.0 },
    { name: 'Om Sai Logistics', companyName: 'Om Sai Tours', gstNumber: '29EFGHI5678J1Z5', phone: '+91 98451 00005', email: 'bookings@omsai.com', address: 'Indiranagar 100ft Rd, Bengaluru', commissionType: 'PERCENTAGE', commissionValue: 9.0 },
    { name: 'Apex Executive Cabs', companyName: 'Apex Mobility Ltd', gstNumber: '29FGHIJ6789K1Z6', phone: '+91 98451 00006', email: 'support@apexcabs.com', address: 'Marathahalli, Bengaluru', commissionType: 'PERCENTAGE', commissionValue: 10.0 },
    { name: 'City Mobility Hub', companyName: 'City Express Mobility', gstNumber: '29GHIJK7890L1Z7', phone: '+91 98451 00007', email: 'ops@citymobility.com', address: 'Bellandur, Bengaluru', commissionType: 'PERCENTAGE', commissionValue: 8.0 },
    { name: 'GreenEV Cabs', companyName: 'Green EV Transit India', gstNumber: '29HIJKL8901M1Z8', phone: '+91 98451 00008', email: 'green@evcabs.in', address: 'Jayanagar 4th Block, Bengaluru', commissionType: 'PERCENTAGE', commissionValue: 7.5 },
    { name: 'Royal Star Fleet', companyName: 'Royal Star Travels', gstNumber: '29IJKLM9012N1Z9', phone: '+91 98451 00009', email: 'admin@royalstar.com', address: 'Hebbal, Bengaluru', commissionType: 'PERCENTAGE', commissionValue: 10.0 },
    { name: 'Metro Mobility Services', companyName: 'Metro Cabs Corp', gstNumber: '29JKLMN0123O1Z0', phone: '+91 98451 00010', email: 'info@metrocabs.com', address: 'MG Road, Bengaluru', commissionType: 'PERCENTAGE', commissionValue: 9.5 },
  ];

  const vendors = [];
  for (const v of vendorsData) {
    const created = await prisma.vendor.create({ data: v });
    vendors.push(created);
  }

  // 3. Create Vehicles (20 vehicles)
  const vehicleTypes = ['4 Seater', '6 Seater', 'EV', 'Sedan', 'SUV'];
  const fuelTypes = ['DIESEL', 'CNG', 'ELECTRIC', 'PETROL'];
  const vehicles = [];

  for (let i = 0; i < 20; i++) {
    const vendor = vendors[i % vendors.length];
    const vType = vehicleTypes[i % vehicleTypes.length];
    const fType = vType === 'EV' ? 'ELECTRIC' : fuelTypes[i % fuelTypes.length];
    const regNo = `KA-0${(i % 5) + 1}-MJ-${1000 + i * 42}`;

    const created = await prisma.vehicle.create({
      data: {
        vendorId: vendor.id,
        vehicleNumber: regNo,
        vehicleType: vType,
        seatingCapacity: vType === '6 Seater' || vType === 'SUV' ? 6 : 4,
        fuelType: fType,
      },
    });
    vehicles.push(created);
  }

  // 4. Create Seed Users
  await prisma.user.createMany({
    data: [
      { name: 'System Admin', email: 'admin@cabmitra.com', passwordHash, role: 'ADMIN', status: 'ACTIVE' },
      { name: 'Ops Controller', email: 'operations@cabmitra.com', passwordHash, role: 'OPERATIONS', status: 'ACTIVE' },
      { name: 'Accounts Manager', email: 'accounts@cabmitra.com', passwordHash, role: 'ACCOUNTS', status: 'ACTIVE' },
      { name: 'Ramesh Vendor User', email: 'vendor@cabmitra.com', passwordHash, role: 'VENDOR', status: 'ACTIVE', vendorId: vendors[0].id },
      { name: 'Infosys Client Portal', email: 'client@cabmitra.com', passwordHash, role: 'CLIENT', status: 'ACTIVE', clientId: clients[0].id },
    ],
  });

  // 5. Create Pricing Rules & Slabs
  for (const client of clients) {
    for (const vType of ['4 Seater', '6 Seater', 'EV']) {
      const rule = await prisma.pricingRule.create({
        data: {
          clientId: client.id,
          vehicleType: vType,
          ruleName: `${client.name} - ${vType} Tariff Plan`,
          pricingType: 'KM_SLAB',
          slabs: {
            create: [
              { minKm: 0, maxKm: 15, rate: vType === '6 Seater' ? 700 : vType === 'EV' ? 550 : 500, vendorRate: vType === '6 Seater' ? 560 : vType === 'EV' ? 440 : 400 },
              { minKm: 16, maxKm: 25, rate: vType === '6 Seater' ? 950 : vType === 'EV' ? 750 : 700, vendorRate: vType === '6 Seater' ? 760 : vType === 'EV' ? 600 : 560 },
              { minKm: 26, maxKm: 40, rate: vType === '6 Seater' ? 1200 : vType === 'EV' ? 950 : 900, vendorRate: vType === '6 Seater' ? 960 : vType === 'EV' ? 760 : 720 },
              { minKm: 41, maxKm: 100, rate: vType === '6 Seater' ? 1800 : vType === 'EV' ? 1500 : 1400, vendorRate: vType === '6 Seater' ? 1440 : vType === 'EV' ? 1200 : 1120 },
            ],
          },
        },
      });
    }
  }

  // 6. Generate 100+ Trips over past 60 days
  console.log('🚕 Generating 100+ historical trips with accurate Indian operational metrics...');
  const tripsData = [];
  const categories = ['PICKUP', 'DROP', 'OUTSTATION', 'RENTAL'];
  const billCats = ['REGULAR', 'ADHOC', 'NIGHT'];

  for (let i = 0; i < 115; i++) {
    const client = clients[i % clients.length];
    const vehicle = vehicles[i % vehicles.length];
    const vendor = vendors.find((v) => v.id === vehicle.vendorId) || vendors[0];

    const daysAgo = Math.floor(((114 - i) / 115) * 60);
    const tripDate = new Date();
    tripDate.setDate(tripDate.getDate() - daysAgo);
    tripDate.setHours(8 + (i % 12), (i * 17) % 60);

    const totalKm = Math.round((10 + (i * 3.7) % 45) * 10) / 10;
    const waitingTime = (i % 7 === 0) ? 1.5 : 0;
    const tollAmount = (i % 4 === 0) ? 110 : 0;
    const parkingAmount = (i % 6 === 0) ? 50 : 0;

    // Slab calculation
    let kmSlab = '0-15 KM';
    let tripRate = 500;
    if (totalKm > 40) {
      kmSlab = '41-100 KM';
      tripRate = 1400;
    } else if (totalKm > 25) {
      kmSlab = '26-40 KM';
      tripRate = 900;
    } else if (totalKm > 15) {
      kmSlab = '16-25 KM';
      tripRate = 700;
    }

    if (vehicle.vehicleType === '6 Seater') tripRate = Math.round(tripRate * 1.3);

    const tripRevenue = tripRate + (waitingTime * 100) + tollAmount + parkingAmount;
    const vendorCost = Math.round(tripRevenue * 0.8);

    tripsData.push({
      tripDate,
      clientId: client.id,
      vendorId: vendor.id,
      vehicleId: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: vehicle.vehicleType,
      employeeCount: (i % 4) + 1,
      totalKm,
      tripCategory: categories[i % categories.length],
      billCategory: billCats[i % billCats.length],
      kmSlab,
      tripRate,
      tripRevenue,
      vendorCost,
      waitingTime,
      tollAmount,
      parkingAmount,
      status: i < 70 ? 'INVOICED' : i < 90 ? 'PROCESSED' : 'VALIDATED',
      source: 'MANUAL',
    });
  }

  await prisma.trip.createMany({ data: tripsData });

  // 7. Generate Sample Invoices for first two clients
  const infosysTrips = await prisma.trip.findMany({
    where: { clientId: clients[0].id, status: 'INVOICED' },
    take: 20,
  });

  if (infosysTrips.length > 0) {
    const subtotal = infosysTrips.reduce((acc, t) => acc + t.tripRevenue, 0);
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = subtotal + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-0001',
        clientId: clients[0].id,
        billingPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        billingPeriodEnd: new Date(),
        subtotal,
        taxAmount,
        totalAmount,
        status: 'PAID',
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        items: {
          create: [
            { description: 'Employee Pickup & Drop Services (4 Seater)', quantity: 12, rate: 700, amount: 8400 },
            { description: '6 Seater Executive Shuttle Services', quantity: 8, rate: 1200, amount: 9600 },
          ],
        },
      },
    });

    await prisma.trip.updateMany({
      where: { id: { in: infosysTrips.map((t) => t.id) } },
      data: { invoiceId: invoice.id },
    });
  }

  // 8. Generate Sample Settlements for Ramesh Travels
  const rameshTrips = await prisma.trip.findMany({
    where: { vendorId: vendors[0].id },
    take: 15,
  });

  if (rameshTrips.length > 0) {
    const grossAmount = rameshTrips.reduce((acc, t) => acc + t.vendorCost, 0);
    const deductions = Math.round(grossAmount * 0.1);
    const netPayable = grossAmount - deductions;

    const settlement = await prisma.settlement.create({
      data: {
        vendorId: vendors[0].id,
        settlementPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        settlementPeriodEnd: new Date(),
        totalTrips: rameshTrips.length,
        grossAmount,
        deductions,
        netPayable,
        status: 'APPROVED',
        items: {
          create: rameshTrips.map((t) => ({
            tripId: t.id,
            slab: `${t.vehicleType} (${t.kmSlab})`,
            tripAmount: t.vendorCost,
            deduction: 0,
            payableAmount: t.vendorCost,
          })),
        },
        deductionRecords: {
          create: [
            { type: 'SERVICE_CHARGE', amount: deductions, reason: 'Platform Commission (10%)' },
          ],
        },
      },
    });

    await prisma.trip.updateMany({
      where: { id: { in: rameshTrips.map((t) => t.id) } },
      data: { settlementId: settlement.id },
    });
  }

  // 9. Initial Audit Log & Notification
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (adminUser) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'SYSTEM_INITIALIZATION',
        entity: 'System',
        entityId: 'ROOT',
        newValue: JSON.stringify({ message: 'CabMitra platform database populated with production seed data.' }),
      },
    });

    await prisma.notification.create({
      data: {
        userId: adminUser.id,
        title: 'Welcome to CabMitra',
        message: 'Platform initialized successfully with 5 clients, 10 vendors, 20 vehicles, and 115+ trips.',
      },
    });
  }

  console.log('✅ Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
