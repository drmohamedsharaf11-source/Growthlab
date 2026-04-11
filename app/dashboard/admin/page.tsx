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
          <h2
            style={{
              margin: "0 0 16px",
              fontSize: "16px",
              fontWeight: "600",
              color: "var(--text)",
            }}
          >
            All Clients
          </h2>

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
    </div>
  );
}
