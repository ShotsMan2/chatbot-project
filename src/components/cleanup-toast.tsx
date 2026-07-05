"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface CleanupToastProps {
  lastCleanupAt: string | null;
  lastCleanupCount: number | null;
}

const VISIT_KEY = "cleanup_last_visit";

export function CleanupToast({ lastCleanupAt, lastCleanupCount }: CleanupToastProps) {
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    if (!lastCleanupAt || !lastCleanupCount || lastCleanupCount === 0) return;

    const lastVisit = localStorage.getItem(VISIT_KEY);
    const cleanupTime = new Date(lastCleanupAt).getTime();

    if (!lastVisit || cleanupTime > parseInt(lastVisit, 10)) {
      shown.current = true;
      const message =
        lastCleanupCount === 1
          ? "1 eski konuşma temizlendi"
          : `${lastCleanupCount} eski konuşma temizlendi`;
      toast.info(message, {
        description: "3 günden eski konuşmalar otomatik olarak silindi.",
        duration: 5000,
      });
    }

    localStorage.setItem(VISIT_KEY, String(Date.now()));
  }, [lastCleanupAt, lastCleanupCount]);

  return null;
}
