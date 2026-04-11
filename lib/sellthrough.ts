// Pure sell-through utility functions (usable on both client and server)
import { VariantData, RestockRatio } from "@/types";

export function computeSellThrough(variant: { sold: number; stockLeft: number }): number {
  const total = variant.sold + variant.stockLeft;
  if (total === 0) return 0;
  return (variant.sold / total) * 100;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function computeRestockRatio(variants: VariantData[]): RestockRatio[] {
  const totalSold = variants.reduce((sum, v) => sum + v.sold, 0);
  if (totalSold === 0) return [];

  const gcdAll = variants.reduce((acc, v) => gcd(acc, v.sold || 1), variants[0]?.sold || 1);

  return variants.map((v) => ({
    size: v.size || "One Size",
    percentage: (v.sold / totalSold) * 100,
    sold: v.sold,
    ratio: Math.round((v.sold || 1) / gcdAll),
    restockUnits: 0,
  }));
}

export function calculateRestockUnits(
  variants: VariantData[],
  totalRestock: number
): RestockRatio[] {
  const ratios = computeRestockRatio(variants);
  const totalRatio = ratios.reduce((sum, r) => sum + r.ratio, 0);
  if (totalRatio === 0) return ratios;

  return ratios.map((r) => ({
    ...r,
    restockUnits: Math.round((r.ratio / totalRatio) * totalRestock),
  }));
}
