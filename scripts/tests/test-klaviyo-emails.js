// Test script for Klaviyo Payment Confirmation Emails
// Run this with: node test-klaviyo-emails.js

const testEmailFlow = async () => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  console.log('🧪 Testing Klaviyo Payment Confirmation Emails');
  console.log('📍 Base URL:', baseUrl);
  
  const testData = {
    // Customer details
    customerName: 'John Smith',
    customerEmail: 'test@example.com',
    customerPhone: '+44 123 456 7890',
    customerAddress: '123 Test Street, London, SW1A 1AA',
    
    // Vehicle details - PROPER FORMAT
    vehicleReg: 'AB12 CDE',
    vehicleMake: 'Ford',
    vehicleModel: 'Focus',
    vehicleYear: '2020',
    
    // Payment details
    paymentIntentId: 'pi_test_' + Date.now(),
    amount: 42845, // £428.45 in pence
    totalAmount: 45100, // £451.00 in pence
    paymentType: 'full',
    paymentMethod: 'card',
    
    // Quote details
    quoteId: 'TEST_QUOTE_' + Date.now(),
    glassType: 'OEM',
    selectedWindows: ['jqvmap1_ws', 'jqvmap1_df'], // Windscreen + Front Passenger Door
    windowDamage: {
      'jqvmap1_ws': 'Cracked', // Replacement
      'jqvmap1_df': 'Smashed'  // Replacement
    },
    
    // Booking details
    bookingDate: '2025-01-20',
    bookingTime: '10:00 AM - 12:00 PM',
    appointmentType: 'mobile',
    
    // Detailed pricing breakdown
    materialsCost: 22500, // £225.00 in pence
    laborCost: 15000,     // £150.00 in pence
    serviceFee: 7500,     // £75.00 in pence (20% service fee)
    subtotal: 37500,      // £375.00 in pence (materials + labor)
    totalBeforeVAT: 45000, // £450.00 in pence (subtotal + service fee)
    vatAmount: 9000,      // £90.00 in pence (20% VAT)
    discountAmount: 2255, // £22.55 in pence (5% pay in full discount)
  };

  try {
    console.log('\n📧 Sending test payment confirmation email...');
    console.log('Vehicle:', `${testData.vehicleReg} - ${testData.vehicleMake} ${testData.vehicleModel} (${testData.vehicleYear})`);
    console.log('Service:', testData.selectedWindows.join(', '));
    console.log('Total Amount:', `£${(testData.totalAmount / 100).toFixed(2)}`);
    console.log('Amount Paid:', `£${(testData.amount / 100).toFixed(2)}`);

    const response = await fetch(`${baseUrl}/api/send-payment-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Response:', {
        success: result.success,
        bookingReference: result.bookingReference,
        duplicate: result.duplicate
      });
    } else {
      console.error('❌ Test email failed:', result);
    }
  } catch (error) {
    console.error('❌ Error sending test email:', error);
  }
};

// Configuration check
const checkConfig = () => {
  console.log('\n🔧 Configuration Check:');
  console.log('- KLAVIYO_PRIVATE_API_KEY:', process.env.KLAVIYO_PRIVATE_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('- ADMIN_EMAIL:', process.env.ADMIN_EMAIL || '❌ Missing');
  console.log('- NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || 'Using default localhost:3000');
  
  if (!process.env.KLAVIYO_PRIVATE_API_KEY) {
    console.log('\n⚠️ WARNING: KLAVIYO_PRIVATE_API_KEY is not set');
    console.log('Please add it to your .env.local file');
    return false;
  }
  return true;
};

// Instructions for manual testing
const showInstructions = () => {
  console.log('\n📋 Manual Testing Steps:');
  console.log('1. Make sure your Next.js development server is running');
  console.log('2. Ensure Klaviyo API key is configured in .env.local');
  console.log('3. Set up the email flows in your Klaviyo dashboard:');
  console.log('   - "Customer: Payment Receipt" flow with metric "Payment Receipt"');
  console.log('   - "Customer: Order Confirmation" flow with metric "Order Confirmation"');
  console.log('4. Update the test email address in this script');
  console.log('5. Run: node test-klaviyo-emails.js');
  console.log('\n🎯 Expected Results:');
  console.log('- API responds with success');
  console.log('- 2 events appear in Klaviyo dashboard');
  console.log('- 2 emails are sent to test email address');
  console.log('- Emails contain correct booking reference and details');
};

// Main execution
const main = async () => {
  console.log('═══════════════════════════════════════');
  console.log('🚀 Klaviyo Email Flow Test Script');
  console.log('═══════════════════════════════════════');
  
  showInstructions();
  
  if (checkConfig()) {
    console.log('\n🏃‍♂️ Running test...');
    await testEmailFlow();
  } else {
    console.log('\n🛑 Configuration issues detected. Please fix and try again.');
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('✨ Test Complete');
  console.log('═══════════════════════════════════════');
};

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testEmailFlow, checkConfig }; 