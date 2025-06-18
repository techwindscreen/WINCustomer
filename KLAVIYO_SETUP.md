# Klaviyo Integration Setup Guide

## Overview

This guide explains how to integrate Klaviyo with your windscreen comparison website to track user behavior, send admin notifications, and automatically send payment confirmation emails to customers.

## 1. Klaviyo Account Setup

### Create Klaviyo Account
1. Sign up at [klaviyo.com](https://klaviyo.com)
2. Complete account verification
3. Create your first List (e.g., "Windscreen Quote Leads")

### Get API Keys
1. Go to **Account > Settings > API Keys**
2. Create a **Private API Key** with the following permissions:
   - `Read` for Lists
   - `Read/Write` for Events
   - `Read/Write` for Profiles
3. Copy the Private API Key

## 2. Environment Variables

Add these variables to your `.env.local` file:

```bash
# Klaviyo Configuration
KLAVIYO_PRIVATE_API_KEY=pk_your_private_api_key_here
ADMIN_EMAIL=admin@windscreencompare.com
```

## 3. Klaviyo Flow Setup

### Create Email Flows for Admin Notifications

#### Flow 1: Quote Started Alert
1. Go to **Flows** in Klaviyo dashboard
2. Create new flow: **"Admin: Quote Started Alert"**
3. Set trigger: **Metric: "Quote Started"**
4. Add email template (see existing klaviyo-quote-completion-template.html)

#### Flow 2: Quote Completed Alert  
1. Create new flow: **"Admin: Quote Completed Alert"**
2. Set trigger: **Metric: "Admin: Quote Completed"**
3. Add email template for admin notifications

### Create Customer Email Flows (NEW)

#### Flow 3: Payment Receipt Email
1. Create new flow: **"Customer: Payment Receipt"**
2. Set trigger: **Metric: "Payment Receipt"**
3. Create email template using `klaviyo-payment-receipt-template.html`
4. Set recipient to: `{{event.customer_email}}`

**Template Setup:**
- Copy the content from `klaviyo-payment-receipt-template.html`
- This email includes:
  - Payment confirmation details
  - Service summary
  - Booking reference
  - Price breakdown
  - Receipt for customer records

#### Flow 4: Order Confirmation Email
1. Create new flow: **"Customer: Order Confirmation"**
2. Set trigger: **Metric: "Order Confirmation"**
3. Create email template using `klaviyo-order-confirmation-template.html`
4. Set recipient to: `{{event.customer_email}}`

**Template Setup:**
- Copy the content from `klaviyo-order-confirmation-template.html`
- This email includes:
  - Service appointment details
  - Preparation instructions
  - What to expect next
  - Contact information
  - Payment status

### Flow 5: Customer Follow-up (Optional)
1. Create flow: **"Quote Follow-up Sequence"**
2. Set trigger: **Metric: "Quote Process Started"**
3. Add time delays and multiple emails:
   - **Immediate**: Welcome email with quote status
   - **2 hours**: Reminder to complete quote
   - **24 hours**: Special offer email
   - **7 days**: Testimonials and social proof

## 4. Email Flow Triggers

The system now automatically triggers emails at these points:

### Payment Success Flow
When a customer completes payment, the system will:

1. **Verify payment** with Stripe
2. **Send Payment Receipt** (immediate)
   - Confirmation of payment received
   - Payment details and breakdown
   - Service summary
   - Booking reference

3. **Send Order Confirmation** (immediate)
   - Service appointment details
   - What happens next
   - Preparation instructions
   - Contact information

### Implementation Details

The payment confirmation emails are triggered in `pages/payment-success.tsx` after successful payment verification. The system:

- Fetches quote data from Supabase
- Extracts customer and service details
- Calls `/api/send-payment-confirmation`
- Sends both receipt and confirmation emails via Klaviyo

## 5. Testing the Integration

### Test Quote Started Event
1. Go to your website homepage
2. Enter a test vehicle registration and postcode
3. Submit the form
4. Check Klaviyo dashboard under **Analytics > Metrics**
5. Look for events: "Quote Process Started" and "Admin: New Quote Started"

### Test Quote Completed Event
1. Complete the full quote process
2. Fill in contact information
3. Submit the contact form
4. Check for events: "Quote Completed" and "Admin: Quote Completed"
5. Verify admin email was sent

### Test Payment Confirmation Emails (NEW)
1. Complete a full payment flow using Stripe
2. Navigate to payment success page
3. Check Klaviyo dashboard for:
   - **"Payment Receipt"** event
   - **"Order Confirmation"** event
4. Verify both customer emails were sent
5. Check email content and formatting

## 6. Monitoring and Analytics

### Key Metrics to Track
- **Quote Process Started**: Total users entering the funnel
- **Quote Completed**: Conversion rate from start to completion
- **Payment Receipt**: Successful payments processed
- **Order Confirmation**: Service bookings confirmed
- **Quote Abandoned**: Users who didn't complete the process

### Klaviyo Reports
1. Go to **Analytics > Metrics**
2. Create custom reports for:
   - Daily quote starts vs completions
   - Payment completion rates
   - Email open/click rates
   - Conversion rate by traffic source
   - Peak times for quote activity

### Segmentation
Create segments for:
- **Paying Customers**: Completed payments in last 30 days
- **Hot Leads**: Completed quotes in last 24 hours
- **Warm Leads**: Started quotes but not completed
- **Cold Leads**: No activity in 7+ days

## 7. Advanced Features

### A/B Testing
- Test different email subject lines for customer confirmations
- Test timing of follow-up emails
- Test different call-to-action buttons
- Test payment vs service-focused messaging

### Personalization
- Use vehicle details in emails
- Customize messages based on glass type selected
- Send location-specific technician information
- Include personalized pricing breakdowns

### Email Automation Sequences
- Payment confirmation → appointment reminder (24h before)
- Service completion → feedback request (1 day after)
- Feedback collection → review request (3 days after)

## 8. Troubleshooting

### Common Issues

#### "Klaviyo API key not configured" Warning
- Check `.env.local` file has `KLAVIYO_PRIVATE_API_KEY`
- Restart Next.js development server
- Verify API key is valid in Klaviyo dashboard

#### Events Not Appearing in Klaviyo
- Check browser console for API errors
- Verify API key permissions include Events write access
- Check that metric names match exactly in flows

#### Admin Emails Not Sending
- Verify flow is active (not draft)
- Check `ADMIN_EMAIL` environment variable
- Ensure admin profile exists in Klaviyo

#### Customer Emails Not Sending
- Verify payment flow triggers properly
- Check customer email address is valid
- Ensure flows are active and not in draft mode
- Check API call logs in browser/server console

### Debug Mode
Add this to your `.env.local` for verbose logging:
```bash
KLAVIYO_DEBUG=true
```

## 9. Production Checklist

Before going live:
- [ ] Klaviyo API keys configured
- [ ] Admin email flows tested and active
- [ ] Customer payment receipt flow tested and active
- [ ] Customer order confirmation flow tested and active
- [ ] Environment variables set in production
- [ ] Test payments completed end-to-end
- [ ] Admin notifications received successfully
- [ ] Customer emails received successfully
- [ ] Analytics tracking verified
- [ ] Email templates formatted properly
- [ ] All links in emails work correctly

## 10. Data Privacy Compliance

### GDPR Considerations
- Include Klaviyo in privacy policy
- Provide opt-out mechanisms in all customer emails
- Handle data deletion requests
- Use double opt-in for marketing emails (not transactional)

### Data Retention
- Set up automatic profile deletion for inactive users
- Regularly clean up test data
- Monitor data usage against Klaviyo limits

## 11. Email Template Customization

### Payment Receipt Template
Location: `klaviyo-payment-receipt-template.html`

Key sections:
- Payment details and transaction ID
- Service summary with booking reference
- Price breakdown with VAT
- Outstanding balance (if applicable)
- Contact information

### Order Confirmation Template
Location: `klaviyo-order-confirmation-template.html`

Key sections:
- Booking reference and appointment details
- Service timeline and expectations
- Preparation instructions
- Payment status
- Guarantee information

### Customization Tips
- Update company branding colors
- Modify contact information
- Adjust appointment timing expectations
- Customize service guarantees
- Add local technician information

## Support

For technical issues:
- Check Klaviyo API documentation: [developers.klaviyo.com](https://developers.klaviyo.com)
- Review Next.js API route logs
- Contact Klaviyo support for account-specific issues

---

## Summary

This enhanced Klaviyo integration provides:
✅ Real-time admin notifications when quotes start and complete
✅ Automatic payment receipt emails to customers
✅ Comprehensive order confirmation with service details
✅ Customer behavior tracking and analytics
✅ Automated follow-up email capabilities
✅ Comprehensive data for business insights
✅ Professional email templates with company branding

The integration is designed to be robust - if Klaviyo is down, it won't affect your main quote or payment process. All customer communication is handled automatically after successful payment, providing a seamless experience. 