"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/dashboard/ads",
    label: "Ad Creatives",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/shopify",
    label: "Shopify",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="m1 1 4 4 2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/inventory",
    label: "Inventory",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    href: "/dashboard/alerts",
    label: "Alerts",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

const adminNavItems: NavItem[] = [
  {
    href: "/dashboard/admin",
    label: "Clients",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      style={{
        width: "220px",
        minHeight: "100vh",
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
            </svg>
          </div>
          <div>
            <span
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "var(--text)",
                letterSpacing: "-0.3px",
              }}
            >
              Growth<span style={{ color: "var(--accent)" }}>OS</span>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <p
          style={{
            fontSize: "10px",
            fontWeight: "600",
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            padding: "4px 10px 8px",
            margin: 0,
          }}
        >
          Navigation
        </p>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 10px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: active ? "600" : "400",
                    color: active ? "var(--text)" : "var(--text2)",
                    background: active ? "var(--surface2)" : "transparent",
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                    position: "relative",
                  }}
                >
                  {active && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "6px",
                        bottom: "6px",
                        width: "3px",
                        borderRadius: "999px",
                        background: "var(--accent)",
                      }}
                    />
                  )}
                  <span style={{ color: active ? "var(--accent)" : "var(--text3)" }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Admin section */}
        {session?.user?.role === "ADMIN" && (
          <>
            <p
              style={{
                fontSize: "10px",
                fontWeight: "600",
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                padding: "16px 10px 8px",
                margin: 0,
              }}
            >
              Admin
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
              {adminNavItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "9px 10px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: active ? "600" : "400",
                        color: active ? "var(--text)" : "var(--text2)",
                        background: active ? "var(--surface2)" : "transparent",
                        textDecoration: "none",
                        transition: "all 0.15s ease",
                        position: "relative",
                      }}
                    >
                      {active && (
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: "6px",
                            bottom: "6px",
                            width: "3px",
                            borderRadius: "999px",
                            background: "var(--accent2)",
                          }}
                        />
                      )}
                      <span style={{ color: active ? "var(--accent2)" : "var(--text3)" }}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </nav>

      {/* User section */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 10px",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: "700",
              color: "white",
              flexShrink: 0,
            }}
          >
            {session?.user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {session?.user?.name}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                color: "var(--text3)",
                textTransform: "capitalize",
              }}
            >
              {session?.user?.role?.toLowerCase()}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text3)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              borderRadius: "4px",
              transition: "color 0.15s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
