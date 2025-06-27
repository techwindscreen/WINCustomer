# WindCompare API & Processes Handover

## Overview
WindCompare is a **Next.js application** (TypeScript/React) that allows customers to get quotes for windscreen repairs and book mobile glass technician services. The system handles everything from initial quote generation to payment processing and appointment booking.

## Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Email/Marketing**: Klaviyo
- **External APIs**: UK Vehicle Data API
- **Deployment**: Vercel (implied by vercel-homepage.js)

## Key User Journey Flow

### 1. Initial Quote Request
- **Component**: `WindscreenCompare.tsx`
- **Process**: User enters vehicle registration and postcode
- **API**: No API call at this stage, data stored in localStorage
- **Next Step**: Navigate to `/damage-location`

### 2. Damage Assessment
**Page**: `/damage-location`
- **Component**: `DamageLocation.tsx`
- **Process**: Car diagram for selecting damaged windows
- **APIs Used**:
  - `/api/vehicle-lookup` - Fetches vehicle details from UK Vehicle Data API
  - `/api/save-damage-data` - Stores damage location info
- **Data Collected**: Selected windows, damage types, glass specifications

### 3. Quote Calculation
**API**: `/api/calculate-quote`
- **Process**: Pricing calculation based on:
  - Vehicle valuation from UK Vehicle Data API
  - Window types and quantities
  - Glass specifications (OEM/OEE/Standard)
  - Location-based pricing
- **Formula**: Uses percentage of vehicle OTR value + modifiers

### 4. Contact Information
**API**: `/api/submit-contact-info`
- **Process**: Collects customer details and appointment preferences
- **Database**: Saves to Supabase Master table
- **Email**: Triggers Klaviyo tracking for quote completion
- **Magic Links**: `/api/generate-magic-link` for returning customers ~

### 5. Payment Processing
**APIs**:
- `/api/create-payment-intent` - Creates Stripe payment intent
- `/api/verify-payment` - Verifies payment status
- `/api/send-payment-confirmation` - Sends confirmation emails

**Payment Options**:
- Full payment (5% discount)
- 20% deposit
- Split payment (3 installments)

### Quote Management
- `GET /api/get-quote-data?quoteId={id}` - Retrieves saved quote
- `POST /api/check-quote-exists` - Checks if quote exists in system
- `POST /api/calculate-quote` - Main pricing engine
- `POST /api/save-damage-data` - Stores damage assessment

### Customer Management
- `POST /api/submit-contact-info` - Saves customer details
- `POST /api/update-contact-info` - Updates existing customer
- `GET /api/existing-data?quoteId={id}` - Gets customer data

### Vehicle Data
- `POST /api/vehicle-lookup` - UK Vehicle Data API integration
- `POST /api/upload-vehicle-details` - Manual vehicle entry

### Payment Flow
- `POST /api/create-payment-intent` - Stripe payment setup
- `POST /api/create-checkout-session` - Alternative Stripe checkout
- `POST /api/verify-payment` - Payment verification
- `POST /api/send-payment-confirmation` - Email notifications

### Email & Notifications
- `POST /api/track-quote-started` - Klaviyo event tracking
- `POST /api/send-payment-confirmation` - Payment receipt emails
- `POST /api/external-email-service` - General email service

## Database Schema (Supabase)

### Primary Table: `MasterCustomer`
Stores all customer and quote information:
- Customer details (name, email, phone, address)
- Vehicle information (registration, make, model)
- Quote data (price, selected windows, specifications)
- Appointment details (date, time slot)
- Payment preferences
- Insurance information

## External Integrations

### UK Vehicle Data API
- **Purpose**: Vehicle lookup and valuation
- **Usage**: Powers pricing calculations based on vehicle OTR value
- **Fallback**: Manual entry if API fails

### Stripe
- **Purpose**: Payment processing
- **Features**: One-time payments, payment intents, webhooks
- **Methods**: Card payments with 3D Secure support

### Klaviyo
- **Purpose**: Email marketing and customer communication
- **Email Types**:
  - Quote completion notifications
  - Payment confirmations
  - Admin order notifications
  - Appointment reminders



## File Upload System
- **API**: `/api/upload`, `/api/save-images`


### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase database URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
- `STRIPE_SECRET_KEY` - Stripe private key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `KLAVIYO_PRIVATE_API_KEY` - Klaviyo email service
- `UK_VEHICLE_DATA_API_KEY` - Vehicle lookup service

### Key Components
- `components/WindscreenCompare.tsx` - Main landing page
- `components/pages/QuotePage.tsx` - Quote display and payment
- `components/sections/QuoteForm.tsx` - Initial form
- `components/pages/DamageLocation.tsx` - Damage assessment


