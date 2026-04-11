"use client";

import { ProductData } from "@/types";
import { computeSellThrough } from "@/lib/sellthrough";

interface SellThroughListProps {
  products: ProductData[];
}

function getSellThroughColor(pct: number): string {
  if (pct >= 90) return "#EF4444";
  if (pct >= 70) return "#F59E0B";
  return "#22C55E";
}

function getSellThroughBadge(pct: number): { label: string; bg: string; color: string } {
  if (pct === 100) return { label: "Out of Stock", bg: "rgba(239,68,68,0.15)", color: "#EF4444" };
  if (pct >= 90) return { label: "Critical", bg: "rgba(239,68,68,0.15)", color: "#EF4444" };
  if (pct >= 70) return { label: "Restock Soon", bg: "rgba(245,158,11,0.15)", color: "#F59E0B" };
  return { label: "Healthy", bg: "rgba(34,197,94,0.15)", color: "#22C55E" };
}

export default function SellThroughList({ products }: SellThroughListProps) {
  const topProducts = products.slice(0, 4);

  if (topProducts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "var(--text3)" }}>
        No product data available
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {topProducts.map((product) => (
        <div
          key={product.id}
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "16px",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: "15px",
              fontWeight: "600",
              color: "var(--text)",
            }}
          >
            {product.name}
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {product.variants.map((variant) => {
              const sellThrough = computeSellThrough(variant);
              const barColor = getSellThroughColor(sellThrough);
              const badge = getSellThroughBadge(sellThrough);
              const variantLabel = [variant.size, variant.color]
                .filter(Boolean)
                .join(" / ") || "Default";

              return (
                <div key={variant.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                      flexWrap: "wrap",
                      gap: "4px",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: "500" }}>
                      {variantLabel}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text2)",
                          fontFamily: "Space Mono, monospace",
                        }}
                      >
                        {variant.sold} / {variant.sold + variant.stockLeft} sold
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text3)",
                        }}
                      >
                        {variant.stockLeft} left
                      </span>
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: "9999px",
                          fontSize: "10px",
                          fontWeight: "600",
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "700",
                          color: barColor,
                          fontFamily: "Space Mono, monospace",
                        }}
                      >
                        {sellThrough.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      height: "8px",
                      background: "var(--surface3)",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(sellThrough, 100)}%`,
                        background: barColor,
                        borderRadius: "999px",
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
