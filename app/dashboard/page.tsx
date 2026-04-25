"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@/components/layout/Topbar";
import ClientSwitcher from "@/components/layout/ClientSwitcher";
import KPICard from "@/components/dashboard/KPICard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import ROASChart from "@/components/dashboard/ROASChart";
import CreativesGrid from "@/components/creatives/CreativesGrid";
import { usePeriod } from "@/hooks/usePeriod";
import { useClient } from "@/hooks/useClient";
import { Period, KPIData, CreativeData, ProductData } from "@/types";

interface DashboardData {
  kpis: KPIData;
  revenueChart: Array<{ date: string; revenue: number; adSpend: number }>;
  roasByPlatform: Array<{ platform: string; roas: number }>;
  topCreatives: CreativeData[];
  products: ProductData[];
}

function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatCurrency(val: number): string {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M EGP`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K EGP`;
  return `${val.toFixed(0)} EGP`;
}

function formatRoas(val: number): string {
  return `${val.toFixed(2)}x`;
}

function formatPercent(val: number): string {
  return `${val.toFixed(2)}%`;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { period, setPeriod } = usePeriod("WEEKLY");
  const { client, clients, loading: clientLoading, setClient } = useClient(
    session?.user?.clientId
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/dashboard?period=${period}&clientId=${client.id}`
      );
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [client?.id, period]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
  };

  if (clientLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          color: "var(--text2)",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div>
      <Topbar
        title="Overview"
        period={period}
        onPeriodChange={handlePeriodChange}
        showSync={true}
        clientId={client?.id}
      />

      <div style={{ padding: "24px" }}>
        {/* Client switcher (admin only) */}
        {session?.user?.role === "ADMIN" && clients.length > 1 && (
          <div style={{ marginBottom: "20px" }}>
            <ClientSwitcher
              clients={clients}
              selectedClient={client}
              onSelect={setClient}
            />
          </div>
        )}

        {!client && !loading && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              color: "var(--text3)",
            }}
          >
            <p style={{ fontSize: "32px", margin: "0 0 12px" }}>🏢</p>
            <p>No client data found. Add a client in the Admin section.</p>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px",
              color: "var(--red)",
              fontSize: "14px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {/* Shopify sync freshness */}
        {client && !loading && (
          <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
                background: client.lastShopifySyncAt ? "var(--green)" : "var(--text3)",
              }}
            />
            <span style={{ fontSize: "12px", color: "var(--text3)" }}>
              Shopify — Last synced:{" "}
              <strong style={{ color: "var(--text2)" }}>
                {client.lastShopifySyncAt ? formatRelativeTime(client.lastShopifySyncAt) : "Never"}
              </strong>
            </span>
          </div>
        )}

        {/* No-ads empty state */}
        {client && !loading && data && data.kpis.adSpend === 0 && data.topCreatives.length === 0 && (
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(99,102,241,0.07)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "10px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "13px",
              color: "var(--text2)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              Connect Meta or TikTok Ads to see revenue and ROAS metrics.
              {data.products.length > 0 && (
                <> You have <strong style={{ color: "var(--text)" }}>{data.products.length} products</strong> synced from Shopify.</>
              )}
            </span>
          </div>
        )}

        {client && (
          <>
            {/* KPI Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{ height: "130px", borderRadius: "12px" }}
                  />
                ))
              ) : (
                <>
                  <KPICard
                    label="Total Revenue"
                    value={formatCurrency(data?.kpis.totalRevenue || 0)}
                    delta={data?.kpis.revenueDelta}
                    accentColor="var(--accent)"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    }
                  />
                  <KPICard
                    label="Ad Spend"
                    value={formatCurrency(data?.kpis.adSpend || 0)}
                    delta={data?.kpis.adSpendDelta}
                    accentColor="var(--accent2)"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    }
                  />
                  <KPICard
                    label="ROAS"
                    value={formatRoas(data?.kpis.roas || 0)}
                    delta={data?.kpis.roasDelta}
                    accentColor="var(--amber)"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                    }
                  />
                  <KPICard
                    label="Conversion Rate"
                    value={formatPercent(data?.kpis.conversionRate || 0)}
                    delta={data?.kpis.conversionDelta}
                    accentColor="var(--green)"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    }
                  />
                </>
              )}
            </div>

            {/* Charts row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 20px",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "var(--text)",
                  }}
                >
                  Revenue vs Ad Spend
                </h3>
                {loading ? (
                  <div className="skeleton" style={{ height: "240px" }} />
                ) : (
                  <RevenueChart data={data?.revenueChart || []} />
                )}
              </div>

              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 20px",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "var(--text)",
                  }}
                >
                  ROAS by Platform
                </h3>
                {loading ? (
                  <div className="skeleton" style={{ height: "200px" }} />
                ) : (
                  <ROASChart data={data?.roasByPlatform || []} />
                )}
              </div>
            </div>

            {/* Top Creatives */}
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "var(--text)",
                  }}
                >
                  Top 5 Ad Creatives
                </h3>
                <a
                  href="/dashboard/ads"
                  style={{
                    fontSize: "13px",
                    color: "var(--accent)",
                    textDecoration: "none",
                  }}
                >
                  View all →
                </a>
              </div>

              {loading ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "12px",
                  }}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: "280px", borderRadius: "12px" }}
                    />
                  ))}
                </div>
              ) : (
                <CreativesGrid creatives={data?.topCreatives || []} limit={5} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
