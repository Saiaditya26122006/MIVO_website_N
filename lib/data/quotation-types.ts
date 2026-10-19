/**
 * Quotation Types for Custom Orders
 */

export type QuotationStatus =
  | 'pending_review'
  | 'under_review'
  | 'quote_provided'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'order_created'
  | 'cancelled';

export interface QuotationRequest {
  id: string;
  customerId: string;
  quoteReference: string; // QTE-YYYYMMDD-XXXXX

  // Contact details
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Project description
  projectTitle: string;
  projectDescription: string;
  categoryId: string | null;

  // Custom specifications
  hasCustomDimensions: boolean;
  customLengthMm: number | null;
  customWidthMm: number | null;
  customHeightMm: number | null;

  hasCustomDesign: boolean;
  designFileUrls: string[]; // Uploaded design files

  // Preferences
  preferredMaterial: string | null;
  preferredColor: string | null;
  quantity: number;

  // Budget and timeline
  budgetMinPaise: number | null;
  budgetMaxPaise: number | null;
  requiredByDate: string | null;

  // Additional notes
  additionalNotes: string | null;

  // Status tracking
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  quotedAt: string | null;
}

export interface QuotationQuote {
  id: string;
  quotationId: string;

  // Pricing breakdown
  itemDescription: string;
  quantityQuoted: number;
  unitPricePaise: number;
  subtotalPaise: number;
  shippingPaise: number;
  totalPricePaise: number;

  // Production details
  estimatedProductionDays: number;
  validUntilDate: string;

  // Admin notes
  internalNotes: string | null;
  customerFacingNotes: string | null;

  // Timestamps
  createdAt: string;
  createdBy: string; // Admin user ID
}

// Request form data
export interface CustomQuotationFormData {
  // Contact (can pre-fill from profile)
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Project details
  projectTitle: string;
  projectDescription: string;
  categoryId?: string;

  // Custom specifications
  hasCustomDimensions: boolean;
  customLengthMm?: number;
  customWidthMm?: number;
  customHeightMm?: number;

  hasCustomDesign: boolean;

  // Preferences
  preferredMaterial?: string;
  preferredColor?: string;
  quantity: number;

  // Budget and timeline
  budgetMinPaise?: number;
  budgetMaxPaise?: number;
  requiredByDate?: string;

  // Additional notes
  additionalNotes?: string;
}
