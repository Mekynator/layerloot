import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";

interface Variant {
  id: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  is_active: boolean;
}

interface ProductConfiguratorProps {
  variants: Variant[];
  selectedVariant: Variant | null;
  onSelectVariant: (v: Variant | null) => void;
}

const MATERIAL_INFO: Record<string, { desc: string }> = {
  PLA: { desc: "Standard, eco-friendly, great for decorative prints" },
  "PLA Silk": { desc: "Shiny, metallic finish with silky surface" },
  PETG: { desc: "Durable, heat-resistant, ideal for functional parts" },
  Resin: { desc: "Ultra-detailed, smooth surface finish" },
};

const COLOR_MAP: Record<string, string> = {
  Black: "#1a1a1a",
  White: "#f5f5f5",
  Red: "#dc2626",
  Blue: "#2563eb",
  Green: "#16a34a",
  Orange: "#ea580c",
  Yellow: "#eab308",
  Gray: "#6b7280",
  Purple: "#9333ea",
  Pink: "#ec4899",
  Silver: "#a8a8a8",
  Gold: "#d4a017",
};

const ProductConfigurator = ({ variants, selectedVariant, onSelectVariant }: ProductConfiguratorProps) => {
  // Extract unique attribute keys & values
  const attrOptions = useMemo(() => {
    const map = new Map<string, Set<string>>();
    variants.forEach((v) => {
      Object.entries(v.attributes || {}).forEach(([key, val]) => {
        if (!map.has(key)) map.set(key, new Set());
        map.get(key)!.add(val);
      });
    });
    const result: { key: string; values: string[] }[] = [];
    map.forEach((vals, key) => result.push({ key, values: Array.from(vals) }));
    return result;
  }, [variants]);

  const [selections, setSelections] = useState<Record<string, string>>(() => {
    if (selectedVariant) return { ...selectedVariant.attributes };
    const init: Record<string, string> = {};
    attrOptions.forEach(({ key, values }) => { init[key] = values[0]; });
    return init;
  });

  useEffect(() => {
    if (selectedVariant) {
      setSelections({ ...selectedVariant.attributes });
      return;
    }

    const init: Record<string, string> = {};
    attrOptions.forEach(({ key, values }) => {
      init[key] = values[0];
    });
    setSelections(init);
  }, [selectedVariant, attrOptions]);

  const handleSelect = (key: string, value: string) => {
    const next = { ...selections, [key]: value };
    setSelections(next);
    // Find matching variant
    const match = variants.find((v) =>
      Object.entries(next).every(([k, val]) => v.attributes[k] === val)
    );
    onSelectVariant(match || null);
  };

  if (attrOptions.length === 0) return null;

  return (
    <div className="space-y-5">
      {attrOptions.map(({ key, values }) => (
        <div key={key} className="space-y-2">
          <label className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {key}: <span className="text-foreground">{selections[key]}</span>
          </label>

          {key.toLowerCase() === "color" ? (
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const hex = COLOR_MAP[val] || "#888";
                const active = selections[key] === val;
                return (
                  <button
                    key={val}
                    onClick={() => handleSelect(key, val)}
                    className={`relative h-9 w-9 rounded-full border-2 transition-all duration-200 ${
                      active ? "border-primary scale-110 ring-2 ring-primary/30" : "border-border hover:border-muted-foreground"
                    }`}
                    style={{ backgroundColor: hex }}
                    title={val}
                  >
                    {active && (
                      <motion.div
                        layoutId="color-check"
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke={hex === "#f5f5f5" || hex === "#eab308" ? "#000" : "#fff"} strokeWidth="3">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const active = selections[key] === val;
                const matchVariant = variants.find((v) => {
                  const test = { ...selections, [key]: val };
                  return Object.entries(test).every(([k, vv]) => v.attributes[k] === vv);
                });
                const outOfStock = matchVariant && matchVariant.stock <= 0;

                return (
                  <button
                    key={val}
                    onClick={() => handleSelect(key, val)}
                    disabled={!!outOfStock}
                    className={`rounded-md border px-4 py-2 font-display text-sm uppercase transition-all duration-200 ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border text-foreground hover:border-primary/50"
                    } ${outOfStock ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          )}

          {/* Material info tooltip */}
          {key.toLowerCase() === "material" && MATERIAL_INFO[selections[key]] && (
            <p className="text-xs text-muted-foreground italic">
              {MATERIAL_INFO[selections[key]].desc}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProductConfigurator;
