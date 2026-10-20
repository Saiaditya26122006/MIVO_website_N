import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Test the validation schema logic (without database calls)
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

describe('Contact Form Validation', () => {
  it('should accept valid form data', () => {
    const validData = {
      fullName: "John Doe",
      email: "john@example.com",
      enquiryType: "product_enquiry" as const,
      subject: "Question about 3D printing",
      message: "I would like to know more about your 3D printing services.",
    };

    const result = ContactFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject name that is too short', () => {
    const invalidData = {
      fullName: "J",
      email: "john@example.com",
      enquiryType: "product_enquiry" as const,
      message: "This is a test message with enough characters.",
    };

    const result = ContactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 2 characters");
    }
  });

  it('should reject invalid email format', () => {
    const invalidData = {
      fullName: "John Doe",
      email: "not-an-email",
      enquiryType: "product_enquiry" as const,
      message: "This is a test message with enough characters.",
    };

    const result = ContactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("valid email");
    }
  });

  it('should reject message that is too short', () => {
    const invalidData = {
      fullName: "John Doe",
      email: "john@example.com",
      enquiryType: "product_enquiry" as const,
      message: "Too short",
    };

    const result = ContactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("at least 10 characters");
    }
  });

  it('should reject invalid enquiry type', () => {
    const invalidData = {
      fullName: "John Doe",
      email: "john@example.com",
      enquiryType: "invalid_type",
      message: "This is a test message with enough characters.",
    };

    const result = ContactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept optional subject field', () => {
    const dataWithoutSubject = {
      fullName: "John Doe",
      email: "john@example.com",
      enquiryType: "product_enquiry" as const,
      message: "This is a test message with enough characters.",
    };

    const result = ContactFormSchema.safeParse(dataWithoutSubject);
    expect(result.success).toBe(true);
  });

  it('should reject message that is too long', () => {
    const invalidData = {
      fullName: "John Doe",
      email: "john@example.com",
      enquiryType: "product_enquiry" as const,
      message: "A".repeat(2001), // 2001 characters
    };

    const result = ContactFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept all valid enquiry types', () => {
    const enquiryTypes = [
      "custom_3d_printing",
      "product_enquiry",
      "cad_design",
      "existing_order",
      "quotation_request",
      "other",
    ] as const;

    enquiryTypes.forEach((type) => {
      const data = {
        fullName: "John Doe",
        email: "john@example.com",
        enquiryType: type,
        message: "This is a test message with enough characters.",
      };

      const result = ContactFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
