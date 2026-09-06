import { prisma } from '../config/prisma';

async function main() {
  const invoices = await prisma.invoice.findMany({
    include: {
      client: { select: { name: true } },
      payments: true,
      _count: { select: { trips: true } }
    },
    orderBy: { invoiceNumber: 'asc' }
  });

  console.log('--- ALL INVOICES IN DB ---');
  for (const inv of invoices) {
    console.log(`Invoice #${inv.invoiceNumber} | Client: ${inv.client.name} | Period: ${inv.billingPeriodStart.toISOString().split('T')[0]} - ${inv.billingPeriodEnd.toISOString().split('T')[0]} | Status: ${inv.status} | Total: ₹${inv.totalAmount} | Trips: ${inv._count.trips} | Payments: ${inv.payments.length}`);
    for (const p of inv.payments) {
      console.log(`  -> Payment ID: ${p.id} | RazorpayOrderID: ${p.razorpayOrderId} | Status: ${p.status} | Amount: ₹${p.amount} | Method: ${p.method}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
