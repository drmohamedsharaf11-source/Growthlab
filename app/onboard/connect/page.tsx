"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

interface ConnectionStatus {
  shopifyConnected: boolean;
  shopifyDomain: string | null;
}

function IntegrationCard({
  icon,
  title,
  description,
  connected,
  domain,
  actionLabel,
  onAction,
  disabled,
  comingSoon,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  connected?: boolean;
  domain?: string | null;
  actionLabel: string;
  onAction?: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${connected ? "rgba(34,197,94,0.35)" : "var(--border)"}`,
        borderRadius: "14px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        opacity: disabled && !comingSoon ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {icon}
          </div>
          <div>
            <h3 style={{ margin: "0 0 3px", fontSize: "15px", fontWeight: "600", color: "var(--text)" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text3)" }}>{description}</p>
          </div>
        </div>

        {connected && (
          <span style={{ flexShrink: 0, padding: "3px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: "700", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "var(--green)" }}>
            Connected
          </span>
        )}
        {comingSoon && (
          <span style={{ flexShrink: 0, padding: "3px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: "600", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text3)" }}>
            Coming soon
          </span>
        )}
      </div>

      {connected && domain && (
        <p style={{ margin: 0, fontSize: "12px", color: "var(--text2)", fontFamily: "Space Mono, monospace" }}>{domain}</p>
      )}

      {!comingSoon && (
        <button
          onClick={onAction}
          disabled={disabled || connected}
          style={{
            padding: "9px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: disabled || connected ? "not-allowed" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            border: connected ? "1px solid rgba(34,197,94,0.3)" : "1px solid var(--border)",
            background: connected ? "rgba(34,197,94,0.08)" : "var(--surface2)",
            color: connected ? "var(--green)" : "var(--text)",
            width: "fit-content",
          }}
        >
          {connected ? "✓ " + actionLabel : actionLabel}
        </button>
      )}
    </div>
  );
}

function OnboardConnectInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conn, setConn] = useState<ConnectionStatus>({ shopifyConnected: false, shopifyDomain: null });
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  // Shopify credentials form state
  const [shopDomain, setShopDomain] = useState("");
  const [shopClientId, setShopClientId] = useState("");
  const [shopClientSecret, setShopClientSecret] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!session?.user?.clientId) return;
    setFetchingStatus(true);
    try {
      const res = await fetch(`/api/clients/${session.user.clientId}`);
      if (res.ok) {
        const data = await res.json();
        setConn({
          shopifyConnected: !!(data.shopifyConnected),
          shopifyDomain: data.shopifyDomain ?? null,
        });
      }
    } finally {
      setFetchingStatus(false);
    }
  }, [session?.user?.clientId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.clientId) {
      fetchStatus();
    }
  }, [session?.user?.clientId, fetchStatus]);

  // Keep legacy query param support in case someone lands here from an old link
  useEffect(() => {
    const shopify = searchParams.get("shopify");
    const shop = searchParams.get("shop");
    if (shopify === "connected") {
      setBanner(shop ? `Shopify connected — ${decodeURIComponent(shop)}` : "Shopify connected!");
      fetchStatus();
      router.replace("/onboard/connect");
      setTimeout(() => setBanner(null), 5000);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConnectShopify() {
    setConnectError(null);
    const raw = shopDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const shop = raw.includes(".myshopify.com") ? raw : raw ? `${raw}.myshopify.com` : "";
    if (!shop || !/^[a-z0-9-]+\.myshopify\.com$/.test(shop)) {
      setConnectError("Enter a valid Shopify store URL, e.g. your-store.myshopify.com");
      return;
    }
    if (!shopClientId.trim()) {
      setConnectError("Client ID is required");
      return;
    }
    if (!shopClientSecret.trim()) {
      setConnectError("Client Secret is required");
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch("/api/shopify/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain: shop, clientId: shopClientId.trim(), clientSecret: shopClientSecret.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setBanner(`Connected to ${data.shop}`);
        await fetchStatus();
        setTimeout(() => setBanner(null), 5000);
      } else {
        setConnectError(data.error || "Connection failed — please check your credentials");
      }
    } catch {
      setConnectError("Network error — please try again");
    } finally {
      setConnecting(false);
    }
  }

  if (status === "loading" || fetchingStatus) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ color: "var(--text2)", fontSize: "14px" }}>Loading…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      {/* Background blobs */}
      <div style={{ position: "fixed", top: "-20%", left: "-10%", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(79,110,247,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-20%", right: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "560px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "52px", height: "52px", borderRadius: "14px", background: "linear-gradient(135deg, var(--accent), var(--accent2))", marginBottom: "16px" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
            </svg>
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: "700", color: "var(--text)", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
            Welcome{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text2)", margin: 0 }}>
            Let&apos;s connect your data sources to get started.
          </p>
        </div>

        {/* Success banner */}
        {banner && (
          <div style={{ padding: "12px 16px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "10px", color: "var(--green)", fontSize: "13px", fontWeight: "500", marginBottom: "20px" }}>
            ✓ {banner}
          </div>
        )}

        {/* Integration cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
          {/* Shopify card */}
          <div
            style={{
              background: "var(--surface)",
              border: `1px solid ${conn.shopifyConnected ? "rgba(34,197,94,0.35)" : "var(--border)"}`,
              borderRadius: "14px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "var(--surface2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="m1 1 4 4 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: "0 0 3px", fontSize: "15px", fontWeight: "600", color: "var(--text)" }}>Shopify</h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text3)" }}>Sync products, orders, and inventory</p>
                </div>
              </div>
              {conn.shopifyConnected && (
                <span style={{ flexShrink: 0, padding: "3px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: "700", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "var(--green)" }}>
                  Connected
                </span>
              )}
            </div>

            {conn.shopifyConnected && conn.shopifyDomain && (
              <p style={{ margin: 0, fontSize: "12px", color: "var(--text2)", fontFamily: "Space Mono, monospace" }}>{conn.shopifyDomain}</p>
            )}

            {conn.shopifyConnected ? (
              <button
                disabled
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "not-allowed",
                  fontFamily: "DM Sans, sans-serif",
                  border: "1px solid rgba(34,197,94,0.3)",
                  background: "rgba(34,197,94,0.08)",
                  color: "var(--green)",
                  width: "fit-content",
                }}
              >
                ✓ Shopify Connected
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Setup guide */}
                <div style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  fontSize: "12px",
                  color: "var(--text2)",
                  lineHeight: "1.7",
                }}>
                  <p style={{ margin: "0 0 8px", fontWeight: "600", color: "var(--text)", fontSize: "12px" }}>To connect your Shopify store:</p>
                  <ol style={{ margin: 0, paddingLeft: "16px" }}>
                    <li>Go to <strong style={{ color: "var(--text)" }}>dev.shopify.com</strong> and select your store</li>
                    <li>Click <strong style={{ color: "var(--text)" }}>Create app</strong> and name it <em>GrowthOS Integration</em></li>
                    <li>Under <strong style={{ color: "var(--text)" }}>Configuration › Admin API access scopes</strong>, add:<br />
                      <code style={{ fontSize: "11px", color: "var(--accent)", fontFamily: "Space Mono, monospace" }}>read_orders, read_products, read_inventory, read_customers, read_analytics</code>
                    </li>
                    <li><strong style={{ color: "var(--text)" }}>Install the app</strong> on your store</li>
                    <li>Copy the <strong style={{ color: "var(--text)" }}>Client ID</strong> and <strong style={{ color: "var(--text)" }}>Client Secret</strong> below</li>
                  </ol>
                </div>

                {/* Credentials form */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    type="text"
                    value={shopDomain}
                    onChange={(e) => { setShopDomain(e.target.value); setConnectError(null); }}
                    placeholder="your-store.myshopify.com"
                    style={inputStyle(!!connectError && !shopDomain)}
                  />
                  <input
                    type="text"
                    value={shopClientId}
                    onChange={(e) => { setShopClientId(e.target.value); setConnectError(null); }}
                    placeholder="Client ID"
                    style={inputStyle(false)}
                  />
                  <input
                    type="password"
                    value={shopClientSecret}
                    onChange={(e) => { setShopClientSecret(e.target.value); setConnectError(null); }}
                    placeholder="Client Secret"
                    style={inputStyle(false)}
                  />

                  {connectError && (
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--red)" }}>{connectError}</p>
                  )}

                  <button
                    onClick={handleConnectShopify}
                    disabled={connecting}
                    style={{
                      padding: "9px 16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: connecting ? "not-allowed" : "pointer",
                      fontFamily: "DM Sans, sans-serif",
                      border: "1px solid var(--border)",
                      background: connecting ? "var(--surface3)" : "var(--surface2)",
                      color: connecting ? "var(--text3)" : "var(--text)",
                      width: "fit-content",
                      opacity: connecting ? 0.7 : 1,
                    }}
                  >
                    {connecting ? "Verifying credentials…" : "Connect Shopify"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <IntegrationCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            }
            title="Meta Ads"
            description="Facebook & Instagram ad performance"
            actionLabel="Connect Meta"
            comingSoon
            disabled
          />

          <IntegrationCard
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
              </svg>
            }
            title="TikTok Ads"
            description="TikTok ad performance and ROAS"
            actionLabel="Connect TikTok"
            comingSoon
            disabled
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={() => router.push("/dashboard")}
            disabled={!conn.shopifyConnected}
            style={{
              width: "100%",
              padding: "13px",
              background: conn.shopifyConnected
                ? "linear-gradient(135deg, var(--accent), var(--accent2))"
                : "var(--surface2)",
              border: conn.shopifyConnected ? "none" : "1px solid var(--border)",
              borderRadius: "10px",
              color: conn.shopifyConnected ? "white" : "var(--text3)",
              fontSize: "15px",
              fontWeight: "600",
              cursor: conn.shopifyConnected ? "pointer" : "not-allowed",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Finish setup →
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              width: "100%",
              padding: "10px",
              background: "transparent",
              border: "none",
              color: "var(--text3)",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Skip for now — connect integrations later
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text3)", marginTop: "20px" }}>
          You can connect more integrations any time from your dashboard.
        </p>
      </div>
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    padding: "9px 12px",
    borderRadius: "8px",
    border: `1px solid ${hasError ? "rgba(239,68,68,0.6)" : "var(--border)"}`,
    background: "var(--surface2)",
    color: "var(--text)",
    fontSize: "13px",
    fontFamily: "Space Mono, monospace",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };
}

export default function OnboardConnectPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ color: "var(--text2)", fontSize: "14px" }}>Loading…</div>
      </div>
    }>
      <OnboardConnectInner />
    </Suspense>
  );
}
