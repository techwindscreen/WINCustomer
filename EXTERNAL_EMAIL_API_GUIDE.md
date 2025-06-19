# External Email Service API Guide

## Overview

This guide explains how external applications can use the WindCompare Klaviyo email service to send professional emails without setting up their own Klaviyo integration.

## Available Endpoints

### 1. Generic Email Service (Recommended)
**Endpoint:** `POST /api/external-email-service`
**URL:** `https://your-windcompare-domain.com/api/external-email-service`

This is a new, flexible endpoint designed specifically for external applications.

#### Request Format:
```json
{
  "type": "payment_receipt | order_confirmation | admin_notification",
  "recipient_email": "customer@example.com",
  "data": {
    // Email template data (see examples below)
  }
}
```

#### Response Format:
```json
{
  "success": true,
  "message": "Email sent successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Existing Specific Endpoints
- `POST /api/send-payment-confirmation` - Full payment flow emails
- `POST /api/track-quote-started` - Quote tracking
- `POST /api/submit-contact-info` - Admin notifications

## Email Types and Examples

### Payment Receipt Email
Sends a professional payment receipt to customers.

```javascript
const paymentReceiptData = {
  type: "payment_receipt",
  recipient_email: "customer@example.com",
  data: {
    // Customer information
    customer_name: "John Doe",
    customer_phone: "+44123456789",
    customer_address: "123 Main Street, London",
    
    // Payment details
    payment_intent_id: "pi_1234567890",
    payment_method: "card",
    payment_type: "full", // or "deposit", "split"
    amount_paid: "£250.00",
    total_amount: "£250.00",
    
    // Service details
    booking_reference: "WC123456",
    vehicle_registration: "AB12 CDE",
    glass_type: "OEE",
    selected_windows: "Front windscreen",
    
    // Appointment
    appointment_date: "2024-02-15",
    appointment_time: "10:00 AM - 12:00 PM",
    formatted_appointment_date: "Thursday, 15th February 2024",
    
    // Pricing breakdown (optional)
    materials_cost: "£150.00",
    labor_cost: "£80.00",
    vat_amount: "£20.00",
    
    // URLs
    manage_booking_url: "https://your-app.com/booking/WC123456"
  }
};

// Send the email
fetch('https://your-windcompare-domain.com/api/external-email-service', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(paymentReceiptData)
});
```

### Order Confirmation Email
Sends appointment and service details to customers.

```javascript
const orderConfirmationData = {
  type: "order_confirmation",
  recipient_email: "customer@example.com",
  data: {
    // Customer information
    customer_name: "John Doe",
    customer_email: "customer@example.com",
    customer_phone: "+44123456789",
    
    // Service details
    booking_reference: "WC123456",
    vehicle_registration: "AB12 CDE",
    glass_type: "OEE",
    selected_windows: "Front windscreen",
    
    // Appointment details
    appointment_date: "2024-02-15",
    appointment_time: "10:00 AM - 12:00 PM",
    formatted_appointment_date: "Thursday, 15th February 2024",
    appointment_type: "mobile", // or "workshop"
    
    // Service information
    service_duration: "1-2 hours",
    preparation_instructions: "Ensure vehicle is accessible\nClean around windscreen area",
    technician_contact_time: "1 hour before appointment",
    guarantee_period: "12 months",
    
    // Payment status
    payment_type: "full",
    amount_paid: "£250.00",
    
    // URLs
    manage_booking_url: "https://your-app.com/booking/WC123456"
  }
};
```

### Admin Notification Email
Sends order notifications to administrators.

```javascript
const adminNotificationData = {
  type: "admin_notification",
  recipient_email: "admin@yourcompany.com", // Admin email
  data: {
    // Order information
    quote_id: "quote_123456",
    order_date: "2024-01-15T10:30:00.000Z",
    
    // Customer information
    user_name: "John Doe",
    user_email: "customer@example.com",
    user_phone: "+44123456789",
    user_location: "London, UK",
    
    // Vehicle information
    vehicle_registration: "AB12 CDE",
    vehicle_make: "Ford",
    vehicle_model: "Focus",
    vehicle_year: "2020",
    
    // Service details
    glass_type: "OEE",
    damage_type: "Front windscreen crack",
    special_requirements: "ADAS calibration required",
    
    // Pricing
    total_price: "£250.00",
    glass_price: "£150.00",
    fitting_price: "£80.00",
    vat_amount: "£20.00",
    payment_method: "card",
    payment_status: "COMPLETED",
    
    // Appointment
    preferred_date: "2024-02-15",
    preferred_time: "10:00 AM - 12:00 PM",
    appointment_type: "mobile"
  }
};
```

## Authentication & Security

Currently, the API doesn't require authentication, but you should consider:

1. **IP Whitelisting**: Configure your server to only accept requests from trusted IPs
2. **API Key**: Add an API key requirement for external applications
3. **Rate Limiting**: Implement rate limiting to prevent abuse

### Adding API Key Authentication (Recommended)

You can modify the endpoints to require an API key:

```javascript
// In your external application
const emailData = {
  // ... your email data
};

fetch('https://your-windcompare-domain.com/api/external-email-service', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-secret-api-key' // Add this header
  },
  body: JSON.stringify(emailData)
});
```

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `400` - Bad request (missing required fields)
- `405` - Method not allowed (not POST)
- `500` - Server error (Klaviyo API failed)

Example error response:
```json
{
  "success": false,
  "message": "Email type, recipient email, and data are required",
  "error": "Validation failed"
}
```

## Environment Setup Required

Your WindCompare application needs these environment variables:

```bash
# Klaviyo Configuration
KLAVIYO_PRIVATE_API_KEY=pk_your_private_api_key_here
ADMIN_EMAIL=admin@windscreencompare.com
NEXT_PUBLIC_SITE_URL=https://your-windcompare-domain.com
```

## Integration Examples

### Node.js/Express Application
```javascript
const express = require('express');
const fetch = require('node-fetch');

const app = express();

// Function to send payment receipt
async function sendPaymentReceipt(customerData) {
  try {
    const response = await fetch('https://your-windcompare-domain.com/api/external-email-service', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment_receipt',
        recipient_email: customerData.email,
        data: customerData
      })
    });
    
    const result = await response.json();
    console.log('Email sent:', result);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Use in your payment success handler
app.post('/payment-success', async (req, res) => {
  // ... process payment
  
  // Send confirmation email via WindCompare service
  await sendPaymentReceipt(req.body.customerData);
  
  res.json({ success: true });
});
```

### Python/Django Application
```python
import requests
import json

def send_order_confirmation(customer_data):
    url = "https://your-windcompare-domain.com/api/external-email-service"
    
    payload = {
        "type": "order_confirmation",
        "recipient_email": customer_data["email"],
        "data": customer_data
    }
    
    try:
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload)
        )
        
        if response.status_code == 200:
            print("Email sent successfully")
            return response.json()
        else:
            print(f"Failed to send email: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Error sending email: {e}")
        return None
```

## Testing

You can test the email service using curl:

```bash
curl -X POST https://your-windcompare-domain.com/api/external-email-service \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_receipt",
    "recipient_email": "test@example.com",
    "data": {
      "customer_name": "Test Customer",
      "booking_reference": "TEST123",
      "amount_paid": "£100.00",
      "vehicle_registration": "TEST123",
      "appointment_date": "2024-02-15"
    }
  }'
```

## Support

If you need help integrating with the email service:

1. Check the server logs for detailed error messages
2. Verify all required fields are included in your request
3. Test with the curl examples above
4. Check your WindCompare application's environment variables

The email templates are designed to be professional and match the WindCompare branding, so your external application can send emails that look like they come from a established service provider. 