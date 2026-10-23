/**
 * Razorpay Payment Failure & Retry Tests
 *
 * Tests failed payment scenarios, database state updates, and retry behavior.
 * Uses mocked Razorpay responses - does NOT make real payments.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// Helper to create Next.js Request with JSON body
function createRequest(url: string, body: any, options: RequestInit = {}) {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });
}

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

// Mock Razorpay
vi.mock('@/lib/payments/razorpay', () => ({
  createRazorpayOrder: vi.fn(),
  getPublicKeyId: vi.fn(() => 'rzp_test_mock'),
  verifyPaymentSignature: vi.fn(),
  fetchPaymentDetails: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  fetchPaymentDetails,
  verifyWebhookSignature,
} from '@/lib/payments/razorpay';

describe('Razorpay Payment Failure Handling', () => {
  let mockSupabase: any;
  let mockAdminClient: any;
  let mockSelectChain: any;
  let mockEqChain: any;
  let mockEqEqChain: any;
  let mockAdminSelectChain: any;
  let mockAdminEqChain: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase client with proper chain
    mockSelectChain = { select: vi.fn() };
    mockEqChain = { eq: vi.fn(), single: vi.fn() };
    mockEqEqChain = { eq: vi.fn(), single: vi.fn() };

    mockSelectChain.select.mockReturnValue(mockEqChain);
    mockEqChain.eq.mockReturnValue(mockEqEqChain);
    mockEqEqChain.eq.mockReturnValue(mockEqEqChain);

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => mockSelectChain),
      rpc: vi.fn(),
    };

    // Mock admin client with proper chain
    mockAdminSelectChain = { select: vi.fn() };
    mockAdminEqChain = { eq: vi.fn(), single: vi.fn() };

    mockAdminSelectChain.select.mockReturnValue(mockAdminEqChain);
    mockAdminEqChain.eq.mockReturnValue(mockAdminEqChain);

    mockAdminClient = {
      from: vi.fn(() => mockAdminSelectChain),
      rpc: vi.fn(),
    };

    (createClient as any).mockReturnValue(Promise.resolve(mockSupabase));
    (createAdminClient as any).mockReturnValue(mockAdminClient);
  });

  describe('Browser Payment Verification - Failed Payment', () => {
    it('should record failed transaction when payment status is not captured/authorized', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      });

      // Mock order fetch (ownership verified)
      const mockOrder = {
        id: 'order-uuid-123',
        order_number: 'MVO-001',
        customer_id: 'user-123',
        total_paise: 10000,
        payment_status: 'initiated',
        status: 'pending_payment',
        payment_method: 'razorpay',
        razorpay_order_id: 'order_razorpay_123',
      };

      mockEqEqChain.single.mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      // Mock Razorpay signature verification (valid)
      (verifyPaymentSignature as any).mockReturnValue(true);

      // Mock Razorpay payment details (FAILED payment)
      (fetchPaymentDetails as any).mockResolvedValue({
        id: 'pay_failed_123',
        order_id: 'order_razorpay_123',
        amount: 10000,
        currency: 'INR',
        status: 'failed', // ← Payment failed
        method: 'card',
        error_code: 'BAD_REQUEST_ERROR',
        error_description: 'Payment processing failed due to card decline',
      });

      // Mock RPC calls
      mockAdminClient.rpc
        .mockResolvedValueOnce({ data: 'tx-id', error: null }) // record_payment_transaction
        .mockResolvedValueOnce({ data: { success: true }, error: null }); // update_payment_status_atomic

      // Import the handler
      const { POST } = await import('@/app/api/payments/razorpay/verify/route');

      // Create request
      const request = createRequest('http://localhost:3000/api/payments/razorpay/verify', {
        orderId: 'order-uuid-123',
        razorpayOrderId: 'order_razorpay_123',
        razorpayPaymentId: 'pay_failed_123',
        razorpaySignature: 'valid_signature_hash',
      });

      // Execute
      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      // Assertions
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Payment failed');

      // Verify transaction recorded
      expect(mockAdminClient.rpc).toHaveBeenCalledWith(
        'record_payment_transaction',
        expect.objectContaining({
          p_order_id: 'order-uuid-123',
          p_razorpay_payment_id: 'pay_failed_123',
          p_status: 'failed',
          p_error_code: 'BAD_REQUEST_ERROR',
        })
      );

      // Verify order status updated to failed
      expect(mockAdminClient.rpc).toHaveBeenCalledWith(
        'update_payment_status_atomic',
        expect.objectContaining({
          p_order_id: 'order-uuid-123',
          p_new_payment_status: 'failed',
          p_new_order_status: 'payment_failed',
        })
      );
    });

    it('should validate payment amount matches order total', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock order with specific total
      const mockOrder = {
        id: 'order-uuid-123',
        customer_id: 'user-123',
        total_paise: 10000, // ← Expected amount
        payment_method: 'razorpay',
        razorpay_order_id: 'order_razorpay_123',
      };

      mockEqEqChain.single.mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      // Mock signature valid
      (verifyPaymentSignature as any).mockReturnValue(true);

      // Mock payment details with WRONG amount
      (fetchPaymentDetails as any).mockResolvedValue({
        id: 'pay_123',
        order_id: 'order_razorpay_123',
        amount: 15000, // ← Different from order total
        currency: 'INR',
        status: 'captured',
      });

      const { POST } = await import('@/app/api/payments/razorpay/verify/route');

      const request = createRequest('http://localhost:3000/api/payments/razorpay/verify', {
        orderId: 'order-uuid-123',
        razorpayOrderId: 'order_razorpay_123',
        razorpayPaymentId: 'pay_123',
        razorpaySignature: 'signature',
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      // Should reject due to amount mismatch
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('amount mismatch');
    });
  });

  describe('Webhook Payment Failed Event', () => {
    it('should handle payment.failed webhook correctly', async () => {
      // Mock webhook signature valid
      (verifyWebhookSignature as any).mockReturnValue(true);

      // Mock order exists
      const mockOrder = {
        id: 'order-uuid-123',
        order_number: 'MVO-001',
        total_paise: 10000,
        payment_status: 'initiated',
        status: 'pending_payment',
      };

      mockAdminEqChain.single.mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      // Mock RPC calls
      mockAdminClient.rpc
        .mockResolvedValueOnce({ data: 'tx-id', error: null }) // record_payment_transaction
        .mockResolvedValueOnce({ data: { success: true }, error: null }); // update_payment_status_atomic

      const { POST } = await import('@/app/api/webhooks/razorpay/route');

      // Create webhook request
      const webhookPayload = {
        event: 'payment.failed',
        account_id: 'acc_test',
        entity: 'event',
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_456',
              entity: 'payment',
              amount: 10000,
              currency: 'INR',
              status: 'failed',
              order_id: 'order_razorpay_123',
              method: 'card',
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Card payment failed',
              created_at: Date.now(),
            },
          },
        },
        created_at: Date.now(),
      };

      const request = new Request('http://localhost:3000/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'valid_webhook_signature',
        },
        body: JSON.stringify(webhookPayload),
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(result.received).toBe(true);

      // Verify transaction recorded
      expect(mockAdminClient.rpc).toHaveBeenCalledWith(
        'record_payment_transaction',
        expect.objectContaining({
          p_razorpay_payment_id: 'pay_failed_456',
          p_event_type: 'payment.failed',
          p_status: 'failed',
          p_error_code: 'BAD_REQUEST_ERROR',
        })
      );

      // Verify order updated
      expect(mockAdminClient.rpc).toHaveBeenCalledWith(
        'update_payment_status_atomic',
        expect.objectContaining({
          p_new_payment_status: 'failed',
          p_new_order_status: 'payment_failed',
        })
      );
    });

    it('should not downgrade completed payment to failed', async () => {
      (verifyWebhookSignature as any).mockReturnValue(true);

      // Mock order with completed payment
      const mockOrder = {
        id: 'order-uuid-123',
        total_paise: 10000,
        payment_status: 'completed', // ← Already completed
        status: 'confirmed',
      };

      mockAdminEqChain.single.mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      mockAdminClient.rpc.mockResolvedValue({ data: 'tx-id', error: null });

      const { POST } = await import('@/app/api/webhooks/razorpay/route');

      const webhookPayload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_late_fail',
              amount: 10000,
              currency: 'INR',
              status: 'failed',
              order_id: 'order_razorpay_123',
              method: 'card',
            },
          },
        },
        created_at: Date.now(),
      };

      const request = new Request('http://localhost:3000/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'sig',
        },
        body: JSON.stringify(webhookPayload),
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(200);

      // Verify update_payment_status_atomic was NOT called
      // (because order.payment_status === 'completed')
      const updateCalls = mockAdminClient.rpc.mock.calls.filter(
        (call: any) => call[0] === 'update_payment_status_atomic'
      );
      expect(updateCalls.length).toBe(0);
    });
  });

  describe('Payment Retry - Idempotency', () => {
    it('should return existing Razorpay order on retry (idempotent)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock order that already has razorpay_order_id (from failed attempt)
      const mockOrder = {
        id: 'order-uuid-123',
        customer_id: 'user-123',
        payment_method: 'razorpay',
        razorpay_order_id: 'order_existing_123', // ← Already exists
        total_paise: 10000,
        order_number: 'MVO-001',
        customer_name: 'Test User',
        customer_email: 'test@example.com',
        customer_phone: '9876543210',
        payment_status: 'failed',
        status: 'payment_failed',
      };

      mockEqEqChain.single.mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      const { POST } = await import('@/app/api/payments/razorpay/create-order/route');

      const request = createRequest('http://localhost:3000/api/payments/razorpay/create-order', {
        orderId: 'order-uuid-123',
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      // Should return success with existing order ID
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.razorpayOrderId).toBe('order_existing_123');

      // Verify createRazorpayOrder was NOT called (idempotent)
      expect(createRazorpayOrder).not.toHaveBeenCalled();
    });

    it('should create new Razorpay order if not exists', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock order WITHOUT razorpay_order_id (first attempt)
      const mockOrder = {
        id: 'order-uuid-123',
        customer_id: 'user-123',
        payment_method: 'razorpay',
        razorpay_order_id: null, // ← No Razorpay order yet
        total_paise: 10000,
        order_number: 'MVO-001',
        customer_name: 'Test User',
        customer_email: 'test@example.com',
        customer_phone: '9876543210',
        payment_status: 'pending',
        status: 'pending_payment',
      };

      mockEqEqChain.single.mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      // Mock Razorpay order creation
      (createRazorpayOrder as any).mockResolvedValue({
        id: 'order_new_456',
        amount: 10000,
        currency: 'INR',
        receipt: 'MVO-001',
      });

      // Mock RPC update
      mockAdminClient.rpc.mockResolvedValue({ data: { success: true }, error: null });

      const { POST } = await import('@/app/api/payments/razorpay/create-order/route');

      const request = createRequest('http://localhost:3000/api/payments/razorpay/create-order', {
        orderId: 'order-uuid-123',
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      // Should create new order
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.razorpayOrderId).toBe('order_new_456');

      // Verify Razorpay order created
      expect(createRazorpayOrder).toHaveBeenCalledWith({
        amountPaise: 10000,
        currency: 'INR',
        receiptId: 'MVO-001',
        notes: expect.objectContaining({
          mivo_order_id: 'order-uuid-123',
        }),
      });

      // Verify database updated
      expect(mockAdminClient.rpc).toHaveBeenCalledWith(
        'update_payment_status_atomic',
        expect.objectContaining({
          p_order_id: 'order-uuid-123',
          p_payment_method: 'razorpay',
          p_razorpay_order_id: 'order_new_456',
          p_new_payment_status: 'initiated',
        })
      );
    });

    it('should prevent retry of completed payment', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock completed order
      const mockOrder = {
        id: 'order-uuid-123',
        customer_id: 'user-123',
        payment_method: 'razorpay',
        payment_status: 'completed', // ← Already paid
        status: 'confirmed',
      };

      mockEqEqChain.single.mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      const { POST } = await import('@/app/api/payments/razorpay/create-order/route');

      const request = createRequest('http://localhost:3000/api/payments/razorpay/create-order', {
        orderId: 'order-uuid-123',
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      // Should reject
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already paid');
    });

    it('should prevent retry of cancelled order', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock cancelled order
      const mockOrder = {
        id: 'order-uuid-123',
        customer_id: 'user-123',
        payment_method: 'razorpay',
        payment_status: 'failed',
        status: 'cancelled', // ← Cancelled
      };

      mockEqEqChain.single.mockResolvedValue({
        data: mockOrder,
        error: null,
      });

      const { POST } = await import('@/app/api/payments/razorpay/create-order/route');

      const request = createRequest('http://localhost:3000/api/payments/razorpay/create-order', {
        orderId: 'order-uuid-123',
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      // Should reject
      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
    });
  });

  describe('Order Ownership Verification', () => {
    it('should reject retry attempt for another user\'s order', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-attacker' } },
        error: null,
      });

      // Mock order belonging to different user
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null, // ← RLS filters out order (customer_id mismatch)
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const { POST } = await import('@/app/api/payments/razorpay/create-order/route');

      const request = createRequest('http://localhost:3000/api/payments/razorpay/create-order', {
        orderId: 'order-victim-123',
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      // Should reject with 404
      expect(response.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found or access denied');
    });
  });

  describe('COD Order Isolation', () => {
    it('should reject Razorpay payment creation for COD orders', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockCodOrder = {
        id: 'order-cod-123',
        customer_id: 'user-123',
        payment_method: 'cod',  // ← COD order
        payment_status: 'pending',
        status: 'pending_payment',
        total_paise: 10000,
        order_number: 'MVO-COD-001',
      };

      mockEqEqChain.single.mockResolvedValue({
        data: mockCodOrder,
        error: null,
      });

      const { POST } = await import('@/app/api/payments/razorpay/create-order/route');
      const request = createRequest('http://localhost:3000/api/payments/razorpay/create-order', {
        orderId: 'order-cod-123',
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not support online payment');
      expect(result.error).toContain('cod');
      expect(createRazorpayOrder).not.toHaveBeenCalled();
    });

    it('should reject Razorpay payment verification for COD orders', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockCodOrder = {
        id: 'order-cod-123',
        customer_id: 'user-123',
        payment_method: 'cod',  // ← COD order
        payment_status: 'pending',
        status: 'pending_payment',
        total_paise: 10000,
        razorpay_order_id: 'order_fake_123',  // Set to match request for proper validation flow
      };

      mockEqEqChain.single.mockResolvedValue({
        data: mockCodOrder,
        error: null,
      });

      const { POST } = await import('@/app/api/payments/razorpay/verify/route');
      const request = createRequest('http://localhost:3000/api/payments/razorpay/verify', {
        orderId: 'order-cod-123',
        razorpayOrderId: 'order_fake_123',
        razorpayPaymentId: 'pay_fake_456',
        razorpaySignature: 'fake_signature',
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not support online payment');
      expect(result.error).toContain('cod');
      expect(verifyPaymentSignature).not.toHaveBeenCalled();
      expect(fetchPaymentDetails).not.toHaveBeenCalled();
    });

    it('should reject orders with unsupported payment method (e.g., "online")', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockInvalidOrder = {
        id: 'order-invalid-123',
        customer_id: 'user-123',
        payment_method: 'online',  // ← Invalid payment method (UI bug or legacy data)
        payment_status: 'pending',
        status: 'pending_payment',
        total_paise: 10000,
        order_number: 'MVO-INV-001',
      };

      mockEqEqChain.single.mockResolvedValue({
        data: mockInvalidOrder,
        error: null,
      });

      const { POST } = await import('@/app/api/payments/razorpay/create-order/route');
      const request = createRequest('http://localhost:3000/api/payments/razorpay/create-order', {
        orderId: 'order-invalid-123',
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not support online payment');
      expect(result.error).toContain('online');  // Shows the invalid value
      expect(createRazorpayOrder).not.toHaveBeenCalled();
    });

    it('should reject orders with null payment method', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockNullPaymentOrder = {
        id: 'order-null-123',
        customer_id: 'user-123',
        payment_method: null,  // ← Not set
        payment_status: 'pending',
        status: 'pending_payment',
        total_paise: 10000,
        order_number: 'MVO-NULL-001',
      };

      mockEqEqChain.single.mockResolvedValue({
        data: mockNullPaymentOrder,
        error: null,
      });

      const { POST } = await import('@/app/api/payments/razorpay/create-order/route');
      const request = createRequest('http://localhost:3000/api/payments/razorpay/create-order', {
        orderId: 'order-null-123',
      });

      const response = await POST(request as unknown as NextRequest);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not support online payment');
      expect(result.error).toContain('not set');  // Shows null/undefined
      expect(createRazorpayOrder).not.toHaveBeenCalled();
    });
  });
});
