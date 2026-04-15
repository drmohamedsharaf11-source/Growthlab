"use client";

import { useState } from "react";
import { ClientData } from "@/types";

interface ClientsTableProps {
  clients: ClientData[];
  onEdit: (client: ClientData) => void;
  onDelete: (clientId: string) => void;
  onToggleStatus: (clientId: string, currentStatus: string) => void;
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: "rgba(34,197,94,0.15)", color: "#22C55E" },
    PAUSED: { bg: "rgba(245,158,11,0.15)", color: "#F59E0B" },
    INACTIVE: { bg: "rgba(71,85,105,0.2)", color: "#475569" },
  };
  const s = styles[status] || styles.INACTIVE;

  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: "0.3px",
        background: s.bg,
        color: s.color,
      }}
    >
      {status.toLowerCase()}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const isMetaOrTiktok = platform === "META" || platform === "TIKTOK";
  return (
    <span
      style={{
        padding: "2px 7px",
        borderRadius: "4px",
        fontSize: "10px",
        fontWeight: "600",
        background: platform === "META" ? "rgba(79,110,247,0.15)" : "rgba(17,19,24,0.8)",
        color: platform === "META" ? "#4F6EF7" : "#F1F5F9",
        border: `1px solid ${platform === "META" ? "rgba(79,110,247,0.3)" : "rgba(255,255,255,0.15)"}`,
      }}
    >
      {platform}
    </span>
  );
}

function ShopifyConnectButton({
  clientId,
  domain,
  connected,
  onEdit,
}: {
  clientId: string;
  domain: string | null;
  connected: boolean;
  onEdit: () => void;
}) {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopifyToken: null, shopifyDomain: null }),
      });
      window.location.reload();
    } catch {
      setDisconnecting(false);
    }
  }

  if (connected && domain) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span
          style={{
            fontSize: "11px",
            color: "var(--green)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--green)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {domain.replace(".myshopify.com", "")}
        </span>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          title="Disconnect Shopify"
          style={{
            background: "transparent",
            border: "1px solid rgba(239,68,68,0.35)",
            borderRadius: "4px",
            color: "var(--red)",
            fontSize: "10px",
            cursor: disconnecting ? "not-allowed" : "pointer",
            padding: "2px 6px",
            fontFamily: "DM Sans, sans-serif",
            whiteSpace: "nowrap",
            opacity: disconnecting ? 0.6 : 1,
          }}
        >
          {disconnecting ? "…" : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <a
      href={`/api/shopify/auth?clientId=${encodeURIComponent(clientId)}`}
      style={{
        background: "transparent",
        border: "1px dashed var(--border)",
        borderRadius: "4px",
        color: "var(--text3)",
        fontSize: "11px",
        cursor: "pointer",
        padding: "3px 8px",
        fontFamily: "DM Sans, sans-serif",
        whiteSpace: "nowrap",
        textDecoration: "none",
        display: "inline-block",
      }}
    >
      + Connect Shopify
    </a>
  );
}

export default function ClientsTable({
  clients,
  onEdit,
  onDelete,
  onToggleStatus,
}: ClientsTableProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (clients.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 24px",
          color: "var(--text3)",
        }}
      >
        <p style={{ fontSize: "32px", margin: "0 0 12px" }}>🏢</p>
        <p>No clients yet. Add your first client above.</p>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 120px",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface3)",
            gap: "12px",
          }}
        >
          {["Client", "Store", "Platforms", "Schedule", "Status", "Actions"].map((h) => (
            <span
              key={h}
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        {clients.map((client) => {
          const platforms = client.adAccounts?.map((a) => a.platform) || [];

          return (
            <div
              key={client.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 120px",
                padding: "14px 16px",
                borderBottom: "1px solid var(--border)",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 2px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "var(--text)",
                  }}
                >
                  {client.name}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    color: "var(--text3)",
                  }}
                >
                  {client.users?.length || 0} users
                </p>
              </div>

              <ShopifyConnectButton
                clientId={client.id}
                domain={client.shopifyDomain}
                connected={
                  typeof client.shopifyToken === 'string' && client.shopifyToken !== '' &&
                  typeof client.shopifyDomain === 'string' && client.shopifyDomain !== ''
                }
                onEdit={() => onEdit(client)}
              />

              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {platforms.length > 0 ? (
                  platforms.map((p) => <PlatformBadge key={p} platform={p} />)
                ) : (
                  <span style={{ fontSize: "12px", color: "var(--text3)" }}>None</span>
                )}
              </div>

              <p style={{ margin: 0, fontSize: "12px", color: "var(--text2)" }}>
                {client.reportFrequency.replace(/_/g, " + ").toLowerCase()}
              </p>

              <StatusPill status={client.status} />

              {/* Actions */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {/* Toggle status */}
                <button
                  onClick={() => onToggleStatus(client.id, client.status)}
                  title={client.status === "ACTIVE" ? "Pause" : "Activate"}
                  style={{
                    width: "28px",
                    height: "28px",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text3)",
                    transition: "all 0.15s",
                  }}
                >
                  {client.status === "ACTIVE" ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>

                {/* Edit */}
                <button
                  onClick={() => onEdit(client)}
                  title="Edit"
                  style={{
                    width: "28px",
                    height: "28px",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text3)",
                    transition: "all 0.15s",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>

                {/* Delete */}
                <button
                  onClick={() => setDeleteConfirm(client.id)}
                  title="Remove"
                  style={{
                    width: "28px",
                    height: "28px",
                    background: "transparent",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--red)",
                    transition: "all 0.15s",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "400px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "var(--text)" }}>
              Remove client?
            </h3>
            <p style={{ margin: "0 0 24px", fontSize: "14px", color: "var(--text2)" }}>
              This will permanently delete the client and all associated data
              (creatives, products, alerts). This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: "9px 18px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text2)",
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                style={{
                  padding: "9px 18px",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.4)",
                  borderRadius: "8px",
                  color: "var(--red)",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                Remove Client
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
