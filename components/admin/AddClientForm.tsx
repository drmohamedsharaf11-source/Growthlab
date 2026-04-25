"use client";

import { useState } from "react";
import { ClientData } from "@/types";

interface AddClientFormProps {
  onSuccess: (client: ClientData) => void;
  editClient?: ClientData | null;
  onCancelEdit?: () => void;
}

const REPORT_FREQUENCIES = [
  { label: "Daily + Weekly + Monthly", value: "DAILY_WEEKLY_MONTHLY" },
  { label: "Weekly + Monthly", value: "WEEKLY_MONTHLY" },
  { label: "Monthly Only", value: "MONTHLY" },
  { label: "Daily Only", value: "DAILY" },
];

function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: "500",
          color: "var(--text2)",
          marginBottom: "5px",
        }}
      >
        {label} {required && <span style={{ color: "var(--red)" }}>*</span>}
      </label>
      <input
        id={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          padding: "9px 12px",
          fontSize: "13px",
        }}
      />
    </div>
  );
}

export default function AddClientForm({
  onSuccess,
  editClient,
  onCancelEdit,
}: AddClientFormProps) {
  const [formData, setFormData] = useState({
    name: editClient?.name || "",
    shopifyDomain: editClient?.shopifyDomain || "",
    shopifyToken: "",
    metaAccountId: editClient?.metaAccountId || "",
    metaAccessToken: editClient?.metaAccessToken || "",
    tiktokAccountId: editClient?.tiktokAccountId || "",
    tiktokAccessToken: editClient?.tiktokAccessToken || "",
    reportFrequency: editClient?.reportFrequency || "DAILY_WEEKLY_MONTHLY",
    clientEmail: "",
    clientName: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [savedClientId, setSavedClientId] = useState<string | null>(
    editClient?.id || null
  );
  const [shopifyTestStatus, setShopifyTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [shopifyTestMsg, setShopifyTestMsg] = useState("");
  const [editingShopify, setEditingShopify] = useState(!editClient?.shopifyConnected);

  const set = (key: string) => (val: string) =>
    setFormData((prev) => ({ ...prev, [key]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const url = editClient
        ? `/api/clients/${editClient.id}`
        : "/api/clients";
      const method = editClient ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          // Only send shopifyToken if the user has entered one
          shopifyToken: formData.shopifyToken || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save client");
      }

      const client = await res.json();
      setSuccess(true);
      setSavedClientId(client.id);
      onSuccess(client);

      if (!editClient) {
        setFormData({
          name: "",
          shopifyDomain: "",
          shopifyToken: "",
          metaAccountId: "",
          metaAccessToken: "",
          tiktokAccountId: "",
          tiktokAccessToken: "",
          reportFrequency: "DAILY_WEEKLY_MONTHLY",
          clientEmail: "",
          clientName: "",
        });
        setShopifyTestStatus("idle");
        setShopifyTestMsg("");
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: "600",
            color: "var(--text)",
          }}
        >
          {editClient ? "Edit Client" : "Add New Client"}
        </h3>
        {editClient && onCancelEdit && (
          <button
            onClick={onCancelEdit}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text3)",
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <FormField
            label="Brand Name"
            name="name"
            value={formData.name}
            onChange={set("name")}
            placeholder="PinkRose Egypt"
            required
          />
          <FormField
            label="Client Email"
            name="clientEmail"
            value={formData.clientEmail}
            onChange={set("clientEmail")}
            type="email"
            placeholder="client@brand.com"
          />
          <FormField
            label="Contact Name"
            name="clientName"
            value={formData.clientName}
            onChange={set("clientName")}
            placeholder="John Doe"
          />
        </div>

        {/* Shopify */}
        <p
          style={{
            margin: "16px 0 8px",
            fontSize: "11px",
            fontWeight: "600",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Shopify Integration
        </p>

        {/* Already connected + not editing */}
        {editClient?.shopifyConnected && editClient?.shopifyDomain && !editingShopify ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: "8px",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "var(--green)",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--green)", fontSize: "13px", fontWeight: "600" }}>
              Connected
            </span>
            <span style={{ fontSize: "13px", color: "var(--text2)" }}>
              {editClient.shopifyDomain}
            </span>
            <button
              type="button"
              onClick={() => setEditingShopify(true)}
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "none",
                fontSize: "12px",
                color: "var(--text3)",
                textDecoration: "underline",
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Change credentials
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: "8px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <FormField
                label="Store Domain"
                name="shopifyDomain"
                value={formData.shopifyDomain}
                onChange={(val) => {
                  set("shopifyDomain")(val);
                  setShopifyTestStatus("idle");
                }}
                placeholder="storename.myshopify.com"
              />
              <FormField
                label="Access Token"
                name="shopifyToken"
                value={formData.shopifyToken}
                onChange={(val) => {
                  set("shopifyToken")(val);
                  setShopifyTestStatus("idle");
                }}
                type="password"
                placeholder="shpat_xxxxxxxxxxxx"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                disabled={shopifyTestStatus === "testing" || !formData.shopifyDomain || !formData.shopifyToken}
                onClick={async () => {
                  setShopifyTestStatus("testing");
                  setShopifyTestMsg("");
                  try {
                    const res = await fetch("/api/shopify/test", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        domain: formData.shopifyDomain,
                        token: formData.shopifyToken,
                      }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      setShopifyTestStatus("ok");
                      setShopifyTestMsg(data.shopName ? `Connected to "${data.shopName}"` : "Connection successful");
                    } else {
                      setShopifyTestStatus("error");
                      setShopifyTestMsg(data.error || "Connection failed");
                    }
                  } catch {
                    setShopifyTestStatus("error");
                    setShopifyTestMsg("Network error");
                  }
                }}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  background: "var(--surface3)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text2)",
                  cursor: (!formData.shopifyDomain || !formData.shopifyToken) ? "not-allowed" : "pointer",
                  opacity: (!formData.shopifyDomain || !formData.shopifyToken) ? 0.5 : 1,
                  fontFamily: "DM Sans, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {shopifyTestStatus === "testing" ? "Testing…" : "Test Connection"}
              </button>
              {shopifyTestStatus === "ok" && (
                <span style={{ fontSize: "13px", color: "var(--green)", fontWeight: "600" }}>
                  ✓ {shopifyTestMsg}
                </span>
              )}
              {shopifyTestStatus === "error" && (
                <span style={{ fontSize: "13px", color: "var(--red)" }}>
                  ✕ {shopifyTestMsg}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Meta */}
        <p
          style={{
            margin: "16px 0 8px",
            fontSize: "11px",
            fontWeight: "600",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Meta Ads Integration
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <FormField
            label="Meta Account ID"
            name="metaAccountId"
            value={formData.metaAccountId}
            onChange={set("metaAccountId")}
            placeholder="act_123456789"
          />
          <FormField
            label="Meta Access Token"
            name="metaAccessToken"
            value={formData.metaAccessToken}
            onChange={set("metaAccessToken")}
            type="password"
            placeholder="EAAxxxxx..."
          />
        </div>

        {/* TikTok */}
        <p
          style={{
            margin: "16px 0 8px",
            fontSize: "11px",
            fontWeight: "600",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          TikTok Ads Integration
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <FormField
            label="TikTok Account ID"
            name="tiktokAccountId"
            value={formData.tiktokAccountId}
            onChange={set("tiktokAccountId")}
            placeholder="7123456789012345678"
          />
          <FormField
            label="TikTok Access Token"
            name="tiktokAccessToken"
            value={formData.tiktokAccessToken}
            onChange={set("tiktokAccessToken")}
            type="password"
            placeholder="xxxx..."
          />
        </div>

        {/* Report frequency */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "500",
              color: "var(--text2)",
              marginBottom: "5px",
            }}
          >
            Report Frequency
          </label>
          <select
            value={formData.reportFrequency}
            onChange={(e) => set("reportFrequency")(e.target.value)}
            style={{
              padding: "9px 12px",
              fontSize: "13px",
              width: "280px",
            }}
          >
            {REPORT_FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error / Success */}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px",
              fontSize: "13px",
              color: "var(--red)",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}
        {success && !editClient && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "8px",
              fontSize: "13px",
              color: "var(--green)",
              marginBottom: "16px",
            }}
          >
            ✓ Client added successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 24px",
            background: loading ? "rgba(79,110,247,0.5)" : "var(--accent)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            transition: "opacity 0.2s",
          }}
        >
          {loading ? "Saving..." : editClient ? "Update Client" : "Add Client"}
        </button>
      </form>
    </div>
  );
}
