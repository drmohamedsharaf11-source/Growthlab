"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@/components/layout/Topbar";
import AlertCard from "@/components/alerts/AlertCard";
import { useClient } from "@/hooks/useClient";
import { useAlerts } from "@/hooks/useAlerts";
import { AlertData } from "@/types";

type FilterType = "all" | "critical" | "warning";

const CRITICAL_TYPES = ["OUT_OF_STOCK", "SELLTHROUGH_70"];
const WARNING_TYPES = ["SELLTHROUGH_50", "SELLTHROUGH_25"];

export default function AlertsPage() {
  const { data: session } = useSession();
  const { client } = useClient(session?.user?.clientId);
  const { alerts, loading, unreadCount, markAsRead, markAllRead, refetch } = useAlerts(
    client?.id
  );
  const [filter, setFilter] = useState<FilterType>("all");

  // Run alert check when page loads
  useEffect(() => {
    if (client?.id) {
      fetch("/api/alerts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id }),
      }).then(() => refetch());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]); // intentionally run once per client load

  const filtered = alerts.filter((a: AlertData) => {
    if (filter === "critical") return CRITICAL_TYPES.includes(a.type);
    if (filter === "warning") return WARNING_TYPES.includes(a.type);
    return true;
  });

  const criticalCount = alerts.filter((a: AlertData) =>
    CRITICAL_TYPES.includes(a.type)
  ).length;
  const warningCount = alerts.filter((a: AlertData) =>
    WARNING_TYPES.includes(a.type)
  ).length;

  return (
    <div>
      <Topbar title="Alerts" clientId={client?.id} />

      <div style={{ padding: "24px" }}>
        {/* Header with stats and actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Stats */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div
              style={{
                padding: "8px 16px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "var(--red)",
                fontWeight: "600",
              }}
            >
              {criticalCount} Critical
            </div>
            <div
              style={{
                padding: "8px 16px",
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "var(--amber)",
                fontWeight: "600",
              }}
            >
              {warningCount} Warning
            </div>
            {unreadCount > 0 && (
              <div
                style={{
                  padding: "8px 16px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "var(--text2)",
                }}
              >
                {unreadCount} unread
              </div>
            )}
          </div>

          {/* Actions */}
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text2)",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                transition: "border-color 0.15s",
              }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter tabs */}
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
          {(["all", "critical", "warning"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: filter === f ? "600" : "400",
                color: filter === f ? "var(--text)" : "var(--text2)",
                background: filter === f ? "var(--surface3)" : "transparent",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "DM Sans, sans-serif",
                textTransform: "capitalize",
              }}
            >
              {f === "all" ? `All (${alerts.length})` : f === "critical" ? `Critical (${criticalCount})` : `Warning (${warningCount})`}
            </button>
          ))}
        </div>

        {/* Alerts list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: "88px", borderRadius: "10px" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              color: "var(--text3)",
            }}
          >
            <p style={{ fontSize: "32px", margin: "0 0 12px" }}>
              {filter === "all" ? "🎉" : "✅"}
            </p>
            <p style={{ margin: 0, fontSize: "15px" }}>
              {filter === "all"
                ? "No alerts — your inventory is looking great!"
                : `No ${filter} alerts`}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((alert: AlertData) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onMarkRead={markAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
