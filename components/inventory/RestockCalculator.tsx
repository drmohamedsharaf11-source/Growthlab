"use client";

import { useState, useCallback } from "react";
import { ProductData } from "@/types";
import { calculateRestockUnits } from "@/lib/sellthrough";

interface RestockCalculatorProps {
  products: ProductData[];
}

export default function RestockCalculator({ products }: RestockCalculatorProps) {
  const topProducts = products.slice(0, 4);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    topProducts[0]?.id || ""
  );
  const [totalRestock, setTotalRestock] = useState<number>(100);

  const selectedProduct = topProducts.find((p) => p.id === selectedProductId);

  const calculateRatios = useCallback(() => {
    if (!selectedProduct || selectedProduct.variants.length === 0) return [];
    return calculateRestockUnits(selectedProduct.variants, totalRestock);
  }, [selectedProduct, totalRestock]);

  const ratios = calculateRatios();

  if (topProducts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "var(--text3)" }}>
        No product data available
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px",
      }}
    >
      {/* Product tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {topProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => setSelectedProductId(product.id)}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: selectedProductId === product.id ? "600" : "400",
              color: selectedProductId === product.id ? "var(--text)" : "var(--text2)",
              background:
                selectedProductId === product.id
                  ? "var(--surface3)"
                  : "transparent",
              border:
                selectedProductId === product.id
                  ? "1px solid var(--border2)"
                  : "1px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {product.name}
          </button>
        ))}
      </div>

      {selectedProduct && (
        <>
          {/* Historical distribution */}
          <div style={{ marginBottom: "20px" }}>
            <h4
              style={{
                margin: "0 0 12px",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text2)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Sales Distribution
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                gap: "8px",
              }}
            >
              {ratios.map((r) => (
                <div
                  key={r.size}
                  style={{
                    background: "var(--surface3)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "10px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 4px",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "var(--text)",
                    }}
                  >
                    {r.size}
                  </p>
                  <p
                    style={{
                      margin: "0 0 2px",
                      fontSize: "12px",
                      color: "var(--accent)",
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    {r.percentage.toFixed(0)}%
                  </p>
                  <p
                    style={{
                      margin: "0 0 2px",
                      fontSize: "11px",
                      color: "var(--text3)",
                    }}
                  >
                    {r.sold} sold
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      color: "var(--text2)",
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    1:{r.ratio === 1 ? "—" : r.ratio}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Restock input */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: "var(--text2)",
                marginBottom: "8px",
              }}
            >
              How many pieces to restock?
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={totalRestock}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setTotalRestock(Math.max(0, val));
              }}
              style={{
                width: "200px",
                padding: "10px 14px",
                fontSize: "16px",
                fontFamily: "Space Mono, monospace",
                fontWeight: "600",
              }}
            />
          </div>

          {/* Restock result */}
          {totalRestock > 0 && ratios.length > 0 && (
            <div>
              <h4
                style={{
                  margin: "0 0 12px",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--text2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Restock Breakdown — {totalRestock} units
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                  gap: "10px",
                }}
              >
                {ratios.map((r) => (
                  <div
                    key={r.size}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border2)",
                      borderRadius: "10px",
                      padding: "14px",
                      textAlign: "center",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "2px",
                        background: "var(--accent)",
                        opacity: 0.7,
                      }}
                    />
                    <p
                      style={{
                        margin: "0 0 6px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "var(--text2)",
                      }}
                    >
                      {r.size}
                    </p>
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "var(--text)",
                        fontFamily: "Space Mono, monospace",
                      }}
                    >
                      {r.restockUnits}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        color: "var(--text3)",
                      }}
                    >
                      {r.percentage.toFixed(0)}% of order
                    </p>
                  </div>
                ))}
              </div>

              {/* Verify total */}
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 14px",
                  background: "var(--surface3)",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                }}
              >
                <span style={{ color: "var(--text2)" }}>Total units:</span>
                <span
                  style={{
                    color: "var(--text)",
                    fontWeight: "700",
                    fontFamily: "Space Mono, monospace",
                  }}
                >
                  {ratios.reduce((s, r) => s + r.restockUnits, 0)} / {totalRestock}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
