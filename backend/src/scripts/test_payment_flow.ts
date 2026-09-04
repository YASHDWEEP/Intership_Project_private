import { prisma } from '../config/prisma';
import { razorpayInstance, getRazorpayKeyId } from '../config/razorpay';

async function testPaymentOrderCreation() {
  console.log('🔍 Testing Razorpay Order Creation with active .env keys...');
  console.log('Using Key ID:', getRazorpayKeyId());

  try {
    const invoice = await prisma.invoice.findFirst();
    if (!invoice) {
      console.log('No invoice found in DB!');
      return;
    }

    console.log(`Found Invoice: ${invoice.invoiceNumber}, Total Amount: ₹${invoice.totalAmount}`);

    const amountInPaise = Math.round(invoice.totalAmount * 100);
    const receiptId = `rcpt_test_${Date.now()}`;

    const orderOptions = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
    console.log('✅ Razorpay Order Created Successfully!');
    console.log('Order Details:', razorpayOrder);
  } catch (err: any) {
    console.error('❌ Order Creation Error:', err.message || err);
  } finally {
    await prisma.$disconnect();
  }
}

testPaymentOrderCreation();
