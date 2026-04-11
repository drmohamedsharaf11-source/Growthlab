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
  // savedClientId is set after a new client is created — used to initiate OAuth
  const [savedClientId, setSavedClientId] = useState<string | null>(
    editClient?.id || null
  );

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
          shopifyToken: undefined,
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
          metaAccountId: "",
          metaAccessToken: "",
          tiktokAccountId: "",
          tiktokAccessToken: "",
          reportFrequency: "DAILY_WEEKLY_MONTHLY",
          clientEmail: "",
          clientName: "",
        });
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

        {/* Already connected */}
        {editClient?.shopifyToken && editClient?.shopifyDomain ? (
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
            <span style={{ color: "var(--green)", fontSize: "13px", fontWeight: "600" }}>
              ✓ Connected
            </span>
            <span style={{ fontSize: "13px", color: "var(--text2)" }}>
              {editClient.shopifyDomain}
            </span>
            <a
              href={`/api/shopify/auth?shop=${editClient.shopifyDomain}&clientId=${editClient.id}`}
              style={{
                marginLeft: "auto",
                fontSize: "12px",
                color: "var(--text3)",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Reconnect
            </a>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "10px",
              alignItems: "flex-end",
              marginBottom: "8px",
            }}
          >
            <FormField
              label="Shopify Store Domain"
              name="shopifyDomain"
              value={formData.shopifyDomain}
              onChange={set("shopifyDomain")}
              placeholder="storename.myshopify.com"
            />
            <a
              href={
                savedClientId && formData.shopifyDomain
                  ? `/api/shopify/auth?shop=${encodeURIComponent(formData.shopifyDomain)}&clientId=${savedClientId}`
                  : undefined
              }
              onClick={
                !savedClientId
                  ? (e) => {
                      e.preventDefault();
                      setError("Save the client first, then connect Shopify.");
                    }
                  : !formData.shopifyDomain
                  ? (e) => {
                      e.preventDefault();
                      setError("Enter a Shopify store domain first.");
                    }
                  : undefined
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 16px",
                background:
                  savedClientId && formData.shopifyDomain
                    ? "rgba(34,197,94,0.12)"
                    : "var(--surface3)",
                border: `1px solid ${
                  savedClientId && formData.shopifyDomain
                    ? "rgba(34,197,94,0.35)"
                    : "var(--border)"
                }`,
                borderRadius: "8px",
                color:
                  savedClientId && formData.shopifyDomain
                    ? "var(--green)"
                    : "var(--text3)",
                fontSize: "13px",
                fontWeight: "600",
                cursor:
                  savedClientId && formData.shopifyDomain
                    ? "pointer"
                    : "not-allowed",
                textDecoration: "none",
                whiteSpace: "nowrap",
                fontFamily: "DM Sans, sans-serif",
                marginBottom: "1px",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Connect Shopify
            </a>
          </div>
        )}

        {!savedClientId && (
          <p style={{ margin: "0 0 8px", fontSize: "12px", color: "var(--text3)" }}>
            Save the client first to enable Shopify OAuth connection.
          </p>
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
