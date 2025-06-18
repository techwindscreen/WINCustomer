// Klaviyo Quote Completion Trigger
// Call this function when user successfully completes their quote

function triggerQuoteCompletionEvent(quoteData) {
  // Ensure Klaviyo is loaded
  if (typeof klaviyo === 'undefined') {
    console.error('Klaviyo is not loaded');
    return;
  }

  // Prepare the event data
  const eventData = {
    // Customer information
    user_name: quoteData.customerName,
    user_email: quoteData.customerEmail,
    user_phone: quoteData.customerPhone,
    user_location: quoteData.postcode,
    
    // Vehicle information
    vehicle_registration: quoteData.vehicleReg,
    vehicle_make: quoteData.vehicleMake,
    vehicle_model: quoteData.vehicleModel,
    vehicle_year: quoteData.vehicleYear,
    
    // Quote details
    quote_id: quoteData.quoteId,
    booking_reference: quoteData.bookingReference,
    glass_type: quoteData.glassType, // 'OEE' or 'OEM'
    
    // Pricing breakdown
    total_price: quoteData.totalPrice,
    glass_price: quoteData.glassPrice,
    fitting_price: quoteData.fittingPrice,
    vat_amount: quoteData.vatAmount,
    
    // Payment information
    payment_method: quoteData.paymentMethod, // 'card', 'bank_transfer', etc.
    payment_type: quoteData.paymentType, // 'pay_in_full', 'pay_deposit', 'split_payment'
    deposit_amount: quoteData.depositAmount || null,
    remaining_amount: quoteData.remainingAmount || null,
    
    // Appointment details
    preferred_date: quoteData.preferredDate,
    preferred_time: quoteData.preferredTime,
    appointment_type: quoteData.appointmentType, // 'mobile', 'workshop'
    
    // Damage information
    damage_locations: quoteData.damageLocations, // Array of selected windows
    damage_types: quoteData.damageTypes, // Array of damage types
    
    // URLs and references
    dashboard_url: `${window.location.origin}/dashboard?quote=${quoteData.quoteId}`,
    
    // Timestamps
    quote_created_at: quoteData.createdAt,
    formatted_timestamp: new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };

  // Identify the customer
  klaviyo.identify({
    email: quoteData.customerEmail,
    first_name: quoteData.customerName.split(' ')[0],
    last_name: quoteData.customerName.split(' ').slice(1).join(' '),
    phone_number: quoteData.customerPhone,
    properties: {
      postcode: quoteData.postcode,
      vehicle_registration: quoteData.vehicleReg
    }
  });

  // Track the quote completion event
  klaviyo.track('Quote Completed', eventData);

  console.log('Quote completion event sent to Klaviyo:', eventData);
}

// Example usage - call this when quote is successfully submitted
/*
const exampleQuoteData = {
  customerName: "John Smith",
  customerEmail: "john.smith@email.com",
  customerPhone: "+44 7123 456789",
  postcode: "SW1A 1AA",
  vehicleReg: "AB12 CDE",
  vehicleMake: "Ford",
  vehicleModel: "Focus",
  vehicleYear: "2020",
  quoteId: "WC-2024-001234",
  bookingReference: "BK-001234",
  glassType: "OEE",
  totalPrice: "£299.99",
  glassPrice: "£199.99",
  fittingPrice: "£80.00",
  vatAmount: "£20.00",
  paymentMethod: "card",
  paymentType: "pay_deposit",
  depositAmount: "£50.00",
  remainingAmount: "£249.99",
  preferredDate: "2024-01-15",
  preferredTime: "10:00 AM",
  appointmentType: "mobile",
  damageLocations: ["Front Windscreen"],
  damageTypes: ["Chip", "Crack"],
  createdAt: new Date().toISOString()
};

triggerQuoteCompletionEvent(exampleQuoteData);
*/

// Integration with your existing quote submission process
// Add this to your quote submission success handler:
/*
// In your quote submission success callback:
const handleQuoteSubmissionSuccess = (responseData) => {
  // Your existing success logic...
  
  // Trigger Klaviyo event
  triggerQuoteCompletionEvent({
    customerName: formData.name,
    customerEmail: formData.email,
    customerPhone: formData.phone,
    postcode: formData.postcode,
    vehicleReg: vehicleData.registration,
    vehicleMake: vehicleData.make,
    vehicleModel: vehicleData.model,
    vehicleYear: vehicleData.year,
    quoteId: responseData.quoteId,
    bookingReference: responseData.bookingReference,
    glassType: selectedGlassType,
    totalPrice: calculateTotalPrice(),
    glassPrice: glassPrice,
    fittingPrice: fittingPrice,
    vatAmount: vatAmount,
    paymentMethod: selectedPaymentMethod,
    paymentType: selectedPaymentType,
    depositAmount: depositAmount,
    remainingAmount: remainingAmount,
    preferredDate: appointmentData.date,
    preferredTime: appointmentData.time,
    appointmentType: appointmentData.type,
    damageLocations: selectedWindows,
    damageTypes: selectedDamageTypes,
    createdAt: new Date().toISOString()
  });
};
*/ 