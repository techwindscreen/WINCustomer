/**
 * Test script to verify Klarna configuration for split payments
 * Run with: node scripts/tests/test-klarna-payment-intent.js
 */

const Stripe = require('stripe');

// You'll need to set your Stripe secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-10-28.acacia',
});

async function testKlarnaPaymentIntent() {
  console.log('Testing Klarna payment intent creation...\n');

  try {
    // Test different amounts for GBP to see minimum thresholds
    const testAmounts = [100, 500, 1000, 3000]; // £1, £5, £10, £30 in pence

    for (const amount of testAmounts) {
      console.log(`\n--- Testing amount: £${(amount / 100).toFixed(2)} ---`);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'gbp',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always'
        },
        payment_method_types: ['card', 'klarna'],
        capture_method: 'automatic',
        metadata: {
          quote_id: 'test-quote-123',
          payment_type: 'split',
          total_amount: amount.toString(),
          customer_email: 'test@example.com',
          created_at: new Date().toISOString()
        },
        description: `Test Windscreen Service - Split Payment £${(amount / 100).toFixed(2)}`
      });

      console.log('✅ Payment Intent created successfully:');
      console.log({
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        payment_method_types: paymentIntent.payment_method_types,
        automatic_payment_methods: paymentIntent.automatic_payment_methods,
        status: paymentIntent.status
      });
    }

    console.log('\n🎉 All test amounts passed! Klarna should be working.');
    
  } catch (error) {
    console.error('❌ Error creating payment intent:', error.message);
    
    if (error.code === 'payment_method_not_available') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure Klarna is enabled in your Stripe Dashboard');
      console.log('2. Verify your account supports Klarna for GBP');
      console.log('3. Check if minimum amount requirements are met');
      console.log('4. Ensure your account is in a supported region');
    }
  }
}

// Test to check available payment methods for your account
async function checkAvailablePaymentMethods() {
  console.log('\n--- Checking available payment methods ---');
  
  try {
    // This won't show Klarna unless it's properly enabled and configured
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 3000, // £30 - well above minimum thresholds
      currency: 'gbp',
      automatic_payment_methods: {
        enabled: true,
      }
    });
    
    console.log('Available payment methods for £30:');
    console.log(paymentIntent.payment_method_types);
    
  } catch (error) {
    console.error('Error checking payment methods:', error.message);
  }
}

// Run the tests
async function runTests() {
  await testKlarnaPaymentIntent();
  await checkAvailablePaymentMethods();
}

runTests().catch(console.error);