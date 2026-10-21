/**
 * Cart and Order Types
 *
 * Type definitions for shopping cart and order management.
 */

export interface CartItem {
  id: string; // Unique cart item ID (generated client-side)
  productId: string;
  productName: string; // Snapshot for display
  productSlug: string;
  variantId: string;
  variantSku: string;
  sizeName: string;
  material: string;
  selectedColor: string; // From variant.colorOptions
  quantity: number;
  unitPricePaise: number; // Snapshot from variant (untrusted, validated on server)
  imageUrl: string; // Primary product image
}

export interface Cart {
  items: CartItem[];
  updatedAt: string;
}

export interface CartSummary {
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  itemCount: number;
}

// Order types for M4
export interface OrderLineItem {
  id: string;
  productId: string;
  productName: string; // Immutable snapshot
  variantId: string;
  variantSku: string;
  sizeName: string;
  material: string;
  selectedColor: string;
  quantity: number;
  unitPricePaise: number; // Server-validated price at order time
  lineTotalPaise: number; // quantity × unitPricePaise
  // Weight-based pricing snapshots (added in M8)
  productionWeightGrams?: number | null;
  materialRatePaisePerGram?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
}

export type OrderStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string; // ORD-YYYYMMDD-XXXXX
  customerId: string;
  status: OrderStatus;

  // Contact details (snapshot from profile or checkout form)
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Shipping address (snapshot)
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;

  // Order items (immutable snapshot)
  items: OrderLineItem[];

  // Pricing (server-calculated, immutable)
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;

  // Payment tracking (M5/M6)
  paymentMethod: string | null; // 'razorpay' | 'cod' | null
  paymentId: string | null; // External payment gateway ID
  paymentStatus: 'pending' | 'initiated' | 'completed' | 'failed' | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

// Checkout form data
export interface CheckoutFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;

  // Special instructions (optional)
  specialInstructions?: string;
}

// Server-side order creation request
export interface CreateOrderRequest {
  items: Array<{
    productId: string;
    variantId: string;
    selectedColor: string;
    quantity: number;
  }>;
  contactDetails: CheckoutFormData;
}

// Server-side order creation response
export interface CreateOrderResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
  validationErrors?: Record<string, string>;
}
