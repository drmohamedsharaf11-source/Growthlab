"use client";

import { ProductData } from "@/types";
import { computeSellThrough } from "@/lib/sellthrough";

interface VariantsTableProps {
  products: ProductData[];
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  }).format(val);
}

function getSellThroughColor(pct: number): string {
  if (pct >= 90) return "#EF4444";
  if (pct >= 70) return "#F59E0B";
  return "#22C55E";
}

export default function VariantsTable({ products }: VariantsTableProps) {
  const allVariants = products.flatMap((product) =>
    product.variants.map((variant) => ({
      ...variant,
      productName: product.name,
      sellThrough: computeSellThrough(variant),
    }))
  );

  if (allVariants.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--text3)" }}>
        <p>No variant data available</p>
      </div>
    );
  }

  const sorted = [...allVariants].sort((a, b) => b.sellThrough - a.sellThrough);

  return (
    <div
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Table header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr 1fr",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface3)",
          gap: "12px",
        }}
      >
        {["Product", "Size", "Color", "Sell-Through", "Sold", "Stock"].map((h) => (
          <span
            key={h}
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {sorted.map((variant) => {
        const stColor = getSellThroughColor(variant.sellThrough);
        const isLowStock = variant.stockLeft <= 5;

        return (
          <div
            key={variant.id}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr 1fr",
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "var(--text)",
                fontWeight: "500",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {variant.productName}
            </span>

            <span style={{ fontSize: "13px", color: "var(--text2)" }}>
              {variant.size || "—"}
            </span>

            <span style={{ fontSize: "13px", color: "var(--text2)" }}>
              {variant.color || "—"}
            </span>

            {/* Sell-through bar */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: stColor,
                    fontFamily: "Space Mono, monospace",
                  }}
                >
                  {variant.sellThrough.toFixed(0)}%
                </span>
              </div>
              <div
                style={{
                  height: "5px",
                  background: "var(--surface3)",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(variant.sellThrough, 100)}%`,
                    background: stColor,
                    borderRadius: "999px",
                  }}
                />
              </div>
            </div>

            <span
              style={{
                fontSize: "13px",
                color: "var(--text)",
                fontFamily: "Space Mono, monospace",
              }}
            >
              {variant.sold}
            </span>

            <span
              style={{
                fontSize: "13px",
                fontWeight: isLowStock ? "700" : "400",
                color: isLowStock ? "var(--red)" : "var(--text)",
                fontFamily: "Space Mono, monospace",
              }}
            >
              {variant.stockLeft}
            </span>
          </div>
        );
      })}
    </div>
  );
}
