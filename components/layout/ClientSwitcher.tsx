"use client";

import { ClientData } from "@/types";

interface ClientSwitcherProps {
  clients: ClientData[];
  selectedClient: ClientData | null;
  onSelect: (client: ClientData) => void;
}

export default function ClientSwitcher({
  clients,
  selectedClient,
  onSelect,
}: ClientSwitcherProps) {
  if (clients.length <= 1) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "13px", color: "var(--text2)" }}>Client:</span>
      <select
        value={selectedClient?.id || ""}
        onChange={(e) => {
          const found = clients.find((c) => c.id === e.target.value);
          if (found) onSelect(found);
        }}
        style={{
          padding: "6px 12px",
          fontSize: "13px",
          fontWeight: "500",
          cursor: "pointer",
        }}
      >
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
    </div>
  );
}
