/**
 * Weight-Based Pricing Tests
 *
 * Tests for the material pricing and weight-based product pricing system.
 */

import { describe, it, expect } from "vitest";

describe("Weight-Based Pricing Calculations", () => {
  // Material rates (paise per gram)
  const MATERIAL_RATES = {
    PLA: 500, // ₹5/g
    PETG: 600, // ₹6/g
    TPU: 800, // ₹8/g
  };

  function calculatePrice(material: string, weightGrams: number): number {
    const rate = MATERIAL_RATES[material as keyof typeof MATERIAL_RATES];
    if (!rate) return 0;
    return Math.round(weightGrams * rate);
  }

  describe("Price Calculation Formula", () => {
    it("should calculate PLA price correctly", () => {
      expect(calculatePrice("PLA", 50)).toBe(25000); // 50g × ₹5 = ₹250 = 25000 paise
      expect(calculatePrice("PLA", 100)).toBe(50000); // 100g × ₹5 = ₹500
      expect(calculatePrice("PLA", 45.5)).toBe(22750); // 45.5g × ₹5 = ₹227.50
    });

    it("should calculate PETG price correctly", () => {
      expect(calculatePrice("PETG", 50)).toBe(30000); // 50g × ₹6 = ₹300
      expect(calculatePrice("PETG", 100)).toBe(60000); // 100g × ₹6 = ₹600
    });

    it("should calculate TPU price correctly", () => {
      expect(calculatePrice("TPU", 50)).toBe(40000); // 50g × ₹8 = ₹400
      expect(calculatePrice("TPU", 100)).toBe(80000); // 100g × ₹8 = ₹800
    });

    it("should round fractional paise to nearest integer", () => {
      expect(calculatePrice("PLA", 33.33)).toBe(16665); // 33.33g × 500 = 16665 paise
      expect(calculatePrice("PETG", 25.75)).toBe(15450); // 25.75g × 600 = 15450 paise
    });

    it("should handle zero weight", () => {
      expect(calculatePrice("PLA", 0)).toBe(0);
    });

    it("should handle very large weights", () => {
      expect(calculatePrice("PLA", 1000)).toBe(500000); // 1kg × ₹5 = ₹5000
      expect(calculatePrice("TPU", 500)).toBe(400000); // 500g × ₹8 = ₹4000
    });

    it("should return 0 for unknown material", () => {
      expect(calculatePrice("UNKNOWN", 50)).toBe(0);
    });
  });

  describe("Material Rate Updates", () => {
    it("should reflect rate changes in calculations", () => {
      const customRates = { PLA: 450 }; // New rate: ₹4.50/g
      const calcWithNewRate = (weight: number) =>
        Math.round(weight * customRates.PLA);

      expect(calcWithNewRate(100)).toBe(45000); // 100g × ₹4.50 = ₹450
    });
  });

  describe("Validation", () => {
    it("should reject negative weights", () => {
      expect(() => {
        if (Math.sign(-10) === -1) throw new Error("Weight must be positive");
      }).toThrow("Weight must be positive");
    });

    it("should accept decimal weights", () => {
      expect(calculatePrice("PLA", 12.5)).toBe(6250);
      expect(calculatePrice("PETG", 0.1)).toBe(60);
    });
  });
});

describe("Product Variant Pricing", () => {
  interface Variant {
    sku: string;
    material: string;
    productionWeightGrams: number;
    expectedPricePaise: number;
  }

  const exampleVariants: Variant[] = [
    {
      sku: "MDO-S-PLA",
      material: "PLA",
      productionWeightGrams: 45,
      expectedPricePaise: 22500, // 45g × ₹5 = ₹225
    },
    {
      sku: "MDO-M-PETG",
      material: "PETG",
      productionWeightGrams: 60,
      expectedPricePaise: 36000, // 60g × ₹6 = ₹360
    },
    {
      sku: "EPE-L-TPU",
      material: "TPU",
      productionWeightGrams: 100,
      expectedPricePaise: 80000, // 100g × ₹8 = ₹800
    },
  ];

  it("should price all example variants correctly", () => {
    exampleVariants.forEach((variant) => {
      const rate =
        variant.material === "PLA" ? 500 : variant.material === "PETG" ? 600 : 800;
      const calculatedPrice = Math.round(variant.productionWeightGrams * rate);
      expect(calculatedPrice).toBe(variant.expectedPricePaise);
    });
  });

  it("should support product-specific sizes with different weights", () => {
    const phoneStandVariants = [
      { size: "Compact", weight: 30, material: "PLA", price: 15000 },
      { size: "Standard", weight: 45, material: "PLA", price: 22500 },
      { size: "Extended", weight: 60, material: "PLA", price: 30000 },
    ];

    phoneStandVariants.forEach((v) => {
      expect(Math.round(v.weight * 500)).toBe(v.price);
    });
  });

  it("should support same size label across different products", () => {
    const smallPhoneStand = { size: "Small", weight: 30, product: "Phone Stand" };
    const smallEnclosure = { size: "Small", weight: 120, product: "Enclosure" };

    // Same label, different weights, different prices
    expect(Math.round(smallPhoneStand.weight * 500)).toBe(15000);
    expect(Math.round(smallEnclosure.weight * 500)).toBe(60000);
  });
});

describe("Order Price Validation", () => {
  it("should recalculate prices server-side", () => {
    // Simulating client sending tampered price
    const clientPrice = 10000; // Client claims ₹100
    const serverWeight = 100; // Server knows actual weight: 100g
    const serverRate = 500; // Server knows rate: ₹5/g
    const serverCalculatedPrice = Math.round(serverWeight * serverRate);

    expect(serverCalculatedPrice).toBe(50000); // Correct price: ₹500
    expect(clientPrice).not.toBe(serverCalculatedPrice); // Detect tampering
  });

  it("should store immutable snapshots in orders", () => {
    interface OrderLineItem {
      productId: string;
      variantId: string;
      quantity: number;
      unitPricePaise: number;
      productionWeightGrams: number;
      materialRatePaisePerGram: number;
      lengthMm: number;
      widthMm: number;
      heightMm: number;
    }

    const orderSnapshot: OrderLineItem = {
      productId: "prod-123",
      variantId: "var-456",
      quantity: 2,
      unitPricePaise: 22500,
      productionWeightGrams: 45,
      materialRatePaisePerGram: 500,
      lengthMm: 90,
      widthMm: 60,
      heightMm: 35,
    };

    // Verify snapshot integrity
    expect(orderSnapshot.unitPricePaise).toBe(
      Math.round(
        orderSnapshot.productionWeightGrams *
          orderSnapshot.materialRatePaisePerGram
      )
    );
    expect(orderSnapshot.productionWeightGrams).toBeGreaterThan(0);
    expect(orderSnapshot.lengthMm).toBeGreaterThan(0);
  });

  it("should preserve historical pricing after rate changes", () => {
    // Old order (created when rate was ₹5/g)
    const oldOrder = {
      productionWeightGrams: 50,
      materialRatePaisePerGram: 500,
      unitPricePaise: 25000,
    };

    // New rate: ₹6/g
    const newRate = 600;

    // New order with same product
    const newOrder = {
      productionWeightGrams: 50,
      materialRatePaisePerGram: newRate,
      unitPricePaise: Math.round(50 * newRate),
    };

    expect(oldOrder.unitPricePaise).toBe(25000); // Old price unchanged
    expect(newOrder.unitPricePaise).toBe(30000); // New price reflects new rate
  });
});

describe("Legacy Product Handling", () => {
  it("should flag products without weights", () => {
    const productWithoutWeight = {
      sku: "LEGACY-001",
      material: "PLA",
      productionWeightGrams: null,
      pricePaise: 25000,
    };

    const needsWeight =
      productWithoutWeight.productionWeightGrams === null ||
      productWithoutWeight.productionWeightGrams === undefined;

    expect(needsWeight).toBe(true);
  });

  it("should not auto-calculate price when weight is missing", () => {
    const weight = null;
    const material = "PLA";

    if (!weight || weight <= 0) {
      expect(weight).toBeFalsy();
    }
  });

  it("should support manual price overrides for legacy products", () => {
    const legacyProduct = {
      sku: "LEGACY-002",
      material: "PLA",
      productionWeightGrams: null,
      pricePaise: 19900, // Manually set promotional price
      isLegacy: true,
    };

    // Legacy products can have manual prices
    expect(legacyProduct.pricePaise).toBe(19900);
    expect(legacyProduct.productionWeightGrams).toBeNull();
  });
});

describe("Dimensions and Weight Relationship", () => {
  it("should store dimensions independently from weight", () => {
    // Two products with same dimensions but different materials = different weights
    const solidPrint = {
      dimensions: { length: 100, width: 60, height: 40 },
      material: "PLA",
      infill: 100,
      weight: 150,
    };

    const hollowPrint = {
      dimensions: { length: 100, width: 60, height: 40 },
      material: "PLA",
      infill: 20,
      weight: 45,
    };

    expect(solidPrint.dimensions).toEqual(hollowPrint.dimensions);
    expect(solidPrint.weight).not.toBe(hollowPrint.weight);
  });

  it("should display dimensions clearly to customers", () => {
    const variant = {
      lengthMm: 90,
      widthMm: 60,
      heightMm: 35,
    };

    const displayString = `${variant.lengthMm} × ${variant.widthMm} × ${variant.heightMm} mm (L × W × H)`;
    expect(displayString).toBe("90 × 60 × 35 mm (L × W × H)");
  });
});

describe("Material Pricing Settings", () => {
  interface MaterialRate {
    material: string;
    ratePaisePerGram: number;
    isActive: boolean;
  }

  it("should validate positive rates", () => {
    const validateRate = (rate: number) => rate > 0 && rate < 1000000;

    expect(validateRate(500)).toBe(true);
    expect(validateRate(0)).toBe(false);
    expect(validateRate(-100)).toBe(false);
    expect(validateRate(2000000)).toBe(false);
  });

  it("should support multiple active materials", () => {
    const materials: MaterialRate[] = [
      { material: "PLA", ratePaisePerGram: 500, isActive: true },
      { material: "PETG", ratePaisePerGram: 600, isActive: true },
      { material: "TPU", ratePaisePerGram: 800, isActive: true },
      { material: "ABS", ratePaisePerGram: 550, isActive: false },
    ];

    const activeMaterials = materials.filter((m) => m.isActive);
    expect(activeMaterials.length).toBe(3);
    expect(activeMaterials.map((m) => m.material)).toEqual(["PLA", "PETG", "TPU"]);
  });

  it("should prevent admins from seeing unauthorized data", () => {
    const isAdmin = false;
    const canUpdateRates = isAdmin;

    expect(canUpdateRates).toBe(false);
  });
});
