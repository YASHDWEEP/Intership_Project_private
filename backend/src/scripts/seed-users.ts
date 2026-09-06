import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';

async function seedUsers() {
  console.log('⚡ Upserting CabMitra demo login accounts...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Ensure Clients exist
  let client = await prisma.client.findFirst({ where: { name: 'Infosys Limited' } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: 'Infosys Limited',
        gstNumber: '29AAACI1681G1ZD',
        contactPerson: 'Rajesh Sharma',
        contactEmail: 'rajesh.s@infosys.com',
        phone: '+91 98801 23456',
        billingCycle: 'MONTHLY',
      },
    });
  }

  // 2. Ensure Vendor exists
  let vendor = await prisma.vendor.findFirst({ where: { name: 'Ramesh Transport Solutions' } });
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        name: 'Ramesh Transport Solutions',
        companyName: 'Ramesh Travels Pvt Ltd',
        gstNumber: '29ABCDE1234F1Z1',
        phone: '+91 98451 00001',
        email: 'ramesh@rameshtravels.com',
        address: 'Koramangala 4th Block, Bengaluru',
      },
    });
  }

  // 3. Upsert Demo Accounts
  const users = [
    { name: 'System Admin', email: 'admin@cabmitra.com', passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    { name: 'Ops Controller', email: 'operations@cabmitra.com', passwordHash, role: 'OPERATIONS', status: 'ACTIVE' },
    { name: 'Accounts Manager', email: 'accounts@cabmitra.com', passwordHash, role: 'ACCOUNTS', status: 'ACTIVE' },
    { name: 'Ramesh Vendor User', email: 'vendor@cabmitra.com', passwordHash, role: 'VENDOR', status: 'ACTIVE', vendorId: vendor.id },
    { name: 'Infosys Client Portal', email: 'client@cabmitra.com', passwordHash, role: 'CLIENT', status: 'ACTIVE', clientId: client.id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: u.passwordHash,
        status: 'ACTIVE',
        role: u.role,
        clientId: u.clientId || null,
        vendorId: u.vendorId || null,
      },
      create: u,
    });
    console.log(`✅ Demo Account Ready: ${u.email} (${u.role})`);
  }

  await prisma.$disconnect();
  console.log('🎉 Demo login accounts seeded successfully!');
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error('Seed Users Error:', err);
  process.exit(1);
});
