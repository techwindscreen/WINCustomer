const testAdminOrderNotification = async () => {
  const baseUrl = process.env.NODE_ENV === 'production' ? 
    'https://your-production-domain.com' : 
    'http://localhost:3000';

  const testOrderData = {
    // Customer details
    customerName: 'John Smith',
    customerEmail: 'test@example.com',
    customerPhone: '+44 123 456 7890',
    customerAddress: '123 Test Street, London, SW1A 1AA',
    
    // Vehicle details
    vehicleReg: 'AB12 CDE',
    vehicleMake: 'Ford',
    vehicleModel: 'Focus',
    vehicleYear: '2020',
    
    // Payment details
    paymentIntentId: 'pi_test_123456789',
    amount: 40000, // £400 in pence
    totalAmount: 42000, // £420 in pence 
    paymentType: 'full',
    paymentMethod: 'card',
    
    // Quote details
    quoteId: 'WIN-TEST-2024-001',
    glassType: 'OEM',
    selectedWindows: ['Front Windscreen'],
    
    // Booking details
    bookingDate: '2024-01-25',
    bookingTime: '10:00 AM - 12:00 PM',
    appointmentType: 'mobile',
    
    // Pricing breakdown
    materialsCost: 30000, // £300 in pence
    laborCost: 10000, // £100 in pence
    vatAmount: 8000 // £80 in pence (20% of £400)
  };

  try {
    console.log('🧪 Testing admin order notification...');
    console.log('📋 Test data:', testOrderData);
    
    const response = await fetch(`${baseUrl}/api/send-payment-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrderData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS: Admin order notification sent');
      console.log('📋 Response:', result);
      
      console.log('\n📨 Check your Klaviyo dashboard for:');
      console.log('1. Event: "Admin: Quote Completed" (should now have order data)');
      console.log('2. Email should show:');
      console.log('   - Preferred Appointment: 2024-01-25 at 10:00 AM - 12:00 PM');
      console.log('   - Vehicle: Ford Focus (2020)');
      console.log('   - Damage Type: Front Windscreen');
      console.log('   - Glass Cost: £300.00');
      console.log('   - Fitting Cost: £100.00'); 
      console.log('   - VAT (20%): £80.00');
      console.log('   - Payment Method: card');
      console.log('   - Payment Type: Paid in Full');
      
    } else {
      console.error('❌ FAILED: Error sending admin order notification');
      console.error('📋 Response:', result);
    }
  } catch (error) {
    console.error('❌ NETWORK ERROR:', error.message);
    console.error('💡 Make sure your development server is running on', baseUrl);
  }
};

// Run the test
testAdminOrderNotification(); 