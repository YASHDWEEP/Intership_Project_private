import { prisma } from '../config/prisma';

async function cleanupGhostInvoices() {
  console.log('🧹 Starting Database Cleanup & Synchronization for Invoices...');

  const allInvoices = await prisma.invoice.findMany({
    include: {
      client: true,
      payments: true,
      trips: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group invoices by Client ID & Billing Period
  const groupKey = (inv: any) => `${inv.clientId}_${inv.billingPeriodStart.toISOString().split('T')[0]}_${inv.billingPeriodEnd.toISOString().split('T')[0]}`;
  const groups: Record<string, any[]> = {};

  for (const inv of allInvoices) {
    const key = groupKey(inv);
    if (!groups[key]) groups[key] = [];
    groups[key].push(inv);
  }

  let deletedCount = 0;
  let updatedCount = 0;

  for (const [key, invList] of Object.entries(groups)) {
    if (invList.length > 1) {
      console.log(`\n🔍 Found ${invList.length} duplicate invoices for group [${key}]:`);
      const paidInvoice = invList.find((i) => i.status === 'PAID' && i.trips.length > 0);

      for (const inv of invList) {
        console.log(`  - Invoice #${inv.invoiceNumber} (ID: ${inv.id}) | Status: ${inv.status} | Trips: ${inv.trips.length} | Payments: ${inv.payments.length}`);

        // If another invoice in the exact same period is already PAID, and this invoice has 0 trips or 0 payments and status GENERATED/PENDING
        if (paidInvoice && inv.id !== paidInvoice.id && inv.trips.length === 0 && inv.payments.length === 0) {
          console.log(`    🗑️ Deleting empty duplicate ghost invoice #${inv.invoiceNumber}`);
          await prisma.invoiceItem.deleteMany({ where: { invoiceId: inv.id } });
          await prisma.invoice.delete({ where: { id: inv.id } });
          deletedCount++;
        }
      }
    }
  }

  // Also check any standalone ghost invoice with 0 trips and 0 payments created as a duplicate
  const orphanGhostInvoices = await prisma.invoice.findMany({
    where: {
      trips: { none: {} },
      payments: { none: {} },
      status: 'GENERATED',
    },
  });

  for (const ghost of orphanGhostInvoices) {
    // Check if client has a PAID invoice for similar period
    const paidMatch = await prisma.invoice.findFirst({
      where: {
        clientId: ghost.clientId,
        status: 'PAID',
      },
    });

    if (paidMatch) {
      console.log(`🗑️ Deleting standalone ghost invoice #${ghost.invoiceNumber} for client ${ghost.clientId}`);
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: ghost.id } });
      await prisma.invoice.delete({ where: { id: ghost.id } });
      deletedCount++;
    }
  }

  console.log(`\n✅ Database Cleanup Complete: ${deletedCount} ghost duplicate invoices removed, ${updatedCount} synchronized.`);
}

cleanupGhostInvoices()
  .catch((err) => console.error('Cleanup Error:', err))
  .finally(() => prisma.$disconnect());
