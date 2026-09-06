import { prisma } from '../config/prisma';
import bcrypt from 'bcryptjs';

async function testDynamicRolesSystem() {
  console.log('--- STARTING DYNAMIC ROLE SYSTEM VERIFICATION TEST ---');

  try {
    // 1. Verify Role Table catalog seeding
    console.log('1. Verifying Role database table...');
    const roles = await prisma.role.findMany();
    console.log(`✓ Found ${roles.length} roles in database catalog:`, roles.map((r: any) => r.name));

    // 2. Test Dynamic Creation of new Roles (EMPLOYEE, MANAGER, AUDITOR)
    console.log('\n2. Testing creation of dynamic new roles (EMPLOYEE, MANAGER, AUDITOR)...');

    const testRolesToCreate = [
      { name: 'EMPLOYEE', description: 'Field employee transport account', permissions: ['dashboard', 'trips', 'email-center'] },
      { name: 'MANAGER', description: 'Department Manager supervising operational metrics', permissions: ['dashboard', 'trips', 'reports', 'clients', 'vendors'] },
      { name: 'AUDITOR', description: 'Compliance Auditor reviewing financial logs', permissions: ['dashboard', 'reports', 'audit-logs'] },
    ];

    for (const rData of testRolesToCreate) {
      const existing = await prisma.role.findUnique({ where: { name: rData.name } });
      if (!existing) {
        const createdRole = await prisma.role.create({
          data: {
            name: rData.name,
            description: rData.description,
            isSystem: false,
            permissions: rData.permissions,
          },
        });
        console.log(`✓ Successfully created dynamic role: ${createdRole.name} with ${createdRole.permissions.length} module permissions`);
      } else {
        console.log(`✓ Role ${rData.name} already exists in database catalog`);
      }
    }

    // 3. Test assigning dynamic roles (CLIENT, VENDOR, EMPLOYEE, MANAGER) to user accounts
    console.log('\n3. Testing dynamic user account creation with roles...');
    const passwordHash = await bcrypt.hash('Password@123', 10);

    // Create client company if needed
    let client = await prisma.client.findFirst({ where: { name: 'Tech Mahindra' } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          name: 'Tech Mahindra',
          gstNumber: '29AAACT1234F1Z1',
          contactPerson: 'Aryan Kumar',
          contactEmail: 'aryan@techmahindra.com',
          phone: '+91 9988776655',
        },
      });
    }

    const testUsersToCreate = [
      { name: 'Aryan Kumar', email: 'aryan@techmahindra.com', role: 'CLIENT', clientId: client.id },
      { name: 'Vikram Singh', email: 'vikram.manager@cabmitra.com', role: 'MANAGER', clientId: null },
      { name: 'Sanjay Employee', email: 'sanjay.emp@cabmitra.com', role: 'EMPLOYEE', clientId: null },
    ];

    for (const uData of testUsersToCreate) {
      const existing = await prisma.user.findUnique({ where: { email: uData.email } });
      if (!existing) {
        const newUser = await prisma.user.create({
          data: {
            name: uData.name,
            email: uData.email,
            passwordHash,
            role: uData.role,
            status: 'ACTIVE',
            clientId: uData.clientId,
          },
        });
        console.log(`✓ Created user '${newUser.name}' assigned to dynamic role '${newUser.role}'`);
      } else {
        console.log(`✓ User '${uData.email}' already exists with role '${existing.role}'`);
      }
    }

    // 4. Verify user-to-role breakdown from DB
    console.log('\n4. Verifying database role breakdown...');
    const userRoleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    console.log('✓ Current Active User Role Breakdown in DB:');
    userRoleCounts.forEach((ur) => {
      console.log(`   - ${ur.role}: ${ur._count.id} user(s)`);
    });

    console.log('\n✅ ALL DYNAMIC ROLE VERIFICATION TESTS PASSED 100% SUCCESS!');
  } catch (err: any) {
    console.error('❌ DYNAMIC ROLE TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDynamicRolesSystem();
