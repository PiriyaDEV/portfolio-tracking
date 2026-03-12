import { useEffect, useState } from "react";
import { NOTIFICATION_CONFIG } from "../components/modal/NotificationModal/config.constants";

export function usePushNotification(userColId: string) {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  // ตอน init — เช็คว่า browser มี subscription อยู่แล้วหรือเปล่า
  useEffect(() => {
    if (typeof window === "undefined") return;
    setPermission(Notification.permission);

    const checkExisting = async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window))
          return;
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) setIsSubscribed(true);
      } catch {}
    };
    checkExisting();
  }, []);

  const subscribe = async (): Promise<boolean> => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert(
          "เบราว์เซอร์นี้ไม่รองรับ Push Notifications\nกรุณาเพิ่มแอปไปยัง Home Screen ก่อน",
        );
        return false;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      // ถ้ามี subscription อยู่แล้ว ให้ส่ง re-save ไปที่ server ด้วย
      // เผื่อ Column I ใน sheet ว่างทั้งที่ browser subscribe อยู่แล้ว
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            NOTIFICATION_CONFIG.VAPID_PUBLIC_KEY,
          ),
        }));

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

  // เรียกตอน modal load — ถ้า globalEnabled แต่ sheet ไม่มี subscription → re-save
  const syncSubscriptionIfNeeded = async (): Promise<void> => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (Notification.permission !== "granted") return;

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (!existing) return;

      // ส่ง subscription ขึ้น server ใหม่ เผื่อ Column I หาย
      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userColId, subscription: existing }),
      });

      setIsSubscribed(true);
    } catch {}
  };

  return { permission, isSubscribed, subscribe, syncSubscriptionIfNeeded };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
