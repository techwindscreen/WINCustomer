# Permanent Magic Links for Winback Campaigns

This system provides permanent, non-expiring magic links that allow customers to return to their completed quotes and make payments. Perfect for winback email campaigns.

## How It Works

1. **Automatic Generation**: When a customer completes their quote (submits contact info), a permanent magic link is automatically generated
2. **Secure Access**: Links are tied to both quote ID and email address for security
3. **Payment Ready**: Links take customers directly to a payment page with their quote details pre-loaded
4. **Non-Expiring**: Unlike regular magic links, these links don't expire and can be used multiple times

## API Endpoints

### Generate Permanent Magic Link
```
POST /api/generate-permanent-magic-link
```
Body:
```json
{
  "quoteId": "WIN123456",
  "email": "customer@example.com"
}
```

### Quick Access Link (for emails)
```
GET /api/get-permanent-link?quoteId=WIN123456&email=customer@example.com
```
This redirects directly to the quote access page.

For JSON response (useful for API calls):
```
GET /api/get-permanent-link?quoteId=WIN123456&email=customer@example.com&format=json
```

### Verify Permanent Magic Link
```
GET /api/verify-permanent-magic-link?token=<token>
```

### Deactivate Link (for security)
```
POST /api/deactivate-permanent-magic-link
```
Body:
```json
{
  "quoteId": "WIN123456",
  "email": "customer@example.com"
}
```

## Usage in Email Campaigns

### Klaviyo Integration
In your Klaviyo email templates, you can use:

```html
<a href="https://your-domain.com/api/get-permanent-link?quoteId={{ quote_id }}&email={{ email }}">
  Complete Your Payment
</a>
```

### JavaScript/API Usage
```javascript
import { generatePermanentMagicLink } from '../lib/permanentMagicLink';

const result = await generatePermanentMagicLink({
  quoteId: 'WIN123456',
  email: 'customer@example.com'
});

if (result.success) {
  console.log('Permanent link:', result.permanentMagicLink);
}
```

## Quote Access Page

The permanent magic links direct users to `/quote-access` which:

- Verifies the token
- Loads the complete quote data from Supabase
- Displays quote details (vehicle, service, pricing)
- Provides payment options (full payment, deposit, or Klarna split)
- Integrates with Stripe for secure payment processing

## Database Tables

The system uses two main tables:

### `permanent_magic_links`
Stores permanent magic link tokens and metadata:
- `quote_id` - Reference to the quote
- `email` - Customer email
- `token_id` - Unique token identifier
- `token_hash` - Hashed token for security
- `is_active` - Whether the link is still active
- `created_at` - When the link was created
- `last_accessed` - Last time the link was used

### `MasterCustomer`
Main quote data table that already exists and contains all quote information.

## Security Features

1. **Token Verification**: All tokens are cryptographically signed
2. **Email Matching**: Links only work for the exact email address they were created for
3. **Deactivation**: Links can be deactivated if needed
4. **Usage Tracking**: System tracks when links are accessed
5. **No Expiration**: While permanent, they can be manually deactivated for security

## Example Winback Email Flow

1. Customer completes quote but doesn't pay
2. Permanent magic link is automatically generated
3. 24 hours later: Send first winback email with the permanent link
4. 7 days later: Send second winback email with the same link
5. 30 days later: Send final winback email with the same link

The customer can click any of these links at any time and go directly to the payment page with their quote pre-loaded.

## Testing

To test the system:

1. Complete a quote on the website (this generates a permanent link)
2. Check the console logs for the generated link
3. Use the link to access the quote payment page
4. Verify all quote details are correctly displayed
5. Test the payment flow

## Implementation Notes

- Permanent magic links are automatically generated when `submit-contact-info` is called
- The system gracefully handles failures (quote completion won't fail if link generation fails)
- Links are stored in the database for tracking and management
- The quote access page is responsive and mobile-friendly
- Payment integration uses existing Stripe setup