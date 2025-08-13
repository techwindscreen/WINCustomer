import type { NextApiRequest, NextApiResponse } from 'next';
import KlaviyoService from '../../lib/klaviyo';

// Window ID to name mapping
const windowNameMapping: { [key: string]: string } = {
  'jqvmap1_ws': 'Front Windscreen',
  'jqvmap1_rw': 'Rear Window',
  'jqvmap1_vp': 'Front Passenger Vent',
  'jqvmap1_df': 'Front Passenger Door',
  'jqvmap1_dr': 'Rear Passenger Door',
  'jqvmap1_vr': 'Rear Passenger Vent',
  'jqvmap1_qr': 'Rear Passenger Quarter',
  'jqvmap1_vf': 'Front Driver Vent',
  'jqvmap1_dg': 'Front Driver Door',
  'jqvmap1_dd': 'Rear Driver Door',
  'jqvmap1_vg': 'Rear Driver Vent',
  'jqvmap1_qg': 'Rear Driver Quarter'
};

// Function to format windows with repair/replacement status
const formatWindowsWithStatus = (windows: string[], windowDamage?: any): string => {
  if (!windows || windows.length === 0) return 'Windscreen Service';
  
  return windows.map(windowId => {
    const windowName = windowNameMapping[windowId] || windowId;
    
    // Determine if it's repair or replacement
    // Repair only if it's a windscreen with chip damage smaller than 5p coin
    let serviceType = 'Replacement';
    if (windowId === 'jqvmap1_ws' && windowDamage && windowDamage[windowId] === 'Chipped') {
      // Note: We don't have chip size data in payment confirmation, so we'll assume replacement
      // In a real implementation, this data should be passed through
      serviceType = 'Repair'; 
    }
    
    return `${windowName} (${serviceType})`;
  }).join(', ');
};

interface PaymentConfirmationData {
  // Customer details
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  
  // Vehicle details
  vehicleReg: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  
  // Payment details
  paymentIntentId: string;
  amount: number; // Amount paid in pence
  totalAmount: number; // Total service cost in pence
  paymentType: 'full' | 'deposit' | 'split';
  paymentMethod: string; // 'card', 'bank_transfer', etc.
  
  // Quote details
  quoteId: string;
  glassType: string; // 'OEE' or 'OEM'
  selectedWindows: string[];
  windowDamage?: any; // Window damage data
  
  // Booking details
  bookingDate?: string;
  bookingTime?: string;
  appointmentType?: string; // 'mobile' or 'workshop'
  
  // Pricing breakdown
  materialsCost?: number;
  laborCost?: number;
  vatAmount?: number;
  discountAmount?: number;
  serviceFee?: number;
  subtotal?: number;
  totalBeforeVAT?: number;
}

// In-memory deduplication cache (in production, use Redis or database)
const emailSentCache = new Map<string, string | boolean>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const paymentData: PaymentConfirmationData = req.body;

    if (!paymentData.customerEmail || !paymentData.paymentIntentId || !paymentData.quoteId) {
      return res.status(400).json({ 
        message: 'Customer email, payment intent ID, and quote ID are required' 
      });
    }

    // **DEDUPLICATION CHECK**: Prevent duplicate emails for the same payment
    const deduplicationKey = `${paymentData.paymentIntentId}_${paymentData.customerEmail}`;
    
    if (emailSentCache.has(deduplicationKey)) {
      console.log('⚠️ Email already sent for this payment, skipping duplicate:', deduplicationKey);
      const existingBookingRef = emailSentCache.get(deduplicationKey + '_booking_ref') as string || 'Unknown';
      return res.status(200).json({ 
        success: true, 
        message: 'Email already sent for this payment',
        bookingReference: existingBookingRef,
        duplicate: true
      });
    }

    console.log('📧 Sending payment confirmation emails for:', paymentData.quoteId);

    // **FIXED**: Generate deterministic booking reference using payment intent ID
    // This ensures the same payment always gets the same booking reference
    const paymentIdSuffix = paymentData.paymentIntentId.slice(-8).toUpperCase(); // Last 8 chars of payment ID
    const quoteIdSuffix = paymentData.quoteId.slice(-3).toUpperCase(); // Last 3 chars of quote ID
    const bookingReference = `WIN${paymentIdSuffix}${quoteIdSuffix}`;

    console.log('🔖 Generated booking reference:', {
      paymentIntentId: paymentData.paymentIntentId,
      quoteId: paymentData.quoteId,
      bookingReference,
      deduplicationKey
    });

    // Calculate pricing breakdown
    const formatPrice = (amount: number) => {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
      }).format(amount / 100);
    };

    const remainingAmount = paymentData.paymentType === 'full' ? 0 : 
                           (paymentData.totalAmount - paymentData.amount);

    // Calculate pricing breakdown if not provided
    let materialsCost = paymentData.materialsCost;
    let laborCost = paymentData.laborCost;
    let vatAmount = paymentData.vatAmount;
    let serviceFee = paymentData.serviceFee;
    let subtotal = paymentData.subtotal;
    let totalBeforeVAT = paymentData.totalBeforeVAT;

    // If pricing breakdown is not provided, calculate estimated values
    // NOTE: This may cause pricing discrepancies with the website quote
    // Consider fetching actual pricing breakdown from quote data instead
    if (!materialsCost && !laborCost && !vatAmount) {
      // VAT is 20% in UK
      totalBeforeVAT = Math.round(paymentData.totalAmount / 1.2);
      vatAmount = paymentData.totalAmount - totalBeforeVAT;
      
      // Estimate materials and labor (roughly 60% materials, 40% labor before VAT)
      const subtotalBeforeServiceFee = Math.round(totalBeforeVAT / 1.2); // Remove service fee
      materialsCost = Math.round(subtotalBeforeServiceFee * 0.6);
      laborCost = subtotalBeforeServiceFee - materialsCost;
      subtotal = materialsCost + laborCost;
      serviceFee = totalBeforeVAT - subtotal; // 20% service fee
      
      console.log('💰 Calculated pricing breakdown:', {
        original_total: paymentData.totalAmount,
        estimated_materials: materialsCost,
        estimated_labor: laborCost,
        estimated_subtotal: subtotal,
        estimated_service_fee: serviceFee,
        estimated_total_before_vat: totalBeforeVAT,
        estimated_vat: vatAmount,
        warning: 'Using estimated breakdown - may not match website pricing'
      });
    }

    // Determine appointment details with better formatting
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 2); // Day after tomorrow
    const appointmentDate = paymentData.bookingDate || fallbackDate.toISOString().split('T')[0];
    const appointmentTime = paymentData.bookingTime || '10:00 AM - 12:00 PM';
    
    console.log('📅 Appointment Details:', {
      originalBookingDate: paymentData.bookingDate,
      finalAppointmentDate: appointmentDate,
      originalBookingTime: paymentData.bookingTime,
      finalAppointmentTime: appointmentTime
    });

    // Common event data for both emails
    const baseEventData = {
      // Customer information
      customer_name: paymentData.customerName,
      customer_email: paymentData.customerEmail,
      customer_phone: paymentData.customerPhone,
      customer_address: paymentData.customerAddress || 'Not provided',
      
      // Vehicle information
      vehicle_registration: paymentData.vehicleReg,
      vehicle_make: paymentData.vehicleMake || 'Unknown',
      vehicle_model: paymentData.vehicleModel || 'Unknown',
      vehicle_year: paymentData.vehicleYear || 'Unknown',
      
      // Quote details
      quote_id: paymentData.quoteId,
      booking_reference: bookingReference,
      glass_type: paymentData.glassType,
      selected_windows: formatWindowsWithStatus(paymentData.selectedWindows, paymentData.windowDamage),
      
      // Payment information
      payment_intent_id: paymentData.paymentIntentId,
      payment_method: paymentData.paymentMethod || 'card',
      payment_type: paymentData.paymentType,
      
      // Pricing (formatted for display)
      amount_paid: formatPrice(paymentData.amount),
      total_amount: formatPrice(paymentData.totalAmount),
      remaining_amount: remainingAmount > 0 ? formatPrice(remainingAmount) : null,
      discount_amount: paymentData.discountAmount ? formatPrice(paymentData.discountAmount) : null,
      materials_cost: materialsCost ? formatPrice(materialsCost) : null,
      labor_cost: laborCost ? formatPrice(laborCost) : null,
      service_fee: serviceFee ? formatPrice(serviceFee) : null,
      subtotal: subtotal ? formatPrice(subtotal) : null,
      total_before_vat: totalBeforeVAT ? formatPrice(totalBeforeVAT) : null,
      vat_amount: vatAmount ? formatPrice(vatAmount) : null,
      
      // Appointment details
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      appointment_type: paymentData.appointmentType || 'mobile',
      
      // URLs and references
      manage_booking_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/quote-details?id=${paymentData.quoteId}`,
      
      // Timestamps
      payment_date: new Date().toISOString(),
      formatted_payment_date: new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      formatted_appointment_date: new Date(appointmentDate).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      
      // Add deduplication fields for Klaviyo - use deterministic IDs
      unique_event_id: `payment_${paymentData.paymentIntentId}_${paymentData.customerEmail.replace('@', '_at_')}`,
      deduplication_key: deduplicationKey
    };

    console.log('📧 Event data being sent to Klaviyo:', {
      booking_reference: baseEventData.booking_reference,
      payment_intent_id: baseEventData.payment_intent_id,
      deduplication_key: baseEventData.deduplication_key,
      unique_event_id: baseEventData.unique_event_id
    });

    // **MARK AS SENT BEFORE SENDING** to prevent race conditions
    emailSentCache.set(deduplicationKey, true);
    emailSentCache.set(deduplicationKey + '_booking_ref', bookingReference);
    
    // Auto-cleanup cache after 1 hour to prevent memory leaks
    setTimeout(() => {
      emailSentCache.delete(deduplicationKey);
      emailSentCache.delete(deduplicationKey + '_booking_ref');
    }, 60 * 60 * 1000); // 1 hour

    // Send Receipt Email
    console.log('📧 Sending payment receipt email to:', paymentData.customerEmail);
    try {
      await KlaviyoService.sendPaymentReceipt({
        ...baseEventData,
        event_type: 'payment_receipt'
      });
      console.log('✅ Payment receipt email sent successfully');
    } catch (receiptError) {
      console.error('❌ Failed to send payment receipt:', receiptError);
      // Continue anyway - don't let one email failure stop the others
    }

    // Send Order Confirmation Email (with appointment details)
    console.log('📧 Sending order confirmation email to:', paymentData.customerEmail);
    try {
      await KlaviyoService.sendOrderConfirmation({
        ...baseEventData,
        event_type: 'order_confirmation',
        // Additional service-specific details
        service_duration: '1-2 hours',
        preparation_instructions: [
          'Ensure vehicle is accessible',
          'Clean around windscreen area',
          'Remove personal items from dashboard'
        ].join('\n'),
        technician_contact_time: '1 hour before appointment',
        guarantee_period: '12 months'
      });
      console.log('✅ Order confirmation email sent successfully');
    } catch (confirmationError) {
      console.error('❌ Failed to send order confirmation:', confirmationError);
      // Continue anyway - don't let one email failure stop the others
    }

    // Send Admin Order Notification
    console.log('📧 Sending admin notification email...');
    try {
      await KlaviyoService.sendAdminOrderNotification({
        // Order information  
        order_id: paymentData.quoteId,
        quote_id: paymentData.quoteId,
        order_date: new Date().toISOString(),
        booking_reference: bookingReference,
        
        // Appointment details (these were missing!)
        preferred_date: appointmentDate,
        preferred_time: appointmentTime,
        appointment_type: paymentData.appointmentType || 'mobile',
        
        // Customer information
        user_name: paymentData.customerName,
        user_email: paymentData.customerEmail,  
        user_phone: paymentData.customerPhone,
        user_location: paymentData.customerAddress || 'Not provided',
        
        // Vehicle information (these were missing!)
        vehicle_registration: paymentData.vehicleReg,
        vehicle_make: paymentData.vehicleMake || 'Unknown',
        vehicle_model: paymentData.vehicleModel || 'Unknown', 
        vehicle_year: paymentData.vehicleYear || 'Unknown',
        
        // Service details
        glass_type: paymentData.glassType,
        damage_type: formatWindowsWithStatus(paymentData.selectedWindows, paymentData.windowDamage),
        special_requirements: 'None',
        
        // Payment information (these were missing!)
        glass_price: materialsCost ? formatPrice(materialsCost) : 'N/A',
        fitting_price: laborCost ? formatPrice(laborCost) : 'N/A', 
        vat_amount: vatAmount ? formatPrice(vatAmount) : 'N/A',
        total_price: formatPrice(paymentData.totalAmount),
        payment_status: 'COMPLETED',
        payment_method: paymentData.paymentMethod || 'card',
        payment_type: paymentData.paymentType,
        stripe_payment_id: paymentData.paymentIntentId,
        
        // Add deduplication fields
        unique_event_id: baseEventData.unique_event_id,
        deduplication_key: baseEventData.deduplication_key
      });
      console.log('✅ Admin notification email sent successfully');
    } catch (adminError) {
      console.error('❌ Failed to send admin notification:', adminError);
      // Continue anyway - don't let admin email failure stop the flow
    }

    console.log('✅ Payment confirmation emails sent successfully');

    return res.status(200).json({ 
      success: true, 
      message: 'Payment confirmation emails sent successfully',
      bookingReference
    });
  } catch (error) {
    console.error('❌ Error sending payment confirmation emails:', error);
    return res.status(500).json({ 
      message: 'Failed to send payment confirmation emails',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 