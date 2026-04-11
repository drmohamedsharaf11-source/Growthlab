"use client";

import { AlertData } from "@/types";

interface AlertCardProps {
  alert: AlertData;
  onMarkRead?: (id: string) => void;
}

function getAlertStyle(type: string): {
  dotColor: string;
  severity: string;
  severityBg: string;
  severityColor: string;
} {
  switch (type) {
    case "OUT_OF_STOCK":
      return {
        dotColor: "#EF4444",
        severity: "Critical",
        severityBg: "rgba(239,68,68,0.15)",
        severityColor: "#EF4444",
      };
    case "SELLTHROUGH_70":
      return {
        dotColor: "#EF4444",
        severity: "Critical",
        severityBg: "rgba(239,68,68,0.15)",
        severityColor: "#EF4444",
      };
    case "SELLTHROUGH_50":
      return {
        dotColor: "#F59E0B",
        severity: "Warning",
        severityBg: "rgba(245,158,11,0.15)",
        severityColor: "#F59E0B",
      };
    case "SELLTHROUGH_25":
      return {
        dotColor: "#F59E0B",
        severity: "Warning",
        severityBg: "rgba(245,158,11,0.15)",
        severityColor: "#F59E0B",
      };
    default:
      return {
        dotColor: "#94A3B8",
        severity: "Info",
        severityBg: "rgba(148,163,184,0.15)",
        severityColor: "#94A3B8",
      };
  }
}

function formatAlertType(type: string): string {
  switch (type) {
    case "OUT_OF_STOCK": return "Out of Stock";
    case "SELLTHROUGH_70": return "70%+ Sell-Through";
    case "SELLTHROUGH_50": return "50%+ Sell-Through";
    case "SELLTHROUGH_25": return "25%+ Sell-Through";
    default: return type;
  }
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

export default function AlertCard({ alert, onMarkRead }: AlertCardProps) {
  const style = getAlertStyle(alert.type);

  return (
    <div
      style={{
        background: "var(--surface2)",
        border: `1px solid ${alert.read ? "var(--border)" : style.dotColor + "30"}`,
        borderRadius: "10px",
        padding: "14px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        opacity: alert.read ? 0.6 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {/* Colored dot */}
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: style.dotColor,
          marginTop: "5px",
          flexShrink: 0,
          boxShadow: alert.read ? "none" : `0 0 6px ${style.dotColor}80`,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "var(--text)",
            }}
          >
            {alert.productName}
          </span>
          <span style={{ fontSize: "13px", color: "var(--text2)" }}>
            {alert.variantInfo}
          </span>
        </div>

        <p
          style={{
            margin: "0 0 8px",
            fontSize: "13px",
            color: "var(--text2)",
            lineHeight: "1.5",
          }}
        >
          {alert.message}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "9999px",
              fontSize: "10px",
              fontWeight: "600",
              background: style.severityBg,
              color: style.severityColor,
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}
          >
            {style.severity}
          </span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "9999px",
              fontSize: "10px",
              fontWeight: "500",
              background: "var(--surface3)",
              color: "var(--text3)",
            }}
          >
            {formatAlertType(alert.type)}
          </span>
          <span style={{ fontSize: "11px", color: "var(--text3)" }}>
            {timeAgo(alert.createdAt)}
          </span>
        </div>
      </div>

      {/* Mark read button */}
      {!alert.read && onMarkRead && (
        <button
          onClick={() => onMarkRead(alert.id)}
          title="Mark as read"
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text3)",
            cursor: "pointer",
            padding: "4px 8px",
            fontSize: "11px",
            flexShrink: 0,
            transition: "border-color 0.15s, color 0.15s",
            fontFamily: "DM Sans, sans-serif",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text3)";
          }}
        >
          Mark read
        </button>
      )}
    </div>
  );
}
