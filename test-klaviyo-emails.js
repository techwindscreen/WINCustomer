// Test script for Klaviyo Payment Confirmation Emails
// Run this with: node test-klaviyo-emails.js

const testEmailFlow = async () => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  console.log('🧪 Testing Klaviyo Payment Confirmation Emails');
  console.log('📍 Base URL:', baseUrl);
  
  const testData = {
    // Customer details
    customer_name: 'TEST NAME',
    customer_email: 'test@example.com',
    customer_phone: '+44 123 456 7890',
    customer_address: 'test',
    
    // Vehicle details
    vehicle_registration: 'HN11AYA',
    vehicle_make: 'Test Make',
    vehicle_model: 'Test Model',
    vehicle_year: '2011',
    
    // Payment details
    payment_intent_id: 'pi_test_' + Date.now(),
    amount_paid: '£428.45',
    total_amount: '£451.00',
    payment_method: 'card',
    payment_type: 'full',
    
    // Quote details
    quote_id: 'test_quote_' + Date.now(),
    booking_reference: 'WC' + Date.now().toString().slice(-6) + 'D2',
    glass_type: 'OEE',
    selected_windows: 'Front Windscreen',
    
    // Appointment details
    appointment_date: '2025-01-17',
    appointment_time: '10:00 AM - 12:00 PM',
    appointment_type: 'mobile',
    formatted_appointment_date: 'Friday, 17th January 2025',
    
    // Pricing breakdown
    materials_cost: '£225.50',
    labor_cost: '£150.33',
    vat_amount: '£75.17',
    discount_amount: '£22.55', // 5% discount calculation: £451.00 * 0.05 = £22.55
    remaining_amount: null, // Full payment
    
    // Timestamps
    payment_date: new Date().toISOString(),
    formatted_payment_date: new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }),
    
    // Additional service details
    service_duration: '1-2 hours',
    technician_contact_time: '1 hour before appointment',
    guarantee_period: '12 months',
    
    // URLs
    manage_booking_url: 'http://localhost:3000/quote-details?id=test_quote',
    
    // Event metadata for uniqueness
    event_type: 'order_confirmation',
    unique_event_id: `order_confirmation_test_${Date.now()}`,
    timestamp_ms: Date.now(),
    event_uuid: `order-test-${Date.now()}`
  };

  try {
    console.log('📧 Sending test payment confirmation emails...');
    
    const response = await fetch(`${baseUrl}/api/send-payment-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS: Payment confirmation emails sent');
      console.log('📋 Response:', result);
      console.log('🔖 Booking Reference:', result.bookingReference);
      
      console.log('\n📨 Check your Klaviyo dashboard for:');
      console.log('1. "Payment Receipt" event');
      console.log('2. "Order Confirmation" event');
      console.log('\n📧 Check the email address:', testData.customer_email);
      console.log('📱 You should receive both emails within a few minutes');
      
    } else {
      console.error('❌ FAILED: Error sending emails');
      console.error('📋 Response:', result);
    }
  } catch (error) {
    console.error('❌ NETWORK ERROR:', error.message);
    console.error('💡 Make sure your development server is running on', baseUrl);
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