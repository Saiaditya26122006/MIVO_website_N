"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Validation schema
const ContactFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  enquiryType: z.enum([
    "custom_3d_printing",
    "product_enquiry",
    "cad_design",
    "existing_order",
    "quotation_request",
    "other",
  ]),
  subject: z.string().max(200).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export type ContactFormData = z.infer<typeof ContactFormSchema>;

export interface SubmitContactResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

/**
 * Submit a contact form message
 * Server-side validation and rate limiting included
 */
export async function submitContactMessage(
  formData: ContactFormData
): Promise<SubmitContactResult> {
  try {
    // Validate input
    const validated = ContactFormSchema.parse(formData);

    const supabase = await createClient();

    // Check if user is authenticated (optional)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Basic rate limiting: check recent submissions from same email
    const { data: recentMessages, error: checkError } = await supabase
      .from("contact_messages")
      .select("created_at")
      .eq("email", validated.email)
      .gte("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
      .order("created_at", { ascending: false });

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows found, which is fine
      console.error("Error checking rate limit:", checkError);
      return {
        success: false,
        error: "Unable to process your request. Please try again later.",
      };
    }

    if (recentMessages && recentMessages.length >= 3) {
      return {
        success: false,
        error: "You've submitted multiple messages recently. Please wait 15 minutes before sending another message.",
      };
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from("contact_messages")
      .insert({
        full_name: validated.fullName,
        email: validated.email,
        enquiry_type: validated.enquiryType,
        subject: validated.subject || null,
        message: validated.message,
        user_id: user?.id || null,
        status: "new",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting contact message:", insertError);
      return {
        success: false,
        error: "Failed to submit your message. Please try again or contact us directly at hello@mivo.in",
      };
    }

    return {
      success: true,
      messageId: message.id,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0].message,
      };
    }

    console.error("Unexpected error in submitContactMessage:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again or contact us at hello@mivo.in",
    };
  }
}
