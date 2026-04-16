"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import AddClientForm from "@/components/admin/AddClientForm";
import ClientsTable from "@/components/admin/ClientsTable";
import { ClientData } from "@/types";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editClient, setEditClient] = useState<ClientData | null>(null);
  const [shopifyBanner, setShopifyBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ clientName: "", email: "" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ inviteUrl: string; email: string } | null>(null);
  const [inviteError, setInviteError] = useState("");

  // Handle Shopify OAuth redirect result
  useEffect(() => {
    const shopify = searchParams.get("shopify");
    const shop = searchParams.get("shop");
    const msg = searchParams.get("msg");

    if (shopify === "connected" && shop) {
      setShopifyBanner({
        type: "success",
        message: `✓ Shopify connected — ${decodeURIComponent(shop)}`,
      });
      fetchClients();
      router.replace("/dashboard/admin");
    } else if (shopify === "error") {
      const errorMessages: Record<string, string> = {
        missing_params: "OAuth failed — missing parameters.",
        invalid_hmac: "OAuth failed — invalid Shopify signature.",
        invalid_state: "OAuth failed — CSRF check failed. Try again.",
        token_exchange_failed: "OAuth failed — could not exchange code for token.",
        no_access_token: "OAuth failed — no access token returned.",
        not_configured: "OAuth not configured — SHOPIFY_CLIENT_SECRET is missing.",
        server_error: "OAuth failed — server error.",
      };
      setShopifyBanner({
        type: "error",
        message: errorMessages[msg || ""] || "Shopify connection failed.",
      });
      router.replace("/dashboard/admin");
    }

    if (shopify) {
      setTimeout(() => setShopifyBanner(null), 6000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auth guard — redirect non-admins
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [status, session?.user?.role, router]);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to load clients");
      const data = await res.json();
      setClients(data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(clientId: string) {
    try {
      await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } catch {
      // fail silently
    }
  }

  async function handleToggleStatus(clientId: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status: updated.status } : c)));
    } catch {
      // fail silently
    }
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteLoading(true);
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to create invite.");
        return;
      }
      setInviteResult({ inviteUrl: data.inviteUrl, email: data.email });
      // Copy to clipboard immediately
      navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
      // Refresh clients list so new (empty) client appears
      fetchClients();
    } catch {
      setInviteError("An unexpected error occurred.");
    } finally {
      setInviteLoading(false);
    }
  }

  function closeInviteModal() {
    setShowInviteModal(false);
    setInviteForm({ clientName: "", email: "" });
    setInviteResult(null);
    setInviteError("");
  }

  function handleClientSaved(client: ClientData) {
    if (editClient) {
      // Update existing
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...client, adAccounts: c.adAccounts, users: c.users } : c)));
      setEditClient(null);
    } else {
      // Add new
      setClients((prev) => [client, ...prev]);
    }
  }

  if (status === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Client Management" />

      {shopifyBanner && (
        <div
          style={{
            margin: "16px 24px 0",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "500",
            background:
              shopifyBanner.type === "success"
                ? "rgba(34,197,94,0.1)"
                : "rgba(239,68,68,0.1)",
            border: `1px solid ${
              shopifyBanner.type === "success"
                ? "rgba(34,197,94,0.3)"
                : "rgba(239,68,68,0.3)"
            }`,
            color:
              shopifyBanner.type === "success" ? "var(--green)" : "var(--red)",
          }}
        >
          {shopifyBanner.message}
        </div>
      )}

      <div style={{ padding: "24px" }}>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {[
            {
              label: "Total Clients",
              value: clients.length,
              color: "var(--accent)",
            },
            {
              label: "Active",
              value: clients.filter((c) => c.status === "ACTIVE").length,
              color: "var(--green)",
            },
            {
              label: "Paused",
              value: clients.filter((c) => c.status === "PAUSED").length,
              color: "var(--amber)",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "14px 18px",
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {label}
              </p>
              <p style={{ margin: 0, fontSize: "24px", fontWeight: "700", color, fontFamily: "Space Mono, monospace" }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Add/Edit form */}
        <AddClientForm
          onSuccess={handleClientSaved}
          editClient={editClient}
          onCancelEdit={() => setEditClient(null)}
        />

        {/* Clients table */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text)" }}>
              All Clients
            </h2>
            <button
              onClick={() => setShowInviteModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Invite Client
            </button>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: "56px", borderRadius: "8px" }} />
              ))}
            </div>
          ) : (
            <ClientsTable
              clients={clients}
              onEdit={(c) => setEditClient(c)}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          )}
        </div>
      </div>

      {/* Invite Client Modal */}
      {showInviteModal && (
        <div
          onClick={closeInviteModal}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "440px",
            }}
          >
            {!inviteResult ? (
              <>
                <h2 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>
                  Invite a Client
                </h2>
                <p style={{ margin: "0 0 24px", fontSize: "13px", color: "var(--text2)" }}>
                  They&apos;ll receive a signup link valid for 7 days.
                </p>

                {inviteError && (
                  <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
                    {inviteError}
                  </div>
                )}

                <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "var(--text2)", marginBottom: "6px" }}>
                      Client / Brand Name
                    </label>
                    <input
                      type="text" required
                      value={inviteForm.clientName}
                      onChange={(e) => setInviteForm(f => ({ ...f, clientName: e.target.value }))}
                      placeholder="e.g. Acme Store"
                      style={{ width: "100%", padding: "10px 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "14px", fontFamily: "DM Sans, sans-serif", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "var(--text2)", marginBottom: "6px" }}>
                      Client Email
                    </label>
                    <input
                      type="email" required
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="client@example.com"
                      style={{ width: "100%", padding: "10px 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "14px", fontFamily: "DM Sans, sans-serif", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
                    <button type="button" onClick={closeInviteModal}
                      style={{ flex: 1, padding: "10px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text2)", fontSize: "14px", fontWeight: "500", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={inviteLoading}
                      style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg, var(--accent), var(--accent2))", border: "none", borderRadius: "8px", color: "white", fontSize: "14px", fontWeight: "600", cursor: inviteLoading ? "not-allowed" : "pointer", opacity: inviteLoading ? 0.7 : 1, fontFamily: "DM Sans, sans-serif" }}>
                      {inviteLoading ? "Creating…" : "Create Invite"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>✓</div>
                  <h2 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "700", color: "var(--text)" }}>Invite Created!</h2>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text2)" }}>
                    Link copied to clipboard. Send it to <strong>{inviteResult.email}</strong>.
                  </p>
                </div>

                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px", wordBreak: "break-all", fontSize: "12px", color: "var(--text2)", fontFamily: "Space Mono, monospace" }}>
                  {inviteResult.inviteUrl}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(inviteResult.inviteUrl)}
                    style={{ flex: 1, padding: "10px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                    Copy Link
                  </button>
                  <button onClick={closeInviteModal}
                    style={{ flex: 1, padding: "10px", background: "linear-gradient(135deg, var(--accent), var(--accent2))", border: "none", borderRadius: "8px", color: "white", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
