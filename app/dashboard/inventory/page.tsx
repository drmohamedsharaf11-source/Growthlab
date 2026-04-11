"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@/components/layout/Topbar";
import SellThroughList from "@/components/inventory/SellThroughList";
import RestockCalculator from "@/components/inventory/RestockCalculator";
import { useClient } from "@/hooks/useClient";
import { ProductData } from "@/types";

type ViewType = "sellthrough" | "restock";

export default function InventoryPage() {
  const { data: session } = useSession();
  const { client } = useClient(session?.user?.clientId);
  const [view, setView] = useState<ViewType>("sellthrough");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sort by totalSold for top products
  const sortedProducts = [...products].sort((a, b) => b.totalSold - a.totalSold);

  return (
    <div>
      <Topbar title="Inventory" clientId={client?.id} />

      <div style={{ padding: "24px" }}>
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

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: "180px", borderRadius: "12px" }}
              />
            ))}
          </div>
        ) : view === "sellthrough" ? (
          <>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text2)" }}>
              Sell-through rates for your top 4 bestselling products. Restock when a variant reaches 70%+.
            </p>
            <SellThroughList products={sortedProducts} />
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--text2)" }}>
              Enter the total number of pieces to restock. The calculator distributes units based on historical sales ratios.
            </p>
            <RestockCalculator products={sortedProducts} />
          </>
        )}
      </div>
    </div>
  );
}
