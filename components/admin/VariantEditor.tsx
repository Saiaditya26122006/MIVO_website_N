"use client";

import { useState, useEffect } from "react";
import type { ProductVariantFormData } from "@/app/admin/products/actions";

interface VariantEditorProps {
  variants: ProductVariantFormData[];
  materialRates: Record<string, number>;
  onChange: (variants: ProductVariantFormData[]) => void;
}

type Material = "PLA" | "PETG" | "TPU";
type Size = "Small" | "Medium" | "Large";

interface SizeConfig {
  enabled: boolean;
  label: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  productionWeightGrams: number | null;
  sku: string;
  isActive: boolean;
  productionTimeHours: number | null;
}

export function VariantEditor({ variants, materialRates, onChange }: VariantEditorProps) {
  const [selectedMaterial, setSelectedMaterial] = useState<Material>("PLA");

  // State structure: Record<Material, Record<Size, SizeConfig>>
  const [materialSizes, setMaterialSizes] = useState<Record<Material, Record<Size, SizeConfig>>>({
    PLA: {
      Small: { enabled: false, label: "Small", lengthMm: 0, widthMm: 0, heightMm: 0, productionWeightGrams: null, sku: "", isActive: true, productionTimeHours: 24 },
      Medium: { enabled: false, label: "Medium", lengthMm: 0, widthMm: 0, heightMm: 0, productionWeightGrams: null, sku: "", isActive: true, productionTimeHours: 24 },
      Large: { enabled: false, label: "Large", lengthMm: 0, widthMm: 0, heightMm: 0, productionWeightGrams: null, sku: "", isActive: true, productionTimeHours: 24 },
    },
    PETG: {
      Small: { enabled: false, label: "Small", lengthMm: 0, widthMm: 0, heightMm: 0, productionWeightGrams: null, sku: "", isActive: true, productionTimeHours: 24 },
      Medium: { enabled: false, label: "Medium", lengthMm: 0, widthMm: 0, heightMm: 0, productionWeightGrams: null, sku: "", isActive: true, productionTimeHours: 24 },
      Large: { enabled: false, label: "Large", lengthMm: 0, widthMm: 0, heightMm: 0, productionWeightGrams: null, sku: "", isActive: true, productionTimeHours: 24 },
    },
    TPU: {
      Small: { enabled: false, label: "Small", lengthMm: 0, widthMm: 0, heightMm: 0, productionWeightGrams: null, sku: "", isActive: true, productionTimeHours: 24 },
      Medium: { enabled: false, label: "Medium", lengthMm: 0, widthMm: 0, heightMm: 0, productionWeightGrams: null, sku: "", isActive: true, productionTimeHours: 24 },
      Large: { enabled: false, label: "Large", lengthMm: 0, widthMm: 0, heightMm: 0, productionWeightGrams: null, sku: "", isActive: true, productionTimeHours: 24 },
    },
  });

  // Load existing variants into the state structure
  useEffect(() => {
    const newMaterialSizes = { ...materialSizes };
    let hasDefault = false;

    variants.forEach((variant) => {
      const material = variant.material as Material;
      if (!newMaterialSizes[material]) return;

      // Try to match to Small/Medium/Large based on size name
      let size: Size = "Small";
      const sizeLower = variant.sizeName.toLowerCase();
      if (sizeLower.includes("medium") || sizeLower.includes("m")) {
        size = "Medium";
      } else if (sizeLower.includes("large") || sizeLower.includes("l")) {
        size = "Large";
      }

      newMaterialSizes[material][size] = {
        enabled: true,
        label: variant.sizeName,
        lengthMm: variant.lengthMm,
        widthMm: variant.widthMm,
        heightMm: variant.heightMm,
        productionWeightGrams: variant.productionWeightGrams || null,
        sku: variant.sku,
        isActive: variant.isActive !== false,
        productionTimeHours: variant.productionTimeHours,
      };

      if (variant.isDefault) hasDefault = true;
    });

    // If no default, set first enabled variant as default
    if (!hasDefault && variants.length > 0) {
      // Will be handled by syncToVariants
    }

    setMaterialSizes(newMaterialSizes);
  }, []); // Only run once on mount

  // Sync state to variants array whenever materialSizes changes
  useEffect(() => {
    syncToVariants();
  }, [materialSizes]);

  function syncToVariants() {
    const newVariants: ProductVariantFormData[] = [];
    let hasDefault = false;

    (["PLA", "PETG", "TPU"] as Material[]).forEach((material) => {
      (["Small", "Medium", "Large"] as Size[]).forEach((size) => {
        const config = materialSizes[material][size];
        if (config.enabled) {
          const rate = materialRates[material] || 0;
          const pricePaise = config.productionWeightGrams
            ? Math.round(config.productionWeightGrams * rate)
            : 0;

          // Find if this variant existed before (to preserve ID and isDefault)
          const existingVariant = variants.find(
            (v) => v.material === material && v.sizeName === config.label
          );

          newVariants.push({
            id: existingVariant?.id,
            sku: config.sku,
            sizeName: config.label,
            lengthMm: config.lengthMm,
            widthMm: config.widthMm,
            heightMm: config.heightMm,
            material: material,
            colorOptions: existingVariant?.colorOptions || ["Natural"],
            pricePaise,
            productionWeightGrams: config.productionWeightGrams,
            productionTimeHours: config.productionTimeHours,
            isActive: config.isActive,
            isDefault: existingVariant?.isDefault || false,
          });

          if (existingVariant?.isDefault) hasDefault = true;
        }
      });
    });

    // Ensure at least one default
    if (newVariants.length > 0 && !hasDefault) {
      newVariants[0].isDefault = true;
    }

    onChange(newVariants);
  }

  function updateSize(material: Material, size: Size, updates: Partial<SizeConfig>) {
    setMaterialSizes((prev) => ({
      ...prev,
      [material]: {
        ...prev[material],
        [size]: {
          ...prev[material][size],
          ...updates,
        },
      },
    }));
  }

  function calculatePrice(material: Material, weightGrams: number | null): number {
    if (!weightGrams || weightGrams <= 0) return 0;
    const rate = materialRates[material] || 0;
    return Math.round(weightGrams * rate);
  }

  const materials: Material[] = ["PLA", "PETG", "TPU"];
  const sizes: Size[] = ["Small", "Medium", "Large"];

  return (
    <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
      <h2 className="font-semibold text-xl text-ink mb-6">Product Variants</h2>

      {/* Material Tabs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {materials.map((material) => (
          <button
            key={material}
            onClick={() => setSelectedMaterial(material)}
            className={`px-6 py-4 rounded-xl font-medium transition-all border-2 ${
              selectedMaterial === material
                ? "bg-lime border-lime text-ink shadow-md"
                : "bg-white border-ink/20 text-ink/70 hover:border-lime/50"
            }`}
          >
            <div className="text-lg font-bold">{material}</div>
            <div className="text-sm">
              ₹{(materialRates[material] / 100).toFixed(2)}/g
            </div>
          </button>
        ))}
      </div>

      {/* Size Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sizes.map((size) => {
          const config = materialSizes[selectedMaterial][size];
          const price = calculatePrice(selectedMaterial, config.productionWeightGrams);

          return (
            <div
              key={size}
              className={`border-2 rounded-xl p-4 transition-all ${
                config.enabled
                  ? "border-lime bg-lime/5"
                  : "border-ink/10 bg-white"
              }`}
            >
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink">{size}</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) =>
                      updateSize(selectedMaterial, size, { enabled: e.target.checked })
                    }
                    className="w-4 h-4 border-2 border-ink/20 rounded"
                  />
                  <span className="text-sm text-ink/70">Enable</span>
                </label>
              </div>

              {config.enabled && (
                <div className="space-y-3">
                  {/* Size Label */}
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">
                      Size Label
                    </label>
                    <input
                      type="text"
                      value={config.label}
                      onChange={(e) =>
                        updateSize(selectedMaterial, size, { label: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                      placeholder={size}
                    />
                  </div>

                  {/* Dimensions */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-ink/60 mb-1">
                        L (mm)
                      </label>
                      <input
                        type="number"
                        value={config.lengthMm || ""}
                        onChange={(e) =>
                          updateSize(selectedMaterial, size, {
                            lengthMm: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                        placeholder="90"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink/60 mb-1">
                        W (mm)
                      </label>
                      <input
                        type="number"
                        value={config.widthMm || ""}
                        onChange={(e) =>
                          updateSize(selectedMaterial, size, {
                            widthMm: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                        placeholder="60"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink/60 mb-1">
                        H (mm)
                      </label>
                      <input
                        type="number"
                        value={config.heightMm || ""}
                        onChange={(e) =>
                          updateSize(selectedMaterial, size, {
                            heightMm: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                        placeholder="35"
                      />
                    </div>
                  </div>

                  {/* Production Weight */}
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">
                      Weight (g)
                    </label>
                    <input
                      type="number"
                      value={config.productionWeightGrams || ""}
                      onChange={(e) =>
                        updateSize(selectedMaterial, size, {
                          productionWeightGrams: parseFloat(e.target.value) || null,
                        })
                      }
                      step="0.1"
                      className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                      placeholder="45.5"
                    />
                  </div>

                  {/* Auto-calculated Price */}
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">
                      Price
                    </label>
                    <div className="w-full px-3 py-2 text-sm border-2 border-lime/50 rounded-lg bg-lime/10">
                      <div className="font-semibold text-ink">
                        ₹{(price / 100).toFixed(2)}
                      </div>
                      {config.productionWeightGrams && (
                        <div className="text-xs text-ink/60 mt-1">
                          {config.productionWeightGrams}g × ₹
                          {(materialRates[selectedMaterial] / 100).toFixed(2)}/g
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-xs font-medium text-ink/60 mb-1">SKU</label>
                    <input
                      type="text"
                      value={config.sku}
                      onChange={(e) =>
                        updateSize(selectedMaterial, size, { sku: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                      placeholder={`${selectedMaterial}-${size[0]}`}
                    />
                  </div>

                  {/* Active Status */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.isActive}
                      onChange={(e) =>
                        updateSize(selectedMaterial, size, { isActive: e.target.checked })
                      }
                      className="w-4 h-4 border-2 border-ink/20 rounded"
                    />
                    <span className="text-xs text-ink/70">Active (available for sale)</span>
                  </label>
                </div>
              )}

              {!config.enabled && (
                <div className="text-center py-8 text-ink/40 text-sm">
                  Enable to configure this size
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-cream/30 border border-ink/10 rounded-xl">
        <p className="text-sm text-ink/70">
          💡 <strong>Tip:</strong> Each material can have independent dimensions and weights for
          each size. Switch between materials using the tabs above.
        </p>
      </div>
    </div>
  );
}
