"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export interface ShippingSettings {
  id: string;
  flatRatePaise: number;
  freeShippingThresholdPaise: number | null;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface UpdateShippingSettingsResult {
  success: boolean;
  error?: string;
}

/**
 * Get current shipping settings
 */
export async function getShippingSettings(): Promise<ShippingSettings | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("shipping_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      flatRatePaise: data.flat_rate_paise,
      freeShippingThresholdPaise: data.free_shipping_threshold_paise,
      isActive: data.is_active,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    };
  } catch (error) {
    console.error("[Admin] Failed to get shipping settings:", error);
    return null;
  }
}

/**
 * Update shipping settings (admin only)
 */
export async function updateShippingSettings(
  flatRatePaise: number,
  freeShippingThresholdPaise: number | null
): Promise<UpdateShippingSettingsResult> {
  try {
    await requireAdmin();

    if (flatRatePaise < 0) {
      return { success: false, error: "Shipping rate cannot be negative" };
    }

    if (freeShippingThresholdPaise !== null && freeShippingThresholdPaise <= 0) {
      return { success: false, error: "Free shipping threshold must be positive or null" };
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get existing settings
    const { data: existing } = await supabase
      .from("shipping_settings")
      .select("id")
      .eq("is_active", true)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("shipping_settings")
        .update({
          flat_rate_paise: flatRatePaise,
          free_shipping_threshold_paise: freeShippingThresholdPaise,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", existing.id);

      if (error) {
        console.error("[Admin] Failed to update shipping settings:", error);
        return { success: false, error: `Database error: ${error.message}` };
      }
    } else {
      // Insert new
      const { error } = await supabase.from("shipping_settings").insert({
        flat_rate_paise: flatRatePaise,
        free_shipping_threshold_paise: freeShippingThresholdPaise,
        is_active: true,
        updated_by: user.id,
      });

      if (error) {
        console.error("[Admin] Failed to create shipping settings:", error);
        return { success: false, error: `Database error: ${error.message}` };
      }
    }

    revalidatePath("/admin/settings/shipping");
    revalidatePath("/checkout");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] Update shipping settings failed:", message);
    return {
      success: false,
      error: message.includes("Admin") ? "Unauthorized" : "Failed to update settings",
    };
  }
}
