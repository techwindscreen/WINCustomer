/**
 * Debug script to check what payment methods are available in browser console
 * Add this script to your page to debug Stripe Elements configuration
 */

// Add this to your browser console on the quote page
function debugStripeElements() {
  console.log('=== Stripe Elements Debug Info ===');
  
  // Check if Stripe is loaded
  if (typeof Stripe === 'undefined') {
    console.error('❌ Stripe.js not loaded');
    return;
  }
  
  console.log('✅ Stripe.js loaded');
  
  // Get the current payment type from the URL or DOM
  const currentPaymentType = getCurrentPaymentType();
  console.log('Current payment type:', currentPaymentType);
  
  // Check Elements configuration
  const elementsContainers = document.querySelectorAll('[class*="Element"]');
  console.log('Elements containers found:', elementsContainers.length);
  
  // Try to get payment methods from the current Elements
  if (window.stripe && window.elements) {
    console.log('✅ Stripe and Elements instances available');
    
    // Check if payment element exists
    const paymentElements = document.querySelectorAll('[data-testid="payment-element"]');
    console.log('Payment elements found:', paymentElements.length);
    
    // Log current configuration
    console.log('Current Elements configuration would be:');
    const mockConfig = {
      mode: 'payment',
      amount: 1000, // £10
      currency: 'gbp',
      paymentMethodTypes: currentPaymentType === 'split' ? ['card', 'klarna'] : undefined
    };
    console.log(mockConfig);
  }
  
  // Check for any Stripe errors in console
  console.log('Check browser network tab for any Stripe API errors');
  console.log('Look for payment_intent creation requests');
}

function getCurrentPaymentType() {
  // Try to detect current payment type from DOM
  const activeButtons = document.querySelectorAll('button[class*="bg-\\[\\#0FB8C1\\]"]');
  for (let button of activeButtons) {
    if (button.textContent.includes('Split')) return 'split';
    if (button.textContent.includes('Deposit')) return 'deposit';
    if (button.textContent.includes('Full')) return 'full';
  }
  return 'unknown';
}

// Test specific Klarna configuration
function testKlarnaConfiguration() {
  console.log('=== Testing Klarna Configuration ===');
  
  const testConfig = {
    mode: 'payment',
    amount: 3000, // £30 - well above minimum
    currency: 'gbp',
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: 'always'
    },
    payment_method_types: ['card', 'klarna']
  };
  
  console.log('Recommended Klarna configuration:', testConfig);
  console.log('Minimum amounts for Klarna Pay in 3 (GBP): £1');
  console.log('Recommended test amount: £30+ for all features');
}

// Run the debug functions
debugStripeElements();
testKlarnaConfiguration();

// Instructions
console.log(`
=== Instructions ===
1. Copy and paste this entire script into your browser console on the quote page
2. Click "Split Payment" option
3. Check console output for payment method availability
4. Look in Network tab for payment_intent API calls
5. Check if Klarna is enabled in your Stripe Dashboard at: https://dashboard.stripe.com/settings/payment_methods
`);

console.log('Debug script loaded. Call debugStripeElements() after changing payment type.');