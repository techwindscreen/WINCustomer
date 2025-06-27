// Test script to verify payment email deduplication fix
// Run this with: node test-payment-deduplication.js

const testDeduplication = async () => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  console.log('🧪 Testing Payment Email Deduplication Fix');
  console.log('📍 Base URL:', baseUrl);
  
  const testPaymentIntentId = 'pi_test_deduplication_' + Date.now();
  
  const testData = {
    // Customer details
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    customerPhone: '+44 123 456 7890',
    customerAddress: 'Test Address',
    
    // Vehicle details
    vehicleReg: 'TEST123',
    vehicleMake: 'Test Make',
    vehicleModel: 'Test Model',
    vehicleYear: '2020',
    
    // Payment details - SAME PAYMENT INTENT ID for both calls
    paymentIntentId: testPaymentIntentId,
    amount: 42845, // £428.45 in pence
    totalAmount: 45100, // £451.00 in pence  
    paymentType: 'full',
    paymentMethod: 'card',
    
    // Quote details
    quoteId: 'TEST_QUOTE_123',
    glassType: 'OEE',
    selectedWindows: ['Front Windscreen'],
    
    // Booking details
    bookingDate: '2025-01-20',
    bookingTime: '10:00 AM - 12:00 PM',
    appointmentType: 'mobile'
  };

  try {
    console.log('\n🔧 Test Setup:');
    console.log('- Payment Intent ID:', testPaymentIntentId);
    console.log('- Customer Email:', testData.customerEmail);
    console.log('- Quote ID:', testData.quoteId);
    
    // First API call - should send emails
    console.log('\n📧 FIRST EMAIL REQUEST (should send emails)');
    const firstResponse = await fetch(`${baseUrl}/api/send-payment-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const firstResult = await firstResponse.json();
    console.log('✅ First Response:', {
      success: firstResult.success,
      bookingReference: firstResult.bookingReference,
      duplicate: firstResult.duplicate
    });

    // Wait a moment to ensure any async operations complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Second API call - should be deduplicated
    console.log('\n📧 SECOND EMAIL REQUEST (should be deduplicated)');
    const secondResponse = await fetch(`${baseUrl}/api/send-payment-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const secondResult = await secondResponse.json();
    console.log('✅ Second Response:', {
      success: secondResult.success,
      bookingReference: secondResult.bookingReference,
      duplicate: secondResult.duplicate
    });

    // Verify results
    console.log('\n🔍 VERIFICATION:');
    
    if (firstResult.success && !firstResult.duplicate) {
      console.log('✅ First call succeeded and was not marked as duplicate');
    } else {
      console.log('❌ First call failed or was incorrectly marked as duplicate');
    }
    
    if (secondResult.success && secondResult.duplicate) {
      console.log('✅ Second call was correctly identified as duplicate');
    } else {
      console.log('❌ Second call was not properly deduplicated');
    }
    
    if (firstResult.bookingReference === secondResult.bookingReference) {
      console.log('✅ Booking references match:', firstResult.bookingReference);
      console.log('   This fixes the original issue of different booking references!');
    } else {
      console.log('❌ Booking references don\'t match:');
      console.log('   First:', firstResult.bookingReference);
      console.log('   Second:', secondResult.bookingReference);
    }

    // Third call with different customer email - should send new emails
    console.log('\n📧 THIRD EMAIL REQUEST (different customer, should send new emails)');
    const differentCustomerData = {
      ...testData,
      customerEmail: 'different@example.com'
    };
    
    const thirdResponse = await fetch(`${baseUrl}/api/send-payment-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(differentCustomerData)
    });

    const thirdResult = await thirdResponse.json();
    console.log('✅ Third Response (different customer):', {
      success: thirdResult.success,
      bookingReference: thirdResult.bookingReference,
      duplicate: thirdResult.duplicate
    });
    
    if (thirdResult.success && !thirdResult.duplicate) {
      console.log('✅ Different customer email correctly triggered new emails');
    } else {
      console.log('❌ Different customer email was incorrectly deduplicated');
    }

    console.log('\n🎯 TEST SUMMARY:');
    console.log('The fix ensures:');
    console.log('1. ✅ Same payment ID + same email = deduplicated (no duplicate emails)');
    console.log('2. ✅ Booking reference is deterministic (based on payment ID)');
    console.log('3. ✅ Different customers can still receive emails for the same payment ID');
    
  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
    console.error('💡 Make sure your development server is running on', baseUrl);
  }
};

// Run the test
testDeduplication(); 