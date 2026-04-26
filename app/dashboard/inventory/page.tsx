"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@/components/layout/Topbar";
import ClientSwitcher from "@/components/layout/ClientSwitcher";
import SellThroughList from "@/components/inventory/SellThroughList";
import RestockCalculator from "@/components/inventory/RestockCalculator";
import DateRangePicker, { DateRange } from "@/components/ui/DateRangePicker";
import { useClient } from "@/hooks/useClient";
import { ProductData } from "@/types";

type ViewType = "sellthrough" | "restock" | "revenue";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function defaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { startDate: toDateStr(start), endDate: toDateStr(end) };
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M EGP`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K EGP`;
  return `${val.toFixed(0)} EGP`;
}

export default function InventoryPage() {
  const { data: session } = useSession();
  const { client, clients, setClient } = useClient(session?.user?.clientId);
  const [view, setView] = useState<ViewType>("sellthrough");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [revenueProducts, setRevenueProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [revLoading, setRevLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);

  const fetchProducts = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?period=MONTHLY&clientId=${client.id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  const fetchRevenue = useCallback(async () => {
    if (!client?.id) return;
    setRevLoading(true);
    try {
      const params = new URLSearchParams({
        clientId: client.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const res = await fetch(`/api/inventory?${params}`);
      if (!res.ok) throw new Error("Failed to load revenue");
      const data = await res.json();
      setRevenueProducts(data.products || []);
    } catch {
      // fail silently
    } finally {
      setRevLoading(false);
    }
  }, [client?.id, dateRange]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (view === "revenue") fetchRevenue();
  }, [view, fetchRevenue]);

  const sortedProducts = [...products].sort((a, b) => b.totalSold - a.totalSold);

  const totalRevenue = revenueProducts.reduce((s, p) => s + p.revenue, 0);

  return (
    <div>
      <Topbar title="Inventory" clientId={client?.id} />

      <div style={{ padding: "24px" }}>
        {session?.user?.role === "ADMIN" && clients.length > 1 && (
          <div style={{ marginBottom: "20px" }}>
            <ClientSwitcher clients={clients} selectedClient={client} onSelect={setClient} />
          </div>
        )}

        {/* View toggle */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "24px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "3px",
            width: "fit-content",
          }}
        >
          {(
            [
              { key: "sellthrough", label: "Sell-Through Tracker" },
              { key: "restock", label: "Restock Calculator" },
              { key: "revenue", label: "Revenue by Date" },
            ] as { key: ViewType; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: view === key ? "600" : "400",
                color: view === key ? "var(--text)" : "var(--text2)",
                background: view === key ? "var(--surface3)" : "transparent",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && view !== "revenue" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "180px", borderRadius: "12px" }} />
            ))}
          </div>
        ) : view === "sellthrough" ? (
          <>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text2)" }}>
              Sell-through rates for your top 4 bestselling products. Restock when a variant reaches 70%+.
            </p>
            <SellThroughList products={sortedProducts} />
          </>
        ) : view === "restock" ? (
          <>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text2)" }}>
              Enter the total number of pieces to restock. The calculator distributes units based on historical sales ratios.
            </p>
            <RestockCalculator products={sortedProducts} />
          </>
        ) : (
          <RevenueView
            products={revenueProducts}
            loading={revLoading}
            totalRevenue={totalRevenue}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        )}
      </div>
    </div>
  );
}

interface RevenueViewProps {
  products: ProductData[];
  loading: boolean;
  totalRevenue: number;
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
}

function RevenueView({ products, loading, totalRevenue, dateRange, onDateRangeChange }: RevenueViewProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text2)" }}>
          Shopify revenue per product for the selected period.
        </p>
        <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "64px", borderRadius: "10px" }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            color: "var(--text3)",
            background: "var(--surface2)",
            borderRadius: "12px",
            border: "1px solid var(--border)",
          }}
        >
          No orders found for this period. Sync Shopify to populate order data.
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
              padding: "12px 16px",
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "10px",
              fontSize: "13px",
              color: "var(--text2)",
            }}
          >
            <span>Total Shopify revenue:</span>
            <span style={{ fontWeight: "700", color: "var(--text)", fontFamily: "Space Mono, monospace" }}>
              {formatCurrency(totalRevenue)}
            </span>
            <span style={{ color: "var(--text3)" }}>
              across {products.filter((p) => p.revenue > 0).length} products
            </span>
          </div>

          {/* Product table */}
          <div
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 120px",
                padding: "10px 16px",
                borderBottom: "1px solid var(--border)",
                fontSize: "11px",
                fontWeight: "600",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <span>Product</span>
              <span style={{ textAlign: "right" }}>Units</span>
              <span style={{ textAlign: "right" }}>Revenue</span>
            </div>

            {products.map((product, idx) => (
              <div key={product.id}>
                {/* Product row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 120px",
                    padding: "12px 16px",
                    borderBottom:
                      idx < products.length - 1 ? "1px solid var(--border)" : "none",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text)" }}>
                    {product.name}
                  </span>
                  <span
                    style={{
                      textAlign: "right",
                      fontSize: "13px",
                      color: "var(--text2)",
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    {product.totalSold}
                  </span>
                  <span
                    style={{
                      textAlign: "right",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: product.revenue > 0 ? "var(--text)" : "var(--text3)",
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    {formatCurrency(product.revenue)}
                  </span>
                </div>

                {/* Variant breakdown (only for products with sales) */}
                {product.revenue > 0 &&
                  product.variants
                    .filter((v) => v.sold > 0)
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((variant) => {
                      const label =
                        [variant.size, variant.color].filter(Boolean).join(" / ") || "Default";
                      return (
                        <div
                          key={variant.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 80px 120px",
                            padding: "6px 16px 6px 32px",
                            borderBottom: "1px solid var(--border)",
                            alignItems: "center",
                            background: "var(--surface)",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "var(--text3)" }}>{label}</span>
                          <span
                            style={{
                              textAlign: "right",
                              fontSize: "12px",
                              color: "var(--text3)",
                              fontFamily: "Space Mono, monospace",
                            }}
                          >
                            {variant.sold}
                          </span>
                          <span
                            style={{
                              textAlign: "right",
                              fontSize: "12px",
                              color: "var(--text2)",
                              fontFamily: "Space Mono, monospace",
                            }}
                          >
                            {formatCurrency(variant.revenue)}
                          </span>
                        </div>
                      );
                    })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
