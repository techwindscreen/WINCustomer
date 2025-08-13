# Klaviyo Winback Email Campaign Setup Guide

This guide shows you how to set up the permanent magic link winback email campaign in Klaviyo.

## 📧 Email Templates Created

1. **klaviyo-winback-quote-ready-template.html** - Main HTML template for first winback email
2. **klaviyo-winback-quote-ready-text.txt** - Text version for better deliverability
3. **klaviyo-winback-follow-up-template.html** - Follow-up email for continued winback

## 🔧 Klaviyo Setup Instructions

### Step 1: Create the Flow

1. Go to Klaviyo Dashboard → Flows → Create Flow
2. Choose "Create from Scratch"
3. Name it: "Windscreen Quote Winback Campaign"

### Step 2: Set the Trigger

**Trigger:** Custom Event
- Event Name: `Quote Completed` (this is already triggered when customers submit contact info)
- Wait for: 2 hours (to allow for immediate payments)

### Step 3: Add Filter

Add a conditional filter:
- **If/Else Split:** Check if customer has made a payment
- **Condition:** `payment_status` not equals `paid`
- **Yes Branch:** Continue with winback emails
- **No Branch:** End flow (customer already paid)

### Step 4: Create Email Sequence

#### Email 1: Quote Ready (Send after 2 hours)
- **Subject:** "Your Windscreen Quote is Ready - Complete Your Booking"
- **Template:** Use `klaviyo-winback-quote-ready-template.html`
- **Timing:** 2 hours after quote completion

#### Email 2: Follow-up (Send after 3 days)
- **Subject:** "Still Interested? Your Quote is Waiting"
- **Template:** Use `klaviyo-winback-follow-up-template.html`
- **Timing:** 3 days after Email 1
- **Add Filter:** Only send if still not paid

#### Email 3: Final Reminder (Send after 7 days)
- **Subject:** "Last Chance - Don't Miss Out on Your Quote"
- **Template:** Modify the follow-up template with more urgency
- **Timing:** 7 days after Email 2
- **Add Filter:** Only send if still not paid

## 🔗 Magic Link Implementation

### The Magic Link URL
The permanent magic link is embedded in the templates as:
```html
https://quote.windscreencompare.com/api/get-permanent-link?quoteId={{ event.quote_id }}&email={{ person.email }}
```

### Required Data Variables
Make sure these variables are available in your Klaviyo events:

**Required:**
- `{{ event.quote_id }}` - The quote ID
- `{{ person.email }}` - Customer email address

**Optional (enhances personalization):**
- `{{ person.first_name }}` - Customer's first name
- `{{ event.vehicle_registration }}` - Vehicle reg number
- `{{ event.glass_type }}` - OEM or OEE
- `{{ event.total_price }}` - Total quote price
- `{{ event.deposit_amount }}` - 30% deposit amount

## 📊 Event Tracking Setup

The system automatically sends the `Quote Completed` event when customers submit contact info. The event includes:

```javascript
{
  // Customer information
  user_name: "John Smith",
  user_email: "john@example.com",
  user_phone: "+44XXXXXXXXX",
  user_location: "London",
  
  // Quote details
  quote_id: "WIN123456",
  vehicle_registration: "AB12 CDE",
  glass_type: "OEE",
  total_price: 299.99,
  
  // Pricing breakdown
  deposit_amount: 89.99
}
```

## 🎯 Segmentation

### Create Segments:
1. **Unpaid Quotes** - Customers who completed quotes but haven't paid
2. **High Value Quotes** - Quotes over £300 (for priority follow-up)
3. **Mobile Service Customers** - For location-specific messaging

### Suggested Segments:
```
Segment: Unpaid Windscreen Quotes
Conditions: 
- Has completed "Quote Completed" event
- Has NOT completed "Payment Successful" event
- Event occurred in last 30 days
```

## ✅ Testing Checklist

Before launching:

1. **Test the Magic Link:**
   - Complete a test quote on your website
   - Check that the permanent magic link is generated
   - Verify the link takes you to the payment page
   - Test all payment options (full, deposit, Klarna)

2. **Test Email Variables:**
   - Send test emails with sample data
   - Verify all variables populate correctly
   - Check both HTML and text versions

3. **Test Flow Logic:**
   - Trigger the flow with test data
   - Verify timing and filters work correctly
   - Test the payment status filter

## 📈 Recommended Timing

```
Quote Completed
    ↓
Wait 2 hours (allow immediate payment)
    ↓
Email 1: "Quote Ready" (friendly reminder)
    ↓
Wait 3 days
    ↓
Email 2: "Still Interested?" (social proof + urgency)
    ↓
Wait 7 days
    ↓
Email 3: "Final Reminder" (last chance)
    ↓
End Flow
```

## 🎨 Customization Tips

1. **Brand Colors:** Update the CSS colors to match your brand
2. **Logo:** Replace the "WC" logo placeholder with your actual logo
3. **Phone Numbers:** Update all phone numbers to your actual contact details
4. **Social Links:** Add your real social media links
5. **Testimonials:** Replace with real customer testimonials

## 📱 Mobile Optimization

The templates are fully responsive and optimized for:
- Mobile phones (320px+)
- Tablets (768px+)
- Desktop (1024px+)

## 🔒 Security & Privacy

- Magic links are secure and tied to the customer's email
- Links can be deactivated if needed for security
- GDPR compliant with unsubscribe options
- No sensitive payment data in emails

## 📊 Success Metrics to Track

1. **Open Rate** - Target: 25-35%
2. **Click Rate** - Target: 8-15%
3. **Conversion Rate** - Target: 5-12%
4. **Revenue per Email** - Track total revenue generated
5. **Flow Revenue** - Total revenue from the entire sequence

## 🚀 Launch Steps

1. Import the HTML templates into Klaviyo
2. Set up the flow with proper triggers and timing
3. Test with a small segment first
4. Monitor performance for 1-2 weeks
5. Optimize based on results
6. Scale to full audience

## 💡 Pro Tips

1. **A/B Testing:** Test different subject lines and send times
2. **Personalization:** Use location-based messaging where possible
3. **Urgency:** Add weather-based urgency ("Storm season approaching")
4. **Incentives:** Consider small discounts for quick booking
5. **Feedback Loop:** Add surveys for non-converters to understand barriers

The permanent magic link system ensures customers can always access their quotes, making your winback campaigns highly effective!