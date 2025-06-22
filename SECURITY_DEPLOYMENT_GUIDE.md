# Security Deployment Guide for Vercel

## 🔒 Security Improvements Applied

### ✅ Fixed Issues
- **File Upload Security**: Added validation, size limits, type checking, magic number validation
- **JWT Secret**: Removed hardcoded fallback, now requires environment variable
- **Environment Variables**: Added proper validation with fail-fast approach
- **Security Headers**: Added X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Rate Limiting**: Implemented API rate limiting to prevent abuse
- **Input Validation**: Created comprehensive validation utilities

## 📋 Required Environment Variables

Add these to your Vercel project settings:

```bash
# Database Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication (Required)
JWT_SECRET=your_secure_random_jwt_secret_minimum_32_characters_long

# Payment Processing (Required)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key

# External APIs (Required)
UK_VEHICLE_DATA_API_KEY=your_uk_vehicle_data_api_key
KLAVIYO_PRIVATE_API_KEY=your_klaviyo_private_api_key

# Site Configuration (Required for production)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
```

## 🛡️ Security Checklist for Deployment

### Database Security (Supabase)
- [ ] **Enable Row Level Security (RLS)** on all tables
- [ ] **Review and test RLS policies** to ensure users can only access their own data
- [ ] **Use service role key** only in server-side API routes, never client-side
- [ ] **Regular database backups** are enabled
- [ ] **Monitor for unusual database activity**

### API Security
- [ ] **Rate limiting** is applied to all sensitive endpoints
- [ ] **Input validation** is implemented on all user inputs
- [ ] **Error messages** don't leak sensitive information
- [ ] **API keys** are properly secured and not exposed in client-side code
- [ ] **HTTPS** is enforced for all API calls

### File Upload Security
- [ ] **File type validation** is enforced
- [ ] **File size limits** are set (5MB max)
- [ ] **Magic number validation** prevents file type spoofing
- [ ] **Upload rate limiting** prevents abuse
- [ ] **File storage** is properly secured

### Authentication Security
- [ ] **JWT secrets** are strong (32+ characters) and unique
- [ ] **Magic links** have expiration times
- [ ] **Token reuse** is prevented
- [ ] **Session management** is secure

### Deployment Security
- [ ] **Environment variables** are set in Vercel dashboard
- [ ] **No secrets** in source code or client-side code
- [ ] **Security headers** are properly configured
- [ ] **Domain is verified** and HTTPS is enforced
- [ ] **Regular dependency updates** are performed

## 🚨 Additional Security Recommendations

### 1. Content Security Policy (CSP)
Add to your Next.js config:

```javascript
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' *.stripe.com *.klaviyo.com;
  child-src *.stripe.com *.klaviyo.com;
  style-src 'self' 'unsafe-inline';
  img-src * blob: data:;
  media-src 'none';
  connect-src *;
  font-src 'self';
`;

async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: ContentSecurityPolicy.replace(/\n/g, ''),
        },
      ],
    },
  ];
}
```

### 2. Monitoring & Logging
- Set up error monitoring (Sentry, LogRocket)
- Monitor API usage and unusual patterns
- Log security events for audit trails
- Set up alerts for failed authentication attempts

### 3. Regular Security Maintenance
- Update dependencies regularly: `npm audit fix`
- Review and rotate API keys quarterly
- Monitor Supabase security advisories
- Test backup and recovery procedures

### 4. Additional Vercel Security Settings
- Enable **"Automatically expose System Environment Variables"** only if needed
- Set **"Environment Variable Encryption"** 
- Configure **"Edge Config"** for sensitive configuration data
- Enable **"Web Analytics"** for monitoring

## 🔍 Security Testing Checklist

Before going live, test:
- [ ] File upload with various file types (should reject non-images)
- [ ] API rate limiting (should block after limits exceeded)
- [ ] Invalid inputs (should be sanitized/rejected)
- [ ] SQL injection attempts (should be blocked by Supabase)
- [ ] XSS attempts (should be blocked by CSP and input validation)
- [ ] Magic link expiration and reuse (should fail appropriately)
- [ ] Payment processing with invalid data (should be handled securely)

## 📞 Security Incident Response
1. **Immediately** revoke any compromised API keys
2. **Rotate** JWT secrets if compromised
3. **Check logs** for unauthorized access
4. **Update** affected users if personal data was accessed
5. **Patch** any identified vulnerabilities immediately

## 🔧 Development vs Production
- **Development**: Use test API keys, local database
- **Production**: Use live API keys, enable all security features
- **Never**: Mix development and production credentials

---

**Remember**: Security is an ongoing process, not a one-time setup. Regularly review and update your security measures. 