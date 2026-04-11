"use client";

import { ProductData } from "@/types";

interface ProductsTableProps {
  products: ProductData[];
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  }).format(val);
}

export default function ProductsTable({ products }: ProductsTableProps) {
  if (products.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--text3)" }}>
        <p>No product data available</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...products.map((p) => p.revenue), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {products.map((product, index) => {
        const barWidth = (product.revenue / maxRevenue) * 100;
        const colors = [
          "#4F6EF7",
          "#7C3AED",
          "#06B6D4",
          "#22C55E",
          "#F59E0B",
        ];
        const color = colors[index % colors.length];

        return (
          <div
            key={product.id}
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {/* Rank */}
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "var(--surface3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "700",
                color: index < 3 ? "#F59E0B" : "var(--text2)",
                flexShrink: 0,
              }}
            >
              #{index + 1}
            </div>

            {/* Product info + bar */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  gap: "12px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {product.name}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    flexShrink: 0,
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "var(--text2)" }}>
                    {product.variants.length} variants
                  </span>
                  <span
                    style={{
                      color: "var(--text)",
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    {product.totalSold} sold
                  </span>
                  <span
                    style={{
                      color: "var(--text)",
                      fontWeight: "600",
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              </div>

              {/* Revenue bar */}
              <div
                style={{
                  height: "4px",
                  background: "var(--surface3)",
                  borderRadius: "999px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barWidth}%`,
                    background: color,
                    borderRadius: "999px",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
