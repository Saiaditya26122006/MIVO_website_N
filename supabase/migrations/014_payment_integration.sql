-- MIVO Payment Integration
-- Migration 014: Razorpay payment tracking and atomic payment transitions
-- Created: 2026-10-22
-- Dependencies: 004_orders_schema.sql, 007_atomic_orders.sql

-- Add razorpay_order_id to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

-- Add index for razorpay order ID lookups
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
  ON public.orders(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- Payment transactions table
-- Tracks all payment events from Razorpay including webhooks
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

  -- Razorpay identifiers
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,

  -- Transaction details
  event_type TEXT NOT NULL, -- 'payment.captured', 'payment.failed', 'order.paid', 'browser_callback'
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL, -- 'pending', 'authorized', 'captured', 'failed', 'refunded'

  -- Payment method details from Razorpay
  method TEXT, -- 'card', 'netbanking', 'wallet', 'upi'
  method_details JSONB,

  -- Webhook validation
  webhook_event_id TEXT, -- For deduplication
  webhook_signature_verified BOOLEAN DEFAULT false,

  -- Raw event data for debugging
  raw_response JSONB,

  -- Error tracking
  error_code TEXT,
  error_description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ,

  -- Unique constraint for webhook deduplication
  CONSTRAINT unique_webhook_event UNIQUE NULLS NOT DISTINCT (webhook_event_id)
);

-- Indexes for payment transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id
  ON public.payment_transactions(order_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_razorpay_order_id
  ON public.payment_transactions(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_razorpay_payment_id
  ON public.payment_transactions(razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_webhook_event_id
  ON public.payment_transactions(webhook_event_id)
  WHERE webhook_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
  ON public.payment_transactions(status);

-- RLS for payment transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Customers can view payment transactions for their own orders
CREATE POLICY "Customers can view own payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = payment_transactions.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- Only service role can insert payment transactions (server-side only)
-- No INSERT policy for authenticated users - must go through RPC

-- Atomic payment status update function
-- Validates current state and prevents invalid transitions
CREATE OR REPLACE FUNCTION public.update_payment_status_atomic(
  p_order_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_payment_method TEXT,
  p_new_payment_status TEXT,
  p_new_order_status TEXT DEFAULT NULL,
  p_expected_amount_paise INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_payment_status TEXT;
  v_current_order_status TEXT;
  v_order_total_paise INTEGER;
  v_updated BOOLEAN := false;
BEGIN
  -- Lock the order row for update
  SELECT payment_status, status, total_paise
  INTO v_current_payment_status, v_current_order_status, v_order_total_paise
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  -- Verify order exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Verify amount if provided
  IF p_expected_amount_paise IS NOT NULL AND v_order_total_paise != p_expected_amount_paise THEN
    RAISE EXCEPTION 'Amount mismatch: expected %, got %', v_order_total_paise, p_expected_amount_paise
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- Prevent duplicate payment completion
  IF v_current_payment_status = 'completed' AND p_new_payment_status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'message', 'Payment already completed'
    );
  END IF;

  -- Validate state transitions
  -- pending -> initiated: payment creation
  -- initiated -> completed: successful payment
  -- initiated -> failed: failed payment
  -- pending -> completed: direct payment (COD manual confirmation)
  -- Any status -> failed: payment failure

  IF v_current_payment_status = 'completed' AND p_new_payment_status != 'completed' THEN
    RAISE EXCEPTION 'Cannot change payment status from completed to %', p_new_payment_status
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- Update order payment details
  UPDATE public.orders
  SET
    razorpay_order_id = COALESCE(p_razorpay_order_id, razorpay_order_id),
    payment_id = COALESCE(p_razorpay_payment_id, payment_id),
    payment_method = COALESCE(p_payment_method, payment_method),
    payment_status = p_new_payment_status,
    status = COALESCE(p_new_order_status, status),
    paid_at = CASE
      WHEN p_new_payment_status = 'completed' AND paid_at IS NULL THEN NOW()
      ELSE paid_at
    END,
    updated_at = NOW()
  WHERE id = p_order_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT > 0;

  RETURN jsonb_build_object(
    'success', v_updated,
    'previous_payment_status', v_current_payment_status,
    'new_payment_status', p_new_payment_status,
    'already_processed', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record payment transaction
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
  p_order_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_event_type TEXT,
  p_amount_paise INTEGER,
  p_currency TEXT,
  p_status TEXT,
  p_method TEXT DEFAULT NULL,
  p_method_details JSONB DEFAULT NULL,
  p_webhook_event_id TEXT DEFAULT NULL,
  p_webhook_signature_verified BOOLEAN DEFAULT false,
  p_raw_response JSONB DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_existing_transaction_id UUID;
BEGIN
  -- Check for duplicate webhook event
  IF p_webhook_event_id IS NOT NULL THEN
    SELECT id INTO v_existing_transaction_id
    FROM public.payment_transactions
    WHERE webhook_event_id = p_webhook_event_id;

    IF v_existing_transaction_id IS NOT NULL THEN
      -- Return existing transaction ID for idempotent response
      RETURN v_existing_transaction_id;
    END IF;
  END IF;

  -- Insert transaction record
  INSERT INTO public.payment_transactions (
    order_id,
    razorpay_order_id,
    razorpay_payment_id,
    event_type,
    amount_paise,
    currency,
    status,
    method,
    method_details,
    webhook_event_id,
    webhook_signature_verified,
    raw_response,
    error_code,
    error_description,
    processed_at
  ) VALUES (
    p_order_id,
    p_razorpay_order_id,
    p_razorpay_payment_id,
    p_event_type,
    p_amount_paise,
    p_currency,
    p_status,
    p_method,
    p_method_details,
    p_webhook_event_id,
    p_webhook_signature_verified,
    p_raw_response,
    p_error_code,
    p_error_description,
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old payment transactions (optional maintenance function)
CREATE OR REPLACE FUNCTION public.cleanup_old_payment_transactions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.payment_transactions
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status IN ('failed', 'captured');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE 'Migration 014_payment_integration.sql completed successfully';
  RAISE NOTICE 'Table created: payment_transactions';
  RAISE NOTICE 'Column added: orders.razorpay_order_id';
  RAISE NOTICE 'Functions created: update_payment_status_atomic, record_payment_transaction, cleanup_old_payment_transactions';
  RAISE NOTICE 'RLS policies applied for payment transaction isolation';
END $$;
