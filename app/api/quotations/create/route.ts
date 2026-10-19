import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CustomQuotationFormData } from "@/lib/data/quotation-types";

interface CreateQuotationResponse {
  success: boolean;
  quotationId?: string;
  quoteReference?: string;
  error?: string;
  validationErrors?: Record<string, string>;
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateQuotationResponse>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const formData: CustomQuotationFormData = await request.json();

    // Validate required fields
    const validationErrors: Record<string, string> = {};

    if (!formData.customerName?.trim()) {
      validationErrors.customerName = "Name is required";
    }

    if (!formData.customerEmail?.trim()) {
      validationErrors.customerEmail = "Email is required";
    }

    if (!formData.customerPhone?.trim()) {
      validationErrors.customerPhone = "Phone is required";
    }

    if (!formData.projectTitle?.trim()) {
      validationErrors.projectTitle = "Project title is required";
    }

    if (!formData.projectDescription?.trim()) {
      validationErrors.projectDescription = "Project description is required";
    }

    if (!formData.quantity || formData.quantity < 1) {
      validationErrors.quantity = "Quantity must be at least 1";
    }

    if (formData.hasCustomDimensions) {
      if (!formData.customLengthMm || formData.customLengthMm <= 0) {
        validationErrors.customLengthMm = "Length is required";
      }
      if (!formData.customWidthMm || formData.customWidthMm <= 0) {
        validationErrors.customWidthMm = "Width is required";
      }
      if (!formData.customHeightMm || formData.customHeightMm <= 0) {
        validationErrors.customHeightMm = "Height is required";
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        { success: false, error: "Validation failed", validationErrors },
        { status: 400 }
      );
    }

    // Generate quote reference
    const { data: quoteReference, error: quoteReferenceError } = await supabase.rpc(
      "generate_quote_reference"
    );

    if (quoteReferenceError) {
      console.error("[Quotation] Failed to generate reference:", quoteReferenceError);
      return NextResponse.json(
        { success: false, error: "Failed to generate quote reference" },
        { status: 500 }
      );
    }

    // Create quotation request
    const { data: quotation, error: quotationError } = await supabase
      .from("quotation_requests")
      .insert({
        quote_reference: quoteReference as string,
        customer_id: user.id,
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        project_title: formData.projectTitle,
        project_description: formData.projectDescription,
        category_id: formData.categoryId || null,
        has_custom_dimensions: formData.hasCustomDimensions,
        custom_length_mm: formData.customLengthMm || null,
        custom_width_mm: formData.customWidthMm || null,
        custom_height_mm: formData.customHeightMm || null,
        has_custom_design: formData.hasCustomDesign,
        design_file_urls: [],
        preferred_material: formData.preferredMaterial || null,
        preferred_color: formData.preferredColor || null,
        quantity: formData.quantity,
        budget_min_paise: formData.budgetMinPaise || null,
        budget_max_paise: formData.budgetMaxPaise || null,
        required_by_date: formData.requiredByDate || null,
        additional_notes: formData.additionalNotes || null,
        status: "pending_review",
      })
      .select()
      .single();

    if (quotationError || !quotation) {
      console.error("[Quotation] Failed to create quotation:", quotationError);
      return NextResponse.json(
        { success: false, error: "Failed to create quotation request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quotationId: quotation.id,
      quoteReference: quotation.quote_reference,
    });
  } catch (error) {
    console.error("[Quotation] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
