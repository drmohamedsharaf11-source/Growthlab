"use client";

import { useState } from "react";
import { CreativeData, SortField } from "@/types";
import CreativeCard from "./CreativeCard";

interface CreativesGridProps {
  creatives: CreativeData[];
  limit?: number;
}

const SORT_OPTIONS: { label: string; value: SortField }[] = [
  { label: "ROAS", value: "roas" },
  { label: "Spend", value: "spend" },
  { label: "Revenue", value: "revenue" },
  { label: "ROI", value: "roi" },
  { label: "Purchases", value: "purchases" },
];

export default function CreativesGrid({ creatives, limit }: CreativesGridProps) {
  const [sortBy, setSortBy] = useState<SortField>("roas");

  const sorted = [...creatives].sort((a, b) => b[sortBy] - a[sortBy]);
  const displayed = limit ? sorted.slice(0, limit) : sorted;

  if (displayed.length === 0) {
    return (
      <div
        style={{
          padding: "60px 24px",
          textAlign: "center",
          color: "var(--text3)",
          fontSize: "14px",
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎨</div>
        <p style={{ margin: 0 }}>No creatives found for this period</p>
      </div>
    );
  }

  return (
    <div>
      {/* Sort controls (only show when not limited) */}
      {!limit && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          <span style={{ fontSize: "13px", color: "var(--text2)" }}>Sort by:</span>
          <div
            style={{
              display: "flex",
              gap: "4px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "3px",
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: sortBy === opt.value ? "600" : "400",
                  color: sortBy === opt.value ? "var(--text)" : "var(--text2)",
                  background: sortBy === opt.value ? "var(--surface3)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: "12px", color: "var(--text3)" }}>
            {displayed.length} creatives
          </span>
        </div>
      )}

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        {displayed.map((creative, index) => (
          <CreativeCard
            key={creative.id}
            creative={creative}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
}
