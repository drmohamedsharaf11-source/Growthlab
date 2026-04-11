"use client";

import Link from "next/link";
import { useAlerts } from "@/hooks/useAlerts";
import { useSession } from "next-auth/react";
import PeriodSwitcher from "@/components/dashboard/PeriodSwitcher";
import { Period } from "@/types";

interface TopbarProps {
  title: string;
  period?: Period;
  onPeriodChange?: (period: Period) => void;
  showSync?: boolean;
  clientId?: string | null;
}

export default function Topbar({
  title,
  period,
  onPeriodChange,
  showSync = false,
  clientId,
}: TopbarProps) {
  const { data: session } = useSession();
  const { unreadCount } = useAlerts(clientId || session?.user?.clientId);

  return (
    <header
      style={{
        height: "64px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left: title + sync badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "600",
            color: "var(--text)",
            letterSpacing: "-0.3px",
          }}
        >
          {title}
        </h1>
        {showSync && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: "600",
              color: "var(--green)",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--green)",
                animation: "pulse 2s infinite",
              }}
            />
            Live
          </div>
        )}
      </div>

      {/* Right: period switcher + alerts + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {period && onPeriodChange && (
          <PeriodSwitcher period={period} onChange={onPeriodChange} />
        )}

        {/* Notification bell */}
        <Link
          href="/dashboard/alerts"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            color: "var(--text2)",
            textDecoration: "none",
            transition: "border-color 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                minWidth: "16px",
                height: "16px",
                borderRadius: "9999px",
                background: "var(--red)",
                color: "white",
                fontSize: "10px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                border: "2px solid var(--surface)",
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User avatar */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: "700",
            color: "white",
            cursor: "default",
            flexShrink: 0,
          }}
          title={session?.user?.name || ""}
        >
          {session?.user?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </header>
  );
}
