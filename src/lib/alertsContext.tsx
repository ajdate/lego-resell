"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useIsClient } from "@/src/hooks/useIsClient";
import { usePathname } from "next/navigation";
import {
  applyAlertState,
  countAlertsByCategory,
  deduplicateAlerts,
  dismissAlert,
  generateAllAlerts,
  loadDismissedAlertIds,
  loadReadAlertIds,
  markAlertRead,
  markAllAlertsRead,
  type Alert,
} from "@/lib/alerts";

type AlertsContextValue = {
  unreadCount: number;
  refreshAlerts: () => void;
  dismiss: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  getVisibleAlerts: () => { alert: Alert; isRead: boolean }[];
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isClient = useIsClient();
  const [version, setVersion] = useState(0);

  const refreshAlerts = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    refreshAlerts();
  }, [pathname, refreshAlerts]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "lego-dismissed-alerts" ||
        e.key === "lego-read-alerts" ||
        e.key === "lego-portfolio" ||
        e.key === "lego-watchlist"
      ) {
        refreshAlerts();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshAlerts]);

  const dismiss = useCallback(
    (id: string) => {
      dismissAlert(id);
      refreshAlerts();
    },
    [refreshAlerts],
  );

  const markRead = useCallback(
    (id: string) => {
      markAlertRead(id);
      refreshAlerts();
    },
    [refreshAlerts],
  );

  const markAllRead = useCallback(
    (ids: string[]) => {
      markAllAlertsRead(ids);
      refreshAlerts();
    },
    [refreshAlerts],
  );

  const getVisibleAlerts = useCallback(() => {
    if (!isClient) return [];
    void version;
    const all = deduplicateAlerts(generateAllAlerts());
    const dismissed = loadDismissedAlertIds();
    const read = loadReadAlertIds();
    return applyAlertState(all, dismissed, read);
  }, [isClient, version]);

  const unreadCount = useMemo(() => {
    if (!isClient) return 0;
    const visible = getVisibleAlerts();
    return countAlertsByCategory(visible).unread;
  }, [getVisibleAlerts, isClient]);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshAlerts,
      dismiss,
      markRead,
      markAllRead,
      getVisibleAlerts,
    }),
    [unreadCount, refreshAlerts, dismiss, markRead, markAllRead, getVisibleAlerts],
  );

  return (
    <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
  );
}

export function useAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    throw new Error("useAlerts must be used within AlertsProvider");
  }
  return ctx;
}
