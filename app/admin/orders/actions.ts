"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface UpdateOrderStatusResult {
  success: boolean;
  error?: string;
}

export interface UpdateOrderTrackingResult {
  success: boolean;
  error?: string;
}

/**
 * Update order status (admin only)
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<UpdateOrderStatusResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set timestamps based on status
    if (newStatus === "shipped" && !updateData.shipped_at) {
      updateData.shipped_at = new Date().toISOString();
    } else if (newStatus === "delivered" && !updateData.delivered_at) {
      updateData.delivered_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      console.error("[Admin] Failed to update order status:", error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    revalidatePath("/account/orders", "page");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] Update order status failed:", message);
    return {
      success: false,
      error: message.includes("Admin") ? "Unauthorized" : "Failed to update order status",
    };
  }
}

/**
 * Update order tracking information (admin only)
 */
export async function updateOrderTracking(
  orderId: string,
  trackingData: {
    trackingNumber?: string;
    shippingProvider?: string;
    estimatedDeliveryDate?: string;
    adminNotes?: string;
  }
): Promise<UpdateOrderTrackingResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (trackingData.trackingNumber !== undefined) {
      updateData.tracking_number = trackingData.trackingNumber || null;
    }
    if (trackingData.shippingProvider !== undefined) {
      updateData.shipping_provider = trackingData.shippingProvider || null;
    }
    if (trackingData.estimatedDeliveryDate !== undefined) {
      updateData.estimated_delivery_date = trackingData.estimatedDeliveryDate || null;
    }
    if (trackingData.adminNotes !== undefined) {
      updateData.admin_notes = trackingData.adminNotes || null;
    }

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      console.error("[Admin] Failed to update order tracking:", error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] Update order tracking failed:", message);
    return {
      success: false,
      error: message.includes("Admin") ? "Unauthorized" : "Failed to update tracking information",
    };
  }
}
