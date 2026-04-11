"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertData } from "@/types";

export function useAlerts(clientId?: string | null) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/clients/${clientId}/alerts`);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const data: AlertData[] = await res.json();
      setAlerts(data);
      setUnreadCount(data.filter((a) => !a.read).length);
    } catch {
      // silently fail for alerts
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const markAsRead = useCallback(async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/read`, { method: "PATCH" });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!clientId) return;
    try {
      await fetch(`/api/clients/${clientId}/alerts/read-all`, { method: "PATCH" });
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, [clientId]);

  return { alerts, loading, unreadCount, markAsRead, markAllRead, refetch: fetchAlerts };
}
