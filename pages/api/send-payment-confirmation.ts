import type { NextApiRequest, NextApiResponse } from 'next';
import KlaviyoService from '../../lib/klaviyo';

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
  
  // Booking details
  bookingDate?: string;
  bookingTime?: string;
  appointmentType?: string; // 'mobile' or 'workshop'
  
  // Pricing breakdown
  materialsCost?: number;
  laborCost?: number;
  vatAmount?: number;
  discountAmount?: number;
}

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

    console.log('📧 Sending payment confirmation emails for:', paymentData.quoteId);

    // Generate a unique booking reference
    const bookingReference = `WC${Date.now().toString().slice(-6)}${paymentData.quoteId.slice(-3)}`;

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

    // If pricing breakdown is not provided, calculate estimated values
    // NOTE: This may cause pricing discrepancies with the website quote
    // Consider fetching actual pricing breakdown from quote data instead
    if (!materialsCost && !laborCost && !vatAmount) {
      // VAT is 20% in UK
      const totalWithoutVat = Math.round(paymentData.totalAmount / 1.2);
      vatAmount = paymentData.totalAmount - totalWithoutVat;
      
      // Estimate materials and labor (roughly 60% materials, 40% labor before VAT)
      materialsCost = Math.round(totalWithoutVat * 0.6);
      laborCost = totalWithoutVat - materialsCost;
      
      console.log('💰 Calculated pricing breakdown:', {
        original_total: paymentData.totalAmount,
        estimated_materials: materialsCost,
        estimated_labor: laborCost,
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
      selected_windows: paymentData.selectedWindows.join(', '),
      
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
      })
    };

    console.log('📧 Event data being sent to Klaviyo:', {
      booking_reference: baseEventData.booking_reference,
      appointment_date: baseEventData.appointment_date,
      appointment_time: baseEventData.appointment_time,
      formatted_appointment_date: baseEventData.formatted_appointment_date,
      amount_paid: baseEventData.amount_paid,
      total_amount: baseEventData.total_amount,
      materials_cost: baseEventData.materials_cost,
      labor_cost: baseEventData.labor_cost,
      vat_amount: baseEventData.vat_amount,
      discount_amount: baseEventData.discount_amount
    });

    // Send Receipt Email
    await KlaviyoService.sendPaymentReceipt({
      ...baseEventData,
      event_type: 'payment_receipt'
    });

    // Send Order Confirmation Email (with appointment details)
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

    // Send Admin Order Notification (NEW!)
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
      damage_type: paymentData.selectedWindows.join(', '),
      special_requirements: 'None',
      
      // Payment information (these were missing!)
      glass_price: materialsCost ? formatPrice(materialsCost) : 'N/A',
      fitting_price: laborCost ? formatPrice(laborCost) : 'N/A', 
      vat_amount: vatAmount ? formatPrice(vatAmount) : 'N/A',
      total_price: formatPrice(paymentData.totalAmount),
      payment_status: 'COMPLETED',
      payment_method: paymentData.paymentMethod || 'card',
      payment_type: paymentData.paymentType,
      stripe_payment_id: paymentData.paymentIntentId
    });

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