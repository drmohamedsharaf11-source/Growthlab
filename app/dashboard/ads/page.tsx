"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@/components/layout/Topbar";
import CreativesGrid from "@/components/creatives/CreativesGrid";
import { usePeriod } from "@/hooks/usePeriod";
import { useClient } from "@/hooks/useClient";
import { CreativeData, Period } from "@/types";

export default function AdsPage() {
  const { data: session } = useSession();
  const { period, setPeriod } = usePeriod("MONTHLY");
  const { client } = useClient(session?.user?.clientId);
  const [creatives, setCreatives] = useState<CreativeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchCreatives = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/creatives?period=${period}&clientId=${client.id}`
      );
      if (!res.ok) throw new Error("Failed to load creatives");
      const data: CreativeData[] = await res.json();
      setCreatives(data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [client?.id, period]);

  useEffect(() => {
    fetchCreatives();
  }, [fetchCreatives]);

  async function syncPlatform(platform: "meta" | "tiktok") {
    if (!client?.id || syncing) return;
    setSyncing(platform);
    setSyncMessage(null);
    try {
      const res = await fetch(`/api/sync/${platform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`✓ Synced ${data.synced || 0} ${platform === "meta" ? "Meta" : "TikTok"} creatives`);
        await fetchCreatives();
      } else {
        setSyncMessage(`⚠ ${data.error || "Sync failed"}`);
      }
    } catch {
      setSyncMessage("⚠ Sync failed — check credentials");
    } finally {
      setSyncing(null);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  }

  return (
    <div>
      <Topbar
        title="Ad Creatives"
        period={period}
        onPeriodChange={(p: Period) => setPeriod(p)}
        showSync={!loading && creatives.length > 0}
        clientId={client?.id}
      />

      <div style={{ padding: "24px" }}>
        {/* Sync controls */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "24px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => syncPlatform("meta")}
            disabled={!!syncing}
            style={{
              padding: "8px 16px",
              background: "rgba(79,110,247,0.12)",
              border: "1px solid rgba(79,110,247,0.35)",
              borderRadius: "8px",
              color: "var(--accent)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: syncing ? "not-allowed" : "pointer",
              fontFamily: "DM Sans, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: syncing === "meta" ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {syncing === "meta" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.79" />
              </svg>
            )}
            {syncing === "meta" ? "Syncing Meta..." : "Sync Meta"}
          </button>

          <button
            onClick={() => syncPlatform("tiktok")}
            disabled={!!syncing}
            style={{
              padding: "8px 16px",
              background: "rgba(6,182,212,0.08)",
              border: "1px solid rgba(6,182,212,0.3)",
              borderRadius: "8px",
              color: "var(--cyan)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: syncing ? "not-allowed" : "pointer",
              fontFamily: "DM Sans, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: syncing === "tiktok" ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {syncing === "tiktok" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.79" />
              </svg>
            )}
            {syncing === "tiktok" ? "Syncing TikTok..." : "Sync TikTok"}
          </button>

          {syncMessage && (
            <span
              style={{
                fontSize: "13px",
                color: syncMessage.startsWith("✓") ? "var(--green)" : "var(--amber)",
                padding: "6px 12px",
                background: syncMessage.startsWith("✓")
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(245,158,11,0.1)",
                borderRadius: "6px",
                border: `1px solid ${syncMessage.startsWith("✓") ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
              }}
            >
              {syncMessage}
            </span>
          )}

          {!loading && creatives.length > 0 && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: "12px",
                color: "var(--text3)",
              }}
            >
              {creatives.length} creatives • sorted by ROAS
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: "340px", borderRadius: "12px" }}
              />
            ))}
          </div>
        ) : creatives.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              color: "var(--text3)",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎨</div>
            <p style={{ margin: "0 0 8px", fontSize: "16px", color: "var(--text2)" }}>
              No creatives found for this period
            </p>
            <p style={{ margin: 0, fontSize: "13px" }}>
              Try syncing Meta or TikTok data, or select a different time period.
            </p>
          </div>
        ) : (
          <CreativesGrid creatives={creatives} />
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
