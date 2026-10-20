"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export type QuotationStatus =
  | "pending_review"
  | "under_review"
  | "quote_provided"
  | "quote_accepted"
  | "quote_rejected"
  | "order_created"
  | "cancelled";

export interface UpdateQuotationStatusResult {
  success: boolean;
  error?: string;
}

export interface CreateQuoteResult {
  success: boolean;
  quoteId?: string;
  error?: string;
}

/**
 * Update quotation request status (admin only)
 */
export async function updateQuotationStatus(
  quotationId: string,
  newStatus: QuotationStatus
): Promise<UpdateQuotationStatusResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set reviewed_at timestamp when moving to under_review
    if (newStatus === "under_review") {
      updateData.reviewed_at = new Date().toISOString();
    }

    // Set quoted_at timestamp when providing quote
    if (newStatus === "quote_provided") {
      updateData.quoted_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("quotation_requests")
      .update(updateData)
      .eq("id", quotationId);

    if (error) {
      console.error("[Admin] Failed to update quotation status:", error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    revalidatePath(`/admin/quotations/${quotationId}`);
    revalidatePath("/admin/quotations");
    revalidatePath("/account/quotations", "page");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] Update quotation status failed:", message);
    return {
      success: false,
      error: message.includes("Admin") ? "Unauthorized" : "Failed to update quotation status",
    };
  }
}

/**
 * Create or update a quotation quote (admin only)
 */
export async function createOrUpdateQuote(
  quotationId: string,
  quoteData: {
    itemDescription: string;
    quantityQuoted: number;
    unitPricePaise: number;
    shippingPaise: number;
    estimatedProductionDays: number;
    validUntilDate: string;
    internalNotes?: string;
    customerFacingNotes?: string;
  }
): Promise<CreateQuoteResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate inputs
    if (!quoteData.itemDescription?.trim()) {
      return { success: false, error: "Item description is required" };
    }
    if (quoteData.quantityQuoted < 1) {
      return { success: false, error: "Quantity must be at least 1" };
    }
    if (quoteData.unitPricePaise < 0) {
      return { success: false, error: "Unit price cannot be negative" };
    }
    if (quoteData.shippingPaise < 0) {
      return { success: false, error: "Shipping cost cannot be negative" };
    }
    if (quoteData.estimatedProductionDays < 1) {
      return { success: false, error: "Production days must be at least 1" };
    }

    const subtotalPaise = quoteData.unitPricePaise * quoteData.quantityQuoted;
    const totalPricePaise = subtotalPaise + quoteData.shippingPaise;

    // Check if quote already exists for this quotation
    const { data: existing } = await supabase
      .from("quotation_quotes")
      .select("id")
      .eq("quotation_id", quotationId)
      .single();

    let quoteId: string;

    if (existing) {
      // Update existing quote
      const { data, error } = await supabase
        .from("quotation_quotes")
        .update({
          item_description: quoteData.itemDescription,
          quantity_quoted: quoteData.quantityQuoted,
          unit_price_paise: quoteData.unitPricePaise,
          subtotal_paise: subtotalPaise,
          shipping_paise: quoteData.shippingPaise,
          total_price_paise: totalPricePaise,
          estimated_production_days: quoteData.estimatedProductionDays,
          valid_until_date: quoteData.validUntilDate,
          internal_notes: quoteData.internalNotes || null,
          customer_facing_notes: quoteData.customerFacingNotes || null,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) {
        console.error("[Admin] Failed to update quote:", error);
        return { success: false, error: `Database error: ${error.message}` };
      }

      quoteId = data.id;
    } else {
      // Create new quote
      const { data, error } = await supabase
        .from("quotation_quotes")
        .insert({
          quotation_id: quotationId,
          item_description: quoteData.itemDescription,
          quantity_quoted: quoteData.quantityQuoted,
          unit_price_paise: quoteData.unitPricePaise,
          subtotal_paise: subtotalPaise,
          shipping_paise: quoteData.shippingPaise,
          total_price_paise: totalPricePaise,
          estimated_production_days: quoteData.estimatedProductionDays,
          valid_until_date: quoteData.validUntilDate,
          internal_notes: quoteData.internalNotes || null,
          customer_facing_notes: quoteData.customerFacingNotes || null,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[Admin] Failed to create quote:", error);
        return { success: false, error: `Database error: ${error.message}` };
      }

      quoteId = data.id;
    }

    // Update quotation status to quote_provided
    await updateQuotationStatus(quotationId, "quote_provided");

    revalidatePath(`/admin/quotations/${quotationId}`);
    revalidatePath("/admin/quotations");
    revalidatePath(`/account/quotations/${quotationId}`, "page");

    return { success: true, quoteId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] Create/update quote failed:", message);
    return {
      success: false,
      error: message.includes("Admin") ? "Unauthorized" : "Failed to save quote",
    };
  }
}
