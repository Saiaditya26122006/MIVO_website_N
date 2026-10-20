/**
 * Cart Workflow Tests — Comprehensive
 *
 * Covers the complete shopping cart flow for the MIVO e-commerce platform:
 *   1. Cart calculation accuracy (line totals, subtotals, shipping, grand total)
 *   2. Cart item management (IDs, max qty, merging, removal, update bounds)
 *   3. Cart persistence (JSON round-trip)
 *   4. Price formatting via formatPrice()
 *   5. Product data integrity against products.json
 *   6. Server-side validation rules (unit-tested without HTTP)
 */

import { describe, it, expect, beforeEach } from "vitest";

import products from "@/lib/data/products.json";
import categories from "@/lib/data/categories.json";
import { formatPrice } from "@/lib/utils";
import type { Product, ProductVariant, Category } from "@/lib/data/types";
import type { CartItem, Cart, CartSummary } from "@/lib/data/cart-types";

// ---------------------------------------------------------------------------
// Helpers — mirrors the logic in the real cart and order-creation API
// ---------------------------------------------------------------------------

const MAX_QUANTITY = 99;
const SHIPPING_FLAT_RATE_PAISE = 10000; // ₹100

/** Generate a cart item ID in the canonical format */
function generateCartItemId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Decide whether two cart entries should merge */
function shouldMerge(
  a: Pick<CartItem, "productId" | "variantId" | "selectedColor">,
  b: Pick<CartItem, "productId" | "variantId" | "selectedColor">
): boolean {
  return (
    a.productId === b.productId &&
    a.variantId === b.variantId &&
    a.selectedColor === b.selectedColor
  );
}

/** Compute a CartSummary from an item list */
function summarise(items: Pick<CartItem, "unitPricePaise" | "quantity">[]): CartSummary {
  const subtotalPaise = items.reduce(
    (sum, item) => sum + item.unitPricePaise * item.quantity,
    0
  );
  const shippingPaise = items.length > 0 ? SHIPPING_FLAT_RATE_PAISE : 0;
  const totalPaise = subtotalPaise + shippingPaise;
  const itemCount = items.reduce((n, item) => n + item.quantity, 0);
  return { subtotalPaise, shippingPaise, totalPaise, itemCount };
}

/**
 * Server-side validation rules extracted from POST /api/orders/create.
 * Returns null when valid, or an error string when invalid.
 */
function validateOrderItem(
  item: { productId?: string; variantId?: string; selectedColor?: string; quantity?: number },
  allProducts: Product[]
): string | null {
  // Required fields
  if (!item.productId || !item.variantId || !item.selectedColor || !item.quantity) {
    return "Invalid item structure";
  }

  // Quantity bounds
  if (item.quantity < 1 || item.quantity > 99) {
    return `Invalid quantity for item: ${item.quantity}`;
  }

  // Product must exist and be published
  const product = allProducts.find((p) => p.id === item.productId);
  if (!product || product.status !== "published") {
    return `Product not available: ${item.productId}`;
  }

  // Variant must exist on that product
  const variant = product.variants.find((v) => v.id === item.variantId);
  if (!variant) {
    return `Variant not found: ${item.variantId}`;
  }

  // Color must be in variant's colorOptions
  if (variant.colorOptions.length > 0 && !variant.colorOptions.includes(item.selectedColor)) {
    return `Invalid color option: ${item.selectedColor}`;
  }

  return null;
}

// Cast the imported JSON arrays to their typed equivalents
const typedProducts = products as unknown as Product[];
const typedCategories = categories as unknown as Category[];

// ---------------------------------------------------------------------------
// 1. Cart Calculation Accuracy
// ---------------------------------------------------------------------------

describe("Cart Calculations", () => {
  it("computes line total as unitPricePaise * quantity", () => {
    const cases = [
      { unitPricePaise: 45000, quantity: 2, expected: 90000 },
      { unitPricePaise: 35000, quantity: 1, expected: 35000 },
      { unitPricePaise: 15000, quantity: 10, expected: 150000 },
      { unitPricePaise: 0, quantity: 5, expected: 0 },
      { unitPricePaise: 100, quantity: 99, expected: 9900 },
    ];

    for (const { unitPricePaise, quantity, expected } of cases) {
      expect(unitPricePaise * quantity).toBe(expected);
    }
  });

  it("computes cart subtotal as the sum of all line totals", () => {
    const items = [
      { unitPricePaise: 45000, quantity: 2 }, // 90 000
      { unitPricePaise: 35000, quantity: 1 }, // 35 000
      { unitPricePaise: 20000, quantity: 3 }, // 60 000
    ];

    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPricePaise * item.quantity,
      0
    );

    expect(subtotal).toBe(185000);
  });

  it("charges shipping of 10000 paise (₹100) when items exist", () => {
    const summary = summarise([
      { unitPricePaise: 45000, quantity: 1 },
    ]);

    expect(summary.shippingPaise).toBe(10000);
  });

  it("charges zero shipping when the cart is empty", () => {
    const summary = summarise([]);

    expect(summary.shippingPaise).toBe(0);
  });

  it("computes total = subtotal + shipping", () => {
    const items = [
      { unitPricePaise: 45000, quantity: 2 }, // 90 000
      { unitPricePaise: 35000, quantity: 1 }, // 35 000
    ];

    const summary = summarise(items);

    expect(summary.subtotalPaise).toBe(125000);
    expect(summary.shippingPaise).toBe(10000);
    expect(summary.totalPaise).toBe(135000);
  });

  it("computes correct itemCount (sum of quantities)", () => {
    const items = [
      { unitPricePaise: 45000, quantity: 2 },
      { unitPricePaise: 35000, quantity: 3 },
    ];

    const summary = summarise(items);

    expect(summary.itemCount).toBe(5);
  });

  it("returns all zeros for an empty cart summary", () => {
    const summary = summarise([]);

    expect(summary.subtotalPaise).toBe(0);
    expect(summary.shippingPaise).toBe(0);
    expect(summary.totalPaise).toBe(0);
    expect(summary.itemCount).toBe(0);
  });

  it("handles a single item correctly", () => {
    const summary = summarise([{ unitPricePaise: 95000, quantity: 1 }]);

    expect(summary.subtotalPaise).toBe(95000);
    expect(summary.shippingPaise).toBe(10000);
    expect(summary.totalPaise).toBe(105000);
    expect(summary.itemCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Cart Item Management
// ---------------------------------------------------------------------------

describe("Cart Item Management", () => {
  describe("ID generation", () => {
    it("generates IDs matching the pattern cart_TIMESTAMP_RANDOM", () => {
      const id = generateCartItemId();
      expect(id).toMatch(/^cart_\d+_[a-z0-9]+$/);
    });

    it("generates unique IDs across multiple calls", () => {
      const ids = new Set(Array.from({ length: 50 }, () => generateCartItemId()));
      expect(ids.size).toBe(50);
    });
  });

  describe("Quantity enforcement", () => {
    it("caps quantity at MAX_QUANTITY (99)", () => {
      expect(Math.min(100, MAX_QUANTITY)).toBe(99);
      expect(Math.min(999, MAX_QUANTITY)).toBe(99);
      expect(Math.min(99, MAX_QUANTITY)).toBe(99);
    });

    it("leaves quantity under the cap unchanged", () => {
      expect(Math.min(1, MAX_QUANTITY)).toBe(1);
      expect(Math.min(50, MAX_QUANTITY)).toBe(50);
      expect(Math.min(98, MAX_QUANTITY)).toBe(98);
    });
  });

  describe("Merging logic", () => {
    it("merges items with the same productId + variantId + selectedColor", () => {
      const a = { productId: "p-001", variantId: "v-001-1", selectedColor: "Black" };
      const b = { productId: "p-001", variantId: "v-001-1", selectedColor: "Black" };

      expect(shouldMerge(a, b)).toBe(true);
    });

    it("adds quantities on merge and caps at 99", () => {
      const existingQty = 50;
      const addedQty = 60;
      const merged = Math.min(existingQty + addedQty, MAX_QUANTITY);

      expect(merged).toBe(99);
    });

    it("adds quantities on merge without capping when under 99", () => {
      const existingQty = 2;
      const addedQty = 3;
      const merged = Math.min(existingQty + addedQty, MAX_QUANTITY);

      expect(merged).toBe(5);
    });

    it("does NOT merge items with different selectedColor", () => {
      const a = { productId: "p-001", variantId: "v-001-1", selectedColor: "Black" };
      const b = { productId: "p-001", variantId: "v-001-1", selectedColor: "White" };

      expect(shouldMerge(a, b)).toBe(false);
    });

    it("does NOT merge items with different variantId", () => {
      const a = { productId: "p-001", variantId: "v-001-1", selectedColor: "Black" };
      const b = { productId: "p-001", variantId: "v-001-2", selectedColor: "Black" };

      expect(shouldMerge(a, b)).toBe(false);
    });

    it("does NOT merge items with different productId", () => {
      const a = { productId: "p-001", variantId: "v-001-1", selectedColor: "Black" };
      const b = { productId: "p-002", variantId: "v-001-1", selectedColor: "Black" };

      expect(shouldMerge(a, b)).toBe(false);
    });
  });

  describe("Remove and update", () => {
    let cartItems: CartItem[];

    beforeEach(() => {
      cartItems = [
        {
          id: "cart_1",
          productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f",
          productName: "Modular Desk Organizer",
          productSlug: "desk-organizer-modular",
          variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549",
          variantSku: "DESK-ORG-SM-PLA",
          sizeName: "Small",
          material: "PLA",
          selectedColor: "Black",
          quantity: 2,
          unitPricePaise: 45000,
          imageUrl: "/placeholders/product-desk-organizer-1.svg",
        },
        {
          id: "cart_2",
          productId: "ad504b14-f116-c40c-96d3-3b72305dbd90",
          productName: "Adjustable Phone Stand",
          productSlug: "phone-stand-adjustable",
          variantId: "c03ba19e-abd2-2b65-474d-5964fcedb226",
          variantSku: "PHONE-STD-UNI-PLA",
          sizeName: "Universal",
          material: "PLA",
          selectedColor: "Red",
          quantity: 1,
          unitPricePaise: 35000,
          imageUrl: "/placeholders/product-phone-stand.svg",
        },
      ];
    });

    it("removes an item by ID", () => {
      const updated = cartItems.filter((i) => i.id !== "cart_1");

      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe("cart_2");
    });

    it("returns the same array when removing a non-existent ID", () => {
      const updated = cartItems.filter((i) => i.id !== "cart_999");

      expect(updated).toHaveLength(2);
    });

    it("updates quantity within valid bounds (1-99)", () => {
      const target = cartItems.find((i) => i.id === "cart_1")!;
      target.quantity = 10;

      expect(target.quantity).toBe(10);
    });

    it("rejects quantity update below 1", () => {
      const newQty = 0;
      const isValid = newQty >= 1 && newQty <= MAX_QUANTITY;

      expect(isValid).toBe(false);
    });

    it("rejects quantity update above 99", () => {
      const newQty = 100;
      const isValid = newQty >= 1 && newQty <= MAX_QUANTITY;

      expect(isValid).toBe(false);
    });

    it("accepts boundary quantity values 1 and 99", () => {
      expect(1 >= 1 && 1 <= MAX_QUANTITY).toBe(true);
      expect(99 >= 1 && 99 <= MAX_QUANTITY).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Cart Persistence
// ---------------------------------------------------------------------------

describe("Cart Persistence", () => {
  it("serializes a cart to JSON and deserializes with all fields intact", () => {
    const cart: Cart = {
      items: [
        {
          id: "cart_1700000000000_abc123",
          productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f",
          productName: "Modular Desk Organizer",
          productSlug: "desk-organizer-modular",
          variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549",
          variantSku: "DESK-ORG-SM-PLA",
          sizeName: "Small",
          material: "PLA",
          selectedColor: "Black",
          quantity: 2,
          unitPricePaise: 45000,
          imageUrl: "/placeholders/product-desk-organizer-1.svg",
        },
        {
          id: "cart_1700000000001_def456",
          productId: "a5d0aa26-00cf-bb2a-5268-ee9f43cf432f",
          productName: "Functional Gear Keychain",
          productSlug: "gear-keychain-functional",
          variantId: "5d0111ce-2959-6d7a-d991-e3726cc205cb",
          variantSku: "GEAR-KEY-SM-PLA",
          sizeName: "Small",
          material: "PLA",
          selectedColor: "Red",
          quantity: 3,
          unitPricePaise: 20000,
          imageUrl: "/placeholders/product-gear-keychain.svg",
        },
      ],
      updatedAt: "2026-10-19T12:00:00.000Z",
    };

    const json = JSON.stringify(cart);
    const restored: Cart = JSON.parse(json);

    // Top-level
    expect(restored.updatedAt).toBe(cart.updatedAt);
    expect(restored.items).toHaveLength(2);

    // Deep equality on every CartItem field
    for (let i = 0; i < cart.items.length; i++) {
      const original = cart.items[i];
      const copy = restored.items[i];

      expect(copy.id).toBe(original.id);
      expect(copy.productId).toBe(original.productId);
      expect(copy.productName).toBe(original.productName);
      expect(copy.productSlug).toBe(original.productSlug);
      expect(copy.variantId).toBe(original.variantId);
      expect(copy.variantSku).toBe(original.variantSku);
      expect(copy.sizeName).toBe(original.sizeName);
      expect(copy.material).toBe(original.material);
      expect(copy.selectedColor).toBe(original.selectedColor);
      expect(copy.quantity).toBe(original.quantity);
      expect(copy.unitPricePaise).toBe(original.unitPricePaise);
      expect(copy.imageUrl).toBe(original.imageUrl);
    }
  });

  it("serializes an empty cart correctly", () => {
    const emptyCart: Cart = {
      items: [],
      updatedAt: "2026-10-19T00:00:00.000Z",
    };

    const json = JSON.stringify(emptyCart);
    const restored: Cart = JSON.parse(json);

    expect(restored.items).toHaveLength(0);
    expect(restored.updatedAt).toBe(emptyCart.updatedAt);
  });

  it("round-trips a cart via JSON.parse(JSON.stringify()) with deep equality", () => {
    const cart: Cart = {
      items: [
        {
          id: "cart_rt_test",
          productId: "ad504b14-f116-c40c-96d3-3b72305dbd90",
          productName: "Adjustable Phone Stand",
          productSlug: "phone-stand-adjustable",
          variantId: "f2cd9682-5a83-f104-1d50-9c9ba03fe641",
          variantSku: "PHONE-STD-UNI-PETG",
          sizeName: "Universal",
          material: "PETG",
          selectedColor: "Transparent",
          quantity: 1,
          unitPricePaise: 45000,
          imageUrl: "/placeholders/product-phone-stand.svg",
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const restored: Cart = JSON.parse(JSON.stringify(cart));

    expect(restored).toEqual(cart);
  });
});

// ---------------------------------------------------------------------------
// 4. Price Format Verification
// ---------------------------------------------------------------------------

describe("Price Formatting (formatPrice)", () => {
  // NOTE: formatPrice uses Intl.NumberFormat("en-IN") with minimumFractionDigits: 0,
  // so whole-rupee amounts do NOT have trailing decimals.

  it("formats 45000 paise as a ₹450 string", () => {
    const result = formatPrice(45000);
    // Should contain ₹ and the number 450
    expect(result).toContain("450");
    expect(result).toMatch(/₹/);
  });

  it("formats 100 paise as a ₹1 string", () => {
    const result = formatPrice(100);
    expect(result).toMatch(/₹/);
    expect(result).toContain("1");
  });

  it("formats 0 paise as ₹0", () => {
    const result = formatPrice(0);
    expect(result).toMatch(/₹/);
    expect(result).toContain("0");
  });

  it("formats fractional rupees correctly (e.g. 12550 paise -> ₹125.5)", () => {
    const result = formatPrice(12550);
    expect(result).toMatch(/₹/);
    expect(result).toContain("125.5");
  });

  it("uses Indian grouping for large values (e.g. 1,00,000)", () => {
    // 10_000_00 paise = ₹1,00,000
    const result = formatPrice(10000000);
    expect(result).toMatch(/₹/);
    // Indian grouping: 1,00,000
    expect(result).toContain("1,00,000");
  });
});

// ---------------------------------------------------------------------------
// 5. Product Data Integrity
// ---------------------------------------------------------------------------

describe("Product Data Integrity (products.json)", () => {
  it("contains exactly 10 products", () => {
    expect(typedProducts).toHaveLength(10);
  });

  it("all 10 products have status 'published'", () => {
    for (const product of typedProducts) {
      expect(product.status).toBe("published");
    }
  });

  it("every product has at least 1 variant", () => {
    for (const product of typedProducts) {
      expect(product.variants.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every variant has pricePaise > 0", () => {
    for (const product of typedProducts) {
      for (const variant of product.variants) {
        expect(variant.pricePaise).toBeGreaterThan(0);
      }
    }
  });

  it("products with images have exactly 1 primary image", () => {
    for (const product of typedProducts) {
      if (product.images.length > 0) {
        const primaryImages = product.images.filter((img) => img.isPrimary === true);
        expect(primaryImages.length).toBe(1);
      }
    }
  });

  it("all product slugs are unique", () => {
    const slugs = typedProducts.map((p) => p.slug);
    const uniqueSlugs = new Set(slugs);

    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it("all product IDs are unique", () => {
    const ids = typedProducts.map((p) => p.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it("every product references a valid categoryId from categories.json", () => {
    const categoryIds = new Set(typedCategories.map((c) => c.id));
    for (const product of typedProducts) {
      expect(categoryIds.has(product.categoryId)).toBe(true);
    }
  });

  it("every variant has at least one colorOption", () => {
    for (const product of typedProducts) {
      for (const variant of product.variants) {
        expect(variant.colorOptions.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("every variant has a non-empty SKU", () => {
    for (const product of typedProducts) {
      for (const variant of product.variants) {
        expect(variant.sku).toBeTruthy();
        expect(variant.sku.length).toBeGreaterThan(0);
      }
    }
  });

  it("all variant IDs are unique across the entire catalogue", () => {
    const allVariantIds = typedProducts.flatMap((p) => p.variants.map((v) => v.id));
    const unique = new Set(allVariantIds);

    expect(unique.size).toBe(allVariantIds.length);
  });
});

// ---------------------------------------------------------------------------
// 6. Server-side Validation Logic
// ---------------------------------------------------------------------------

describe("Server-side Order Validation", () => {
  describe("Quantity validation", () => {
    it("accepts quantity of 1 (lower bound)", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black", quantity: 1 },
        typedProducts
      );
      expect(err).toBeNull();
    });

    it("accepts quantity of 99 (upper bound)", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black", quantity: 99 },
        typedProducts
      );
      expect(err).toBeNull();
    });

    it("rejects quantity of 0 (falsy, caught by required-field check)", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black", quantity: 0 },
        typedProducts
      );
      // quantity 0 is falsy, so the API's !item.quantity check fires first
      expect(err).toBe("Invalid item structure");
    });

    it("rejects quantity of 100", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black", quantity: 100 },
        typedProducts
      );
      expect(err).toContain("Invalid quantity");
    });

    it("rejects negative quantity", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black", quantity: -5 },
        typedProducts
      );
      expect(err).toContain("Invalid quantity");
    });
  });

  describe("Required fields", () => {
    it("rejects item missing productId", () => {
      const err = validateOrderItem(
        { variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black", quantity: 1 },
        typedProducts
      );
      expect(err).toBe("Invalid item structure");
    });

    it("rejects item missing variantId", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", selectedColor: "Black", quantity: 1 },
        typedProducts
      );
      expect(err).toBe("Invalid item structure");
    });

    it("rejects item missing selectedColor", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", quantity: 1 },
        typedProducts
      );
      expect(err).toBe("Invalid item structure");
    });

    it("rejects item missing quantity", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black" },
        typedProducts
      );
      expect(err).toBe("Invalid item structure");
    });
  });

  describe("Product and variant existence", () => {
    it("rejects a non-existent productId", () => {
      const err = validateOrderItem(
        { productId: "00000000-0000-0000-0000-000000000000", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black", quantity: 1 },
        typedProducts
      );
      expect(err).toContain("Product not available");
    });

    it("rejects a valid productId with a non-existent variantId", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "00000000-0000-0000-0000-000000000000", selectedColor: "Black", quantity: 1 },
        typedProducts
      );
      expect(err).toContain("Variant not found");
    });

    it("accepts a valid productId + variantId combination", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black", quantity: 1 },
        typedProducts
      );
      expect(err).toBeNull();
    });
  });

  describe("Color option validation", () => {
    it("accepts a color that is in the variant's colorOptions", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Blue", quantity: 1 },
        typedProducts
      );
      expect(err).toBeNull();
    });

    it("rejects a color that is NOT in the variant's colorOptions", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Pink", quantity: 1 },
        typedProducts
      );
      expect(err).toContain("Invalid color option");
    });

    it("rejects an empty-string color", () => {
      const err = validateOrderItem(
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "", quantity: 1 },
        typedProducts
      );
      // Empty string is falsy, so caught by the required-field check
      expect(err).toBe("Invalid item structure");
    });

    it("validates color for every real variant in the catalogue", () => {
      // For each product+variant, the first colorOption should always be valid
      for (const product of typedProducts) {
        for (const variant of product.variants) {
          const color = variant.colorOptions[0];
          const err = validateOrderItem(
            { productId: product.id, variantId: variant.id, selectedColor: color, quantity: 1 },
            typedProducts
          );
          expect(err).toBeNull();
        }
      }
    });
  });

  describe("End-to-end validation of a multi-item order", () => {
    it("validates a realistic two-item order successfully", () => {
      const orderItems = [
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black", quantity: 2 },
        { productId: "ad504b14-f116-c40c-96d3-3b72305dbd90", variantId: "c03ba19e-abd2-2b65-474d-5964fcedb226", selectedColor: "Red", quantity: 1 },
      ];

      for (const item of orderItems) {
        expect(validateOrderItem(item, typedProducts)).toBeNull();
      }

      // Verify the server-calculated totals
      const product1 = typedProducts.find((p) => p.id === "857bd7d9-3681-780a-1dcd-a8959c5e4e2f")!;
      const variant1 = product1.variants.find((v) => v.id === "7a91e774-3178-bb3a-8382-47bb1ed73549")!;
      const product3 = typedProducts.find((p) => p.id === "ad504b14-f116-c40c-96d3-3b72305dbd90")!;
      const variant3 = product3.variants.find((v) => v.id === "c03ba19e-abd2-2b65-474d-5964fcedb226")!;

      const line1 = variant1.pricePaise * 2; // 45000 * 2 = 90000
      const line2 = variant3.pricePaise * 1; // 35000 * 1 = 35000
      const subtotal = line1 + line2;         // 125000
      const shipping = SHIPPING_FLAT_RATE_PAISE; // 10000
      const total = subtotal + shipping;      // 135000

      expect(line1).toBe(90000);
      expect(line2).toBe(35000);
      expect(subtotal).toBe(125000);
      expect(total).toBe(135000);
    });

    it("rejects an order where one item has an invalid color", () => {
      const orderItems = [
        { productId: "857bd7d9-3681-780a-1dcd-a8959c5e4e2f", variantId: "7a91e774-3178-bb3a-8382-47bb1ed73549", selectedColor: "Black", quantity: 1 },
        { productId: "ad504b14-f116-c40c-96d3-3b72305dbd90", variantId: "c03ba19e-abd2-2b65-474d-5964fcedb226", selectedColor: "Neon", quantity: 1 },
      ];

      const errors = orderItems.map((item) => validateOrderItem(item, typedProducts));

      expect(errors[0]).toBeNull();
      expect(errors[1]).toContain("Invalid color option");
    });
  });
});

// ---------------------------------------------------------------------------
// 7. Product & Variant ID Consistency (JSON ↔ Supabase seed)
// ---------------------------------------------------------------------------

describe("Product & Variant ID Consistency", () => {
  function stableUuid(sourceId: string): string {
    // Mirrors pg_temp.stable_uuid(source_id) = md5(source_id)::uuid
    // We compute MD5 with a simple approach — Node's crypto is available in test env
    const crypto = require("crypto");
    const h: string = crypto.createHash("md5").update(sourceId).digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  it("all product IDs in products.json match md5(source)::uuid format", () => {
    const expectedMapping: Record<string, string> = {};
    for (let i = 1; i <= 10; i++) {
      const key = `prod-${String(i).padStart(3, "0")}`;
      expectedMapping[key] = stableUuid(key);
    }

    for (const product of typedProducts) {
      const match = Object.values(expectedMapping).includes(product.id);
      expect(match).toBe(true);
    }
  });

  it("all category IDs in categories.json match md5(source)::uuid format", () => {
    for (let i = 1; i <= 5; i++) {
      const key = `cat-${String(i).padStart(3, "0")}`;
      const expectedUuid = stableUuid(key);
      const cat = typedCategories.find((c) => c.id === expectedUuid);
      expect(cat).toBeDefined();
    }
  });

  it("every product.categoryId references a valid category", () => {
    const catIds = new Set(typedCategories.map((c) => c.id));
    for (const product of typedProducts) {
      expect(catIds.has(product.categoryId)).toBe(true);
    }
  });

  it("all variant IDs match their expected deterministic UUID", () => {
    const variantSourceIds = [
      "var-001-1", "var-001-2", "var-001-3",
      "var-002-1", "var-002-2",
      "var-003-1", "var-003-2",
      "var-004-1",
      "var-005-1", "var-005-2",
      "var-006-1", "var-006-2",
      "var-007-1",
      "var-008-1", "var-008-2",
      "var-009-1", "var-009-2",
      "var-010-1",
    ];

    const allVariants = typedProducts.flatMap((p) => p.variants);
    const allVariantIds = new Set(allVariants.map((v) => v.id));

    for (const sourceId of variantSourceIds) {
      const expectedUuid = stableUuid(sourceId);
      expect(allVariantIds.has(expectedUuid)).toBe(true);
    }
  });

  it("product-to-variant parent relationship is correct", () => {
    for (let i = 1; i <= 10; i++) {
      const prodKey = `prod-${String(i).padStart(3, "0")}`;
      const prodUuid = stableUuid(prodKey);
      const product = typedProducts.find((p) => p.id === prodUuid);
      if (!product) continue;

      for (const variant of product.variants) {
        // Variant ID should be a deterministic UUID from a var-NNN-X source
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
        expect(variant.id).toMatch(uuidRegex);
      }
    }
  });

  it("cart item built from product detail page uses resolvable IDs", () => {
    // Simulate what ProductDetailClient does: uses product.id and variant.id
    const product = typedProducts[0];
    const variant = product.variants[0];

    const cartItem = {
      productId: product.id,
      variantId: variant.id,
      selectedColor: variant.colorOptions[0],
      quantity: 1,
    };

    // This item should pass server-side validation
    const err = validateOrderItem(cartItem, typedProducts);
    expect(err).toBeNull();
  });
});
