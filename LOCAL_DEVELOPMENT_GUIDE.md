# Local Development Guide - Klaviyo Email API

## 🏠 Setting Up Locally

### 1. Environment Variables
Create a `.env.local` file in your project root with:

```bash
# Required for Klaviyo email functionality
KLAVIYO_PRIVATE_API_KEY=pk_your_private_api_key_here
ADMIN_EMAIL=admin@windscreencompare.com

# Local development URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional: API key for external applications
EXTERNAL_API_KEY=your-secret-test-key-123
```

### 2. Start Your Local Server
```bash
npm run dev
# or
yarn dev
```

Your server will typically run on `http://localhost:3000`

## 🧪 Testing Locally

### Using curl
Test the email service directly from your terminal:

```bash
# Test payment receipt email
curl -X POST http://localhost:3000/api/external-email-service \
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

```bash
# Test order confirmation email
curl -X POST http://localhost:3000/api/external-email-service \
  -H "Content-Type: application/json" \
  -d '{
    "type": "order_confirmation",
    "recipient_email": "customer@example.com",
    "data": {
      "customer_name": "John Doe",
      "booking_reference": "WC123456",
      "vehicle_registration": "AB12 CDE",
      "appointment_date": "2024-02-15",
      "appointment_time": "10:00 AM - 12:00 PM"
    }
  }'
```

### Using JavaScript (Browser Console)
Open your browser console on any page and run:

```javascript
// Test payment receipt
fetch('http://localhost:3000/api/external-email-service', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'payment_receipt',
    recipient_email: 'test@example.com',
    data: {
      customer_name: 'Test Customer',
      booking_reference: 'LOCAL123',
      amount_paid: '£150.00',
      vehicle_registration: 'TEST123',
      appointment_date: '2024-02-15'
    }
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
```

## 🔗 Using from Another Local Application

### Example: Node.js Application
If you have another Node.js application running locally:

```javascript
// local-test-app.js
const express = require('express');
const fetch = require('node-fetch'); // or use built-in fetch in Node 18+

const app = express();
app.use(express.json());

// Function to send email via local WindCompare service
async function sendEmailViaWindCompare(emailType, recipientEmail, data) {
  try {
    const response = await fetch('http://localhost:3000/api/external-email-service', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: emailType,
        recipient_email: recipientEmail,
        data: data
      })
    });
    
    const result = await response.json();
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

// Test endpoint in your other application
app.post('/test-email', async (req, res) => {
  try {
    const result = await sendEmailViaWindCompare('payment_receipt', 'test@example.com', {
      customer_name: 'Local Test Customer',
      booking_reference: 'LOCAL456',
      amount_paid: '£200.00',
      vehicle_registration: 'ABC123',
      appointment_date: '2024-02-20'
    });
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Test app running on http://localhost:3001');
  console.log('Try: POST http://localhost:3001/test-email');
});
```

### Example: Python Application
```python
# local_test.py
import requests
import json

def send_email_via_windcompare(email_type, recipient_email, data):
    url = "http://localhost:3000/api/external-email-service"
    
    payload = {
        "type": email_type,
        "recipient_email": recipient_email,
        "data": data
    }
    
    try:
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload)
        )
        
        if response.status_code == 200:
            print("✅ Email sent successfully")
            return response.json()
        else:
            print(f"❌ Failed to send email: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"💥 Error sending email: {e}")
        return None

# Test the service
if __name__ == "__main__":
    result = send_email_via_windcompare(
        "payment_receipt",
        "test@example.com",
        {
            "customer_name": "Python Test Customer",
            "booking_reference": "PY123",
            "amount_paid": "£175.00",
            "vehicle_registration": "PY123ABC",
            "appointment_date": "2024-02-25"
        }
    )
    print("Result:", result)
```

## 🐛 Debugging Local Issues

### 1. Check Server Logs
Monitor your Next.js console for error messages:
```bash
npm run dev
# Watch for console output when making API calls
```

### 2. Verify Environment Variables
Add this to any API file to debug:
```javascript
console.log('🔑 Klaviyo key exists:', !!process.env.KLAVIYO_PRIVATE_API_KEY);
console.log('📧 Admin email:', process.env.ADMIN_EMAIL);
console.log('🌐 Site URL:', process.env.NEXT_PUBLIC_SITE_URL);
```

### 3. Test Klaviyo Connection
Create a simple test endpoint:

```javascript
// pages/api/test-klaviyo.js
import KlaviyoService from '../../lib/klaviyo';

export default async function handler(req, res) {
  try {
    // Simple test call to Klaviyo
    console.log('Testing Klaviyo connection...');
    
    await KlaviyoService.sendPaymentReceipt({
      customer_email: 'test@example.com',
      customer_name: 'Test Customer',
      booking_reference: 'TEST123',
      amount_paid: '£100.00'
    });
    
    res.json({ success: true, message: 'Klaviyo test successful' });
  } catch (error) {
    console.error('Klaviyo test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
```

Test it: `http://localhost:3000/api/test-klaviyo`

## 🔒 CORS Issues (if any)

If you're calling from a browser-based application on a different port, you might need to handle CORS. Add this to your API files:

```javascript
// Add to the top of your API handlers
export default async function handler(req, res) {
  // Handle CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // ... rest of your handler
}
```

## 📱 Testing from Mobile/Other Devices on Local Network

If you want to test from other devices on your local network:

1. Find your local IP address:
```bash
# On macOS/Linux
ifconfig | grep inet
# Look for something like 192.168.1.100

# On Windows
ipconfig
```

2. Use your local IP instead of localhost:
```javascript
fetch('http://192.168.1.100:3000/api/external-email-service', {
  // ... your request
});
```

## 🚀 Quick Start Commands

```bash
# 1. Start WindCompare application
npm run dev

# 2. Test email service (in another terminal)
curl -X POST http://localhost:3000/api/external-email-service \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_receipt","recipient_email":"test@example.com","data":{"customer_name":"Test","booking_reference":"TEST123","amount_paid":"£100.00"}}'

# 3. Check logs in the first terminal for success/error messages
```

## ✅ Local Development Checklist

- [ ] `.env.local` file created with Klaviyo API key
- [ ] WindCompare application running on `http://localhost:3000`
- [ ] Klaviyo API key is valid and has correct permissions
- [ ] Test email sent successfully via curl/browser console
- [ ] External application can call the local API endpoints
- [ ] Email templates display correctly in Klaviyo dashboard

This setup allows you to fully test the email functionality locally before deploying to production! 