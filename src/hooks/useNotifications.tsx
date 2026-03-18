import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useNotifications() {
  const { user, profile } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    setEnabled((profile as any)?.notifications_enabled ?? false);
  }, [profile]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted" && user) {
      setEnabled(true);
      await supabase.from("profiles").update({ notifications_enabled: true } as any).eq("user_id", user.id);
      return true;
    }
    return false;
  }, [user]);

  const disableNotifications = useCallback(async () => {
    if (!user) return;
    setEnabled(false);
    await supabase.from("profiles").update({ notifications_enabled: false } as any).eq("user_id", user.id);
  }, [user]);

  const sendNotification = useCallback((title: string, body?: string, icon?: string) => {
    if (!enabled || permission !== "granted") return;
    try {
      new Notification(title, {
        body,
        icon: icon || "/pwa-icon-192.png",
        badge: "/pwa-icon-192.png",
      });
    } catch {
      // Silent fail on unsupported platforms
    }
  }, [enabled, permission]);

  return { enabled, permission, requestPermission, disableNotifications, sendNotification };
}
