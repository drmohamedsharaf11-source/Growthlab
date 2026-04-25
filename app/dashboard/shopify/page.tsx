"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@/components/layout/Topbar";
import ClientSwitcher from "@/components/layout/ClientSwitcher";
import ProductsTable from "@/components/shopify/ProductsTable";
import VariantsTable from "@/components/shopify/VariantsTable";
import { useClient } from "@/hooks/useClient";
import { ProductData } from "@/types";

type TabType = "products" | "variants";

function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ShopifyPage() {
  const { data: session } = useSession();
  const { client, clients, setClient } = useClient(session?.user?.clientId);
  const [tab, setTab] = useState<TabType>("products");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | Date | null | undefined>(undefined);

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

  // Seed lastSyncedAt from client data on load
  useEffect(() => {
    if (client?.lastShopifySyncAt !== undefined) {
      setLastSyncedAt(client.lastShopifySyncAt);
    }
  }, [client?.lastShopifySyncAt]);

  async function syncShopify() {
    if (!client?.id) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/sync/shopify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = await res.json();
      if (data.lastShopifySyncAt) setLastSyncedAt(data.lastShopifySyncAt);
      await fetchProducts();
    } finally {
      setSyncing(false);
    }
  }

  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0);
  const totalSold = products.reduce((s, p) => s + p.totalSold, 0);

  return (
    <div>
      <Topbar title="Shopify Reports" clientId={client?.id} />

      <div style={{ padding: "24px" }}>
        {/* Client switcher (admin only) */}
        {session?.user?.role === "ADMIN" && clients.length > 1 && (
          <div style={{ marginBottom: "20px" }}>
            <ClientSwitcher clients={clients} selectedClient={client} onSelect={setClient} />
          </div>
        )}

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Products</span>
            <span style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)", fontFamily: "Space Mono, monospace" }}>
              {products.length}
            </span>
          </div>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Units Sold</span>
            <span style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)", fontFamily: "Space Mono, monospace" }}>
              {totalSold.toLocaleString()}
            </span>
          </div>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Revenue</span>
            <span style={{ fontSize: "22px", fontWeight: "700", color: "var(--text)", fontFamily: "Space Mono, monospace" }}>
              {(totalRevenue / 1000).toFixed(0)}K EGP
            </span>
          </div>

          {/* Sync button + last synced */}
          <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
            <button
              onClick={syncShopify}
              disabled={syncing}
              style={{
                padding: "10px 18px",
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: "8px",
                color: "var(--green)",
                fontSize: "13px",
                fontWeight: "600",
                cursor: syncing ? "not-allowed" : "pointer",
                fontFamily: "DM Sans, sans-serif",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: syncing ? 0.6 : 1,
              }}
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={syncing ? { animation: "spin 1s linear infinite" } : undefined}
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.79" />
              </svg>
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            <span style={{ fontSize: "11px", color: "var(--text3)" }}>
              {syncing ? "Syncing…" : `Last synced: ${formatRelativeTime(lastSyncedAt)}`}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "20px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "3px",
            width: "fit-content",
          }}
        >
          {(["products", "variants"] as TabType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: tab === t ? "600" : "400",
                color: tab === t ? "var(--text)" : "var(--text2)",
                background: tab === t ? "var(--surface3)" : "transparent",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "DM Sans, sans-serif",
                textTransform: "capitalize",
              }}
            >
              By {t === "products" ? "Product" : "Variant"}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: "72px", borderRadius: "10px" }} />
            ))}
          </div>
        ) : tab === "products" ? (
          <ProductsTable products={products} />
        ) : (
          <VariantsTable products={products} />
        )}
      </div>
    </div>
  );
}
