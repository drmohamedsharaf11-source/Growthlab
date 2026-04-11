"use client";

import { useState, useEffect } from "react";
import { ClientData } from "@/types";

export function useClient(clientId?: string | null) {
  const [client, setClient] = useState<ClientData | null>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) throw new Error("Failed to fetch clients");
        const data: ClientData[] = await res.json();
        setClients(data);

        if (clientId) {
          const found = data.find((c) => c.id === clientId);
          setClient(found || data[0] || null);
        } else {
          setClient(data[0] || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchClients();
  }, [clientId]);

  return { client, clients, loading, error, setClient };
}
