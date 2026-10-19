import { describe, it, expect } from "vitest";
import { cn, formatPrice, formatDate } from "@/lib/utils";

describe("Utility Functions", () => {
  describe("cn (className merge)", () => {
    it("should merge class names", () => {
      const result = cn("base-class", "additional-class");
      expect(result).toContain("base-class");
      expect(result).toContain("additional-class");
    });

    it("should handle conditional classes", () => {
      const result = cn("base", false && "hidden", true && "visible");
      expect(result).toContain("base");
      expect(result).toContain("visible");
      expect(result).not.toContain("hidden");
    });

    it("should resolve Tailwind conflicts", () => {
      // tw-merge should keep only the last conflicting class
      const result = cn("p-4", "p-6");
      expect(result).toBe("p-6");
    });
  });

  describe("formatPrice", () => {
    it("should format price from paise to rupees", () => {
      expect(formatPrice(10000)).toBe("₹100");
      expect(formatPrice(150050)).toBe("₹1,500.5"); // Note: Indian locale may not add trailing zero
      expect(formatPrice(0)).toBe("₹0");
    });

    it("should handle large amounts", () => {
      expect(formatPrice(100000000)).toBe("₹10,00,000");
    });

    it("should handle decimal paise correctly", () => {
      expect(formatPrice(12345)).toBe("₹123.45");
    });
  });

  describe("formatDate", () => {
    it("should format Date object", () => {
      const date = new Date("2026-10-19");
      const formatted = formatDate(date);
      expect(formatted).toContain("October");
      expect(formatted).toContain("2026");
    });

    it("should format ISO string", () => {
      const formatted = formatDate("2026-10-19T10:30:00Z");
      expect(formatted).toContain("October");
      expect(formatted).toContain("2026");
    });
  });
});
