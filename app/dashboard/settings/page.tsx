"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Topbar from "@/components/layout/Topbar";

export default function SettingsPage() {
  const { data: session } = useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

    if (newPassword.length < 8) {
      setStatus("error");
      setMessage("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("New passwords do not match.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to change password.");
      } else {
        setStatus("success");
        setMessage("Password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setStatus("error");
      setMessage("An unexpected error occurred.");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text)",
    fontSize: "14px",
    fontFamily: "DM Sans, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--text2)",
    marginBottom: "6px",
    display: "block",
  };

  const sectionStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "20px",
  };

  return (
    <div>
      <Topbar title="Settings" />

      <div style={{ padding: "24px", maxWidth: "560px" }}>

        {/* Profile section */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: "600", color: "var(--text)" }}>
              Profile
            </h2>
            {session?.user?.role === "ADMIN" && (
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "var(--accent)",
                }}
              >
                Admin
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={session?.user?.name || ""}
                readOnly
                style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={session?.user?.email || ""}
                readOnly
                style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>
          </div>
        </div>

        {/* Change password section */}
        <div style={sectionStyle}>
          <h2 style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: "600", color: "var(--text)" }}>
            Change Password
          </h2>

          {status !== "idle" && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "500",
                marginBottom: "16px",
                background: status === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${status === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                color: status === "success" ? "var(--green)" : "var(--red)",
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                padding: "10px 20px",
                background: "var(--accent)",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor: status === "loading" ? "not-allowed" : "pointer",
                opacity: status === "loading" ? 0.7 : 1,
                fontFamily: "DM Sans, sans-serif",
                alignSelf: "flex-start",
              }}
            >
              {status === "loading" ? "Saving..." : "Update Password"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
