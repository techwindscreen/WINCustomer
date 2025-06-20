import type { NextApiRequest, NextApiResponse } from 'next';
import KlaviyoService from '../../lib/klaviyo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { testType = 'all', customerEmail = 'test@example.com' } = req.body;

    console.log('🐛 Debug Payment Emails - Starting test...');
    console.log('🔧 Environment check:', {
      klaviyoKeyExists: !!process.env.KLAVIYO_PRIVATE_API_KEY,
      klaviyoKeyLength: process.env.KLAVIYO_PRIVATE_API_KEY?.length,
      adminEmail: process.env.ADMIN_EMAIL,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL
    });

    const testData = {
      // Customer information
      customer_name: 'Debug Test Customer',
      customer_email: customerEmail,
      customer_phone: '+44123456789',
      customer_address: 'Test Address, London',
      
      // Vehicle information
      vehicle_registration: 'DEBUG123',
      vehicle_make: 'Test',
      vehicle_model: 'Debug',
      vehicle_year: '2024',
      
      // Quote details
      quote_id: `DEBUG_${Date.now()}`,
      booking_reference: `DEBUG${Date.now().toString().slice(-6)}`,
      glass_type: 'OEE',
      selected_windows: 'Front windscreen',
      
      // Payment information
      payment_intent_id: `debug_${Date.now()}`,
      payment_method: 'card',
      payment_type: 'full',
      
      // Pricing (formatted for display)
      amount_paid: '£200.00',
      total_amount: '£200.00',
      materials_cost: '£120.00',
      labor_cost: '£60.00',
      vat_amount: '£20.00',
      
      // Appointment details
      appointment_date: '2024-02-15',
      appointment_time: '10:00 AM - 12:00 PM',
      formatted_appointment_date: 'Thursday, 15th February 2024',
      appointment_type: 'mobile',
      
      // URLs
      manage_booking_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/quote-details?id=DEBUG`,
      
      // Timestamps
      payment_date: new Date().toISOString(),
      formatted_payment_date: new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    };

    const results = {
      environment: {
        klaviyoConfigured: !!process.env.KLAVIYO_PRIVATE_API_KEY,
        adminEmail: process.env.ADMIN_EMAIL,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL
      },
      tests: {} as Record<string, any>
    };

    // Test 1: Payment Receipt Email
    if (testType === 'all' || testType === 'payment_receipt') {
      console.log('🧪 Testing Payment Receipt Email...');
      try {
        await KlaviyoService.sendPaymentReceipt({
          ...testData,
          event_type: 'payment_receipt'
        });
        results.tests.payment_receipt = { success: true, message: 'Payment receipt sent successfully' };
        console.log('✅ Payment receipt test passed');
      } catch (error) {
        results.tests.payment_receipt = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        };
        console.error('❌ Payment receipt test failed:', error);
      }
    }

    // Test 2: Order Confirmation Email
    if (testType === 'all' || testType === 'order_confirmation') {
      console.log('🧪 Testing Order Confirmation Email...');
      try {
        await KlaviyoService.sendOrderConfirmation({
          ...testData,
          event_type: 'order_confirmation',
          service_duration: '1-2 hours',
          preparation_instructions: 'Test instructions',
          technician_contact_time: '1 hour before appointment',
          guarantee_period: '12 months'
        });
        results.tests.order_confirmation = { success: true, message: 'Order confirmation sent successfully' };
        console.log('✅ Order confirmation test passed');
      } catch (error) {
        results.tests.order_confirmation = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        };
        console.error('❌ Order confirmation test failed:', error);
      }
    }

    // Test 3: Admin Notification Email
    if (testType === 'all' || testType === 'admin_notification') {
      console.log('🧪 Testing Admin Notification Email...');
      try {
        await KlaviyoService.sendAdminOrderNotification({
          ...testData,
          // Admin-specific data
          order_id: testData.quote_id,
          order_date: new Date().toISOString(),
          user_name: testData.customer_name,
          user_email: testData.customer_email,
          user_phone: testData.customer_phone,
          user_location: testData.customer_address,
          damage_type: testData.selected_windows,
          special_requirements: 'Debug test',
          glass_price: testData.materials_cost,
          fitting_price: testData.labor_cost,
          vat_amount: testData.vat_amount,
          total_price: testData.total_amount,
          payment_status: 'COMPLETED',
          preferred_date: testData.appointment_date,
          preferred_time: testData.appointment_time,
          stripe_payment_id: testData.payment_intent_id
        });
        results.tests.admin_notification = { success: true, message: 'Admin notification sent successfully' };
        console.log('✅ Admin notification test passed');
      } catch (error) {
        results.tests.admin_notification = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        };
        console.error('❌ Admin notification test failed:', error);
      }
    }

    // Test 4: Direct Klaviyo API Test
    if (testType === 'all' || testType === 'klaviyo_direct') {
      console.log('🧪 Testing Direct Klaviyo API...');
      try {
        // This tests if Klaviyo is working at all
        const response = await fetch('https://a.klaviyo.com/api/events/', {
          method: 'POST',
          headers: {
            'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`,
            'Content-Type': 'application/json',
            'revision': '2024-05-15'
          },
          body: JSON.stringify({
            data: {
              type: 'event',
              attributes: {
                properties: {
                  test_message: 'Debug test from debug-payment-emails endpoint',
                  timestamp: new Date().toISOString()
                },
                metric: {
                  data: {
                    type: 'metric',
                    attributes: {
                      name: 'Debug Test Event'
                    }
                  }
                },
                profile: {
                  data: {
                    type: 'profile',
                    attributes: {
                      email: customerEmail,
                      properties: {
                        test_profile: true
                      }
                    }
                  }
                },
                time: new Date().toISOString()
              }
            }
          })
        });

        if (response.ok) {
          results.tests.klaviyo_direct = { success: true, message: 'Direct Klaviyo API test passed' };
          console.log('✅ Direct Klaviyo API test passed');
        } else {
          const errorText = await response.text();
          results.tests.klaviyo_direct = { 
            success: false, 
            error: `HTTP ${response.status}: ${errorText}`,
            status: response.status
          };
          console.error('❌ Direct Klaviyo API test failed:', response.status, errorText);
        }
      } catch (error) {
        results.tests.klaviyo_direct = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        };
        console.error('❌ Direct Klaviyo API test failed:', error);
      }
    }

    console.log('🐛 Debug results:', results);

    return res.status(200).json({
      success: true,
      message: 'Debug tests completed',
      results,
      timestamp: new Date().toISOString(),
      testData: {
        customerEmail,
        testType,
        environment: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Debug endpoint failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
} 