"use client";

import { CreativeData } from "@/types";

interface CreativeCardProps {
  creative: CreativeData;
  rank: number;
}

function getRoasBadgeStyle(roas: number): { background: string; color: string; label: string } {
  if (roas >= 8) return { background: "rgba(245,158,11,0.2)", color: "#F59E0B", label: `${roas.toFixed(1)}x` };
  if (roas >= 5) return { background: "rgba(34,197,94,0.2)", color: "#22C55E", label: `${roas.toFixed(1)}x` };
  if (roas >= 4) return { background: "rgba(79,110,247,0.2)", color: "#4F6EF7", label: `${roas.toFixed(1)}x` };
  return { background: "rgba(71,85,105,0.3)", color: "#94A3B8", label: `${roas.toFixed(1)}x` };
}

function formatCurrency(val: number): string {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return val.toFixed(0);
}

function formatNumber(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toString();
}

export default function CreativeCard({ creative, rank }: CreativeCardProps) {
  const roasBadge = getRoasBadgeStyle(creative.roas);
  const platformColor = creative.platform === "META" ? "#4F6EF7" : "#0A0B0F";
  const platformBorder =
    creative.platform === "META"
      ? "rgba(79,110,247,0.4)"
      : "rgba(255,255,255,0.2)";

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        background: "var(--surface2)",
        aspectRatio: "4/5",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.2s, transform 0.2s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border2)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Thumbnail background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: creative.thumbnailUrl
            ? `url(${creative.thumbnailUrl})`
            : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: creative.thumbnailUrl ? "transparent" : "var(--surface3)",
        }}
      />

      {/* Gradient overlay for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(10,11,15,0.4) 0%, transparent 40%, rgba(10,11,15,0.95) 75%, rgba(10,11,15,1) 100%)",
        }}
      />

      {/* Top badges */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          right: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {/* Rank badge */}
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "rgba(10,11,15,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: "700",
            color: rank <= 3 ? "#F59E0B" : "var(--text2)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          #{rank}
        </div>

        {/* ROAS badge */}
        <div
          style={{
            padding: "4px 10px",
            borderRadius: "8px",
            background: roasBadge.background,
            backdropFilter: "blur(8px)",
            fontSize: "13px",
            fontWeight: "700",
            color: roasBadge.color,
            border: `1px solid ${roasBadge.color}40`,
            fontFamily: "Space Mono, monospace",
          }}
        >
          {roasBadge.label}
        </div>
      </div>

      {/* Bottom content: frosted metrics */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px",
        }}
      >
        {/* Ad name */}
        <p
          style={{
            margin: "0 0 4px",
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {creative.name}
        </p>
        {creative.campaignName && (
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "11px",
              color: "var(--text2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {creative.campaignName}
          </p>
        )}

        {/* Platform tag */}
        <div style={{ marginBottom: "10px" }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "600",
              background: platformColor,
              color: "white",
              border: `1px solid ${platformBorder}`,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {creative.platform}
          </span>
        </div>

        {/* Metric grid - frosted glass */}
        <div
          style={{
            background: "rgba(17,19,24,0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "10px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
          }}
        >
          {[
            { label: "Spend", value: `${formatCurrency(creative.spend)} EGP` },
            { label: "Revenue", value: `${formatCurrency(creative.revenue)} EGP` },
            { label: "Purchases", value: formatNumber(creative.purchases) },
            { label: "CTR", value: `${creative.ctr.toFixed(1)}%` },
            { label: "CPA", value: `${formatCurrency(creative.cpa)}` },
            { label: "ROI", value: `${creative.roi.toFixed(0)}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "9px",
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                  marginBottom: "2px",
                }}
              >
                {label}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "var(--text)",
                  fontFamily: "Space Mono, monospace",
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
