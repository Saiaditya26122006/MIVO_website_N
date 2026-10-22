# MIVO Payment Integration Documentation

## Overview

MIVO uses **Razorpay** for online payments and supports **Cash on Delivery (COD)** for offline payments.

## Payment Methods

### 1. Online Payment (Razorpay)
- UPI
- Credit/Debit Cards
- Net Banking
- Wallets (Paytm, PhonePe, etc.)

### 2. Cash on Delivery (COD)
- Payment collected in cash on delivery
- Order created immediately
- Payment status remains pending until manually confirmed by admin

## Environment Variables

### Required for All Environments

Add these to your `.env.local` (development) and Vercel environment variables (production):

```bash
# Razorpay Credentials
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx      # Test mode for development
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx    # Server-side secret
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxx    # Webhook signature secret
```

### Production Environment

For production, use **Live Mode** credentials from Razorpay dashboard:

```bash
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx      # Live mode for production
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxx
```

## Razorpay Webhook Configuration

### Webhook URL

Configure this webhook URL in your Razorpay Dashboard (Settings → Webhooks):

```
Production: https://yourdomain.com/api/webhooks/razorpay
Development: https://your-vercel-preview.vercel.app/api/webhooks/razorpay
```

### Events to Subscribe

Enable these webhook events in Razorpay dashboard:

- ✅ `payment.captured` - When payment is successfully captured
- ✅ `payment.failed` - When payment fails
- ✅ `order.paid` - When order is fully paid

### Webhook Secret

The webhook secret is used to verify webhook authenticity. Copy it from Razorpay dashboard and set it as `RAZORPAY_WEBHOOK_SECRET` environment variable.

## Payment Flow

### Online Payment Flow

1. **Checkout**: Customer selects "Online Payment" and fills shipping details
2. **Order Creation**: MIVO order is created with `payment_status: 'pending'`
3. **Razorpay Order**: Server creates Razorpay order and returns order ID
4. **Razorpay Checkout**: Browser opens Razorpay payment modal
5. **Payment**: Customer completes payment (UPI/Card/etc.)
6. **Verification**: Server verifies payment signature
7. **Confirmation**: Order status updated to `confirmed`, payment status to `completed`
8. **Webhook**: Razorpay webhook confirms payment asynchronously

### COD Flow

1. **Checkout**: Customer selects "Cash on Delivery" and fills shipping details
2. **Order Creation**: MIVO order is created with `payment_method: 'cod'`, `payment_status: 'pending'`
3. **Confirmation**: Customer redirected to order page
4. **Delivery**: Payment collected in cash on delivery
5. **Manual Confirmation**: Admin marks payment as collected when confirmed

## Security Features

### Implemented Protections

- ✅ **Signature Verification**: All payments verified with Razorpay signatures
- ✅ **Webhook Signature**: Webhooks authenticated with timing-safe comparison
- ✅ **Amount Validation**: Server validates payment amount matches order total
- ✅ **Currency Validation**: Only INR payments accepted
- ✅ **Order Ownership**: Customers can only access their own orders
- ✅ **Idempotency**: Duplicate order submissions prevented
- ✅ **Atomic Transitions**: Payment status updated atomically to prevent race conditions
- ✅ **Webhook Deduplication**: Duplicate webhook events ignored
- ✅ **Server-Side Secrets**: Payment secrets never exposed to browser
- ✅ **Payment ID Validation**: Razorpay payment ID verified against expected order

### Never Exposed to Browser

- `RAZORPAY_KEY_SECRET` (server-only)
- `RAZORPAY_WEBHOOK_SECRET` (server-only)
- Payment verification logic
- Webhook processing logic

### Safe for Browser

- `RAZORPAY_KEY_ID` (required for Razorpay Checkout SDK)
- Order totals (verified server-side)
- Customer's own order details

## Database Schema

### Orders Table Updates

New columns added to `orders` table:

```sql
razorpay_order_id TEXT          -- Razorpay order ID
payment_method TEXT             -- 'razorpay', 'cod', etc.
payment_id TEXT                 -- Razorpay payment ID
payment_status TEXT             -- 'pending', 'initiated', 'completed', 'failed'
paid_at TIMESTAMPTZ             -- When payment was completed
```

### New Tables

#### payment_transactions

Tracks all payment events from Razorpay:

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  event_type TEXT,              -- 'payment.captured', 'payment.failed', etc.
  amount_paise INTEGER,
  currency TEXT,
  status TEXT,
  webhook_event_id TEXT,        -- For deduplication
  webhook_signature_verified BOOLEAN,
  raw_response JSONB,           -- Full Razorpay response
  error_code TEXT,
  error_description TEXT,
  created_at TIMESTAMPTZ
);
```

## API Endpoints

### POST /api/payments/razorpay/create-order

Creates a Razorpay order for an existing MIVO order.

**Request:**
```json
{
  "orderId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "razorpayOrderId": "order_xxxxx",
  "razorpayKeyId": "rzp_test_xxxxx",
  "amount": 50000,
  "currency": "INR",
  "orderNumber": "MIVO-20261022-001",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+919876543210"
}
```

### POST /api/payments/razorpay/verify

Verifies payment signature after Razorpay checkout.

**Request:**
```json
{
  "orderId": "uuid",
  "razorpayOrderId": "order_xxxxx",
  "razorpayPaymentId": "pay_xxxxx",
  "razorpaySignature": "signature_string"
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "paymentStatus": "completed",
  "orderStatus": "confirmed"
}
```

### POST /api/webhooks/razorpay

Receives webhook events from Razorpay.

**Headers:**
```
x-razorpay-signature: webhook_signature_string
```

**Body:** Razorpay webhook event payload

## Testing

### Test Cards (Razorpay Test Mode)

- **Success**: `4111 1111 1111 1111` (Any CVV, future expiry)
- **Failure**: `4000 0000 0000 0002`

### Test UPI

Use test UPI ID: `success@razorpay`

### Testing Webhooks Locally

Use ngrok or similar tunneling tool:

```bash
ngrok http 3000
# Configure webhook URL: https://your-ngrok-url.ngrok.io/api/webhooks/razorpay
```

## Migration Deployment

The payment integration migration must be applied to your Supabase database:

```bash
# Apply migration
supabase migration up

# Or run the SQL file directly in Supabase SQL editor
# File: supabase/migrations/014_payment_integration.sql
```

## Deployment Checklist

### Vercel Environment Variables

Set these in Vercel Project Settings → Environment Variables:

- [ ] `RAZORPAY_KEY_ID` (Production: Live mode, Preview: Test mode)
- [ ] `RAZORPAY_KEY_SECRET` (Production: Live mode, Preview: Test mode)
- [ ] `RAZORPAY_WEBHOOK_SECRET` (Production: Live mode, Preview: Test mode)

### Razorpay Dashboard Configuration

- [ ] Enable Live Mode (for production)
- [ ] Configure webhook URL
- [ ] Subscribe to required events (payment.captured, payment.failed, order.paid)
- [ ] Note webhook secret
- [ ] Test webhook delivery

### Supabase Database

- [ ] Apply migration 014_payment_integration.sql
- [ ] Verify RLS policies
- [ ] Test RPC functions

### Testing

- [ ] Test online payment flow (test mode)
- [ ] Test COD flow
- [ ] Test webhook delivery
- [ ] Test payment failure handling
- [ ] Test signature verification
- [ ] Test duplicate order prevention
- [ ] Verify order status transitions
- [ ] Test admin dashboard payment display

## Monitoring and Debugging

### Razorpay Dashboard

- Monitor payments: Dashboard → Payments
- View webhooks: Dashboard → Webhooks → Logs
- Test webhooks: Dashboard → Webhooks → Test webhook

### Server Logs

Check Vercel function logs for:

```
[Razorpay Create Order]
[Razorpay Verify]
[Razorpay Webhook]
```

### Common Issues

**Payment verification failed**
- Check signature verification logic
- Verify RAZORPAY_KEY_SECRET is correct
- Ensure order ID matches

**Webhook not received**
- Verify webhook URL is accessible
- Check webhook secret configuration
- Review Razorpay webhook logs

**Amount mismatch**
- Verify cart calculations
- Check currency (must be INR)
- Ensure no race conditions in order creation

## Support

For Razorpay-related issues:
- Documentation: https://razorpay.com/docs/
- Support: https://razorpay.com/support/

For MIVO implementation issues:
- Check server logs in Vercel
- Review Supabase function logs
- Verify environment variables are set correctly
