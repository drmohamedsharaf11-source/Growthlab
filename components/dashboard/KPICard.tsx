"use client";

interface KPICardProps {
  label: string;
  value: string;
  delta?: number;
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  accentColor?: string;
}

export default function KPICard({
  label,
  value,
  delta,
  icon,
  accentColor = "var(--accent)",
}: KPICardProps) {
  const isPositive = delta !== undefined && delta >= 0;
  const deltaColor = isPositive ? "var(--green)" : "var(--red)";

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle gradient accent top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: accentColor,
          opacity: 0.7,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "500",
            color: "var(--text2)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--surface2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accentColor,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        <p
          style={{
            margin: 0,
            fontSize: "28px",
            fontWeight: "700",
            color: "var(--text)",
            fontFamily: "Space Mono, monospace",
            letterSpacing: "-0.5px",
          }}
        >
          {value}
        </p>
      </div>

      {/* Delta */}
      {delta !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              padding: "2px 7px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: "600",
              background: isPositive
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
              color: deltaColor,
              border: `1px solid ${isPositive ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
            }}
          >
            {isPositive ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
          </span>
          <span style={{ fontSize: "11px", color: "var(--text3)" }}>
            vs prev period
          </span>
        </div>
      )}
    </div>
  );
}
