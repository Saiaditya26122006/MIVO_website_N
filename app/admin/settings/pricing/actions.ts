"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export interface UpdateMaterialRateResult {
  success: boolean;
  error?: string;
}

/**
 * Update material pricing rate (admin only)
 */
export async function updateMaterialRate(
  materialId: string,
  ratePaisePerGram: number
): Promise<UpdateMaterialRateResult> {
  try {
    await requireAdmin();

    // Validate input
    if (!materialId) {
      return { success: false, error: "Material ID is required" };
    }

    if (ratePaisePerGram <= 0) {
      return { success: false, error: "Rate must be greater than zero" };
    }

    if (ratePaisePerGram > 1000000) {
      return { success: false, error: "Rate is too high (max ₹10,000/g)" };
    }

    const supabase = await createClient();

    // Update the rate
    const { error: updateError } = await supabase
      .from("material_pricing_settings")
      .update({
        rate_paise_per_gram: ratePaisePerGram,
        updated_at: new Date().toISOString()
      })
      .eq("id", materialId);

    if (updateError) {
      console.error("[Update Material Rate] Error:", updateError);
      return { success: false, error: updateError.message };
    }

    // Revalidate relevant pages
    revalidatePath("/admin/settings/pricing");
    revalidatePath("/admin/products");
    revalidatePath("/explore");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Update Material Rate] Unexpected error:", message);
    return { success: false, error: `Failed to update rate: ${message}` };
  }
}

/**
 * Get active material rates (public)
 */
export async function getActiveMaterialRates(): Promise<Array<{
  material: string;
  ratePaisePerGram: number;
}>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("material_pricing_settings")
      .select("material, rate_paise_per_gram")
      .eq("is_active", true)
      .order("material");

    if (error) {
      console.error("[Get Material Rates] Error:", error);
      return [];
    }

    return (data || []).map((r: { material: string; rate_paise_per_gram: number }) => ({
      material: r.material,
      ratePaisePerGram: r.rate_paise_per_gram
    }));
  } catch (error) {
    console.error("[Get Material Rates] Unexpected error:", error);
    return [];
  }
}

/**
 * Calculate price for a given weight and material
 */
export async function calculatePrice(
  material: string,
  weightGrams: number
): Promise<{ success: boolean; pricePaise?: number; error?: string }> {
  try {
    if (weightGrams <= 0) {
      return { success: false, error: "Weight must be greater than zero" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("material_pricing_settings")
      .select("rate_paise_per_gram")
      .eq("material", material)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return { success: false, error: "Material not found or inactive" };
    }

    const pricePaise = Math.round(weightGrams * data.rate_paise_per_gram);

    return { success: true, pricePaise };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
