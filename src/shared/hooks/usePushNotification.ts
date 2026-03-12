import { useEffect, useState } from "react";
import { NOTIFICATION_CONFIG } from "../components/modal/NotificationModal/config.constants";

export function usePushNotification(userColId: string) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPermission(Notification.permission);
  }, []);

  const subscribe = async (): Promise<boolean> => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert("เบราว์เซอร์นี้ไม่รองรับ Push Notifications\nกรุณาเพิ่มแอปไปยัง Home Screen ก่อน");
        return false;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setIsSubscribed(true);
        return true;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(NOTIFICATION_CONFIG.VAPID_PUBLIC_KEY),
      });

      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userColId, subscription: sub }),
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscribe failed:", err);
      return false;
    }
  };

  return { permission, isSubscribed, subscribe };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}