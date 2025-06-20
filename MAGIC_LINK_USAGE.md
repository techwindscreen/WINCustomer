# Magic Link System Documentation

This system provides secure, time-limited links that allow customers to access their quotes without needing to remember quote IDs or go through authentication.

## Features

- **Secure JWT tokens** with 24-hour expiration
- **One-time use** tokens (optional - can be configured)
- **Email verification** - tokens only work for the original email
- **Database tracking** for audit and security
- **Beautiful email templates** with branded styling

## API Endpoints

### 1. Generate Magic Link
```
POST /api/generate-magic-link
```
**Body:**
```json
{
  "quoteId": "WC-2024-001234",
  "email": "customer@example.com"
}
```
**Response:**
```json
{
  "success": true,
  "magicLink": "https://yoursite.com/api/verify-magic-link?token=...",
  "expiresAt": "2024-01-16T10:30:00Z",
  "quoteName": "John Smith"
}
```

### 2. Send Magic Link Email
```
POST /api/send-magic-link
```
**Body:**
```json
{
  "quoteId": "WC-2024-001234", 
  "email": "customer@example.com"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Magic link sent successfully",
  "sentTo": "customer@example.com",
  "quoteId": "WC-2024-001234"
}
```

### 3. Verify Magic Link (Automatic)
```
GET /api/verify-magic-link?token=...
```
Automatically redirects to `/quote/[id]` if valid, or shows error page if invalid/expired.

## Usage Examples

### From Your Application Code

```typescript
import { generateAndSendMagicLink } from '../lib/magicLink';

// Send magic link after quote creation
const result = await generateAndSendMagicLink({
  quoteId: 'WC-2024-001234',
  email: 'customer@example.com',
  customerName: 'John Smith'
});

if (result.success) {
  console.log('Magic link sent successfully!');
} else {
  console.error('Failed to send magic link:', result.error);
}
```

### For Customer Service

```javascript
// Send magic link manually (e.g., when customer requests access)
fetch('/api/send-magic-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quoteId: 'WC-2024-001234',
    email: 'customer@example.com'
  })
});
```

### In Email Templates

```html
<!-- Add this button to your existing email templates -->
<div style="text-align: center; margin: 30px 0;">
  <a href="{{magicLink}}" 
     style="background: #0FB8C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
    View Your Quote
  </a>
</div>
```

## Security Features

1. **JWT Tokens**: Cryptographically signed with HMAC-SHA256
2. **Expiration**: 24-hour automatic expiry
3. **Email Verification**: Tokens only work for the original email address
4. **Database Tracking**: All tokens are logged for audit purposes
5. **One-time Use**: Tokens are marked as used after first access (optional)
6. **Token Hashing**: Only SHA256 hashes stored in database, not actual tokens

## Setup Instructions

### 1. Database Setup
Run the SQL migration to create the magic_links table:
```bash
# Execute sql/create_magic_links_table.sql in your database
```

### 2. Environment Variables
Add to your `.env.local`:
```
JWT_SECRET=your-super-secure-jwt-secret-here
NEXT_PUBLIC_BASE_URL=https://yoursite.com
```

### 3. Email Service
Ensure your email service endpoint `/api/external-email-service` can handle the `magic_link` email type.

## Email Template

The system includes a beautiful, responsive email template with:
- Branded WindscreenCompare styling
- Clear call-to-action button
- Security warnings and expiration notice
- Quote ID reference
- Professional footer

## Error Handling

The system handles various error cases:
- Invalid or expired tokens
- Quote not found
- Email mismatch
- Already used tokens
- Database errors

## Monitoring & Cleanup

- Monitor magic link usage via the `magic_links` table
- Run cleanup function periodically: `SELECT cleanup_expired_magic_links();`
- Track conversion rates from email clicks to quote views

## Best Practices

1. **Always verify email ownership** before generating links
2. **Include quote ID in email** for customer reference
3. **Set appropriate expiration** (24 hours is recommended)
4. **Monitor for suspicious activity** (multiple link requests)
5. **Clean up expired tokens** regularly
6. **Use HTTPS only** in production
7. **Don't log actual tokens** - only log hashes

## Integration Points

- **Quote creation flow**: Auto-send magic links
- **Customer service**: Manual magic link sending
- **Email reminders**: Include magic links in follow-ups
- **Payment confirmations**: Quick access to quote details
- **Booking confirmations**: Easy quote reference 