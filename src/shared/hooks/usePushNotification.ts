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

  // subscribe ใหม่ทุกครั้ง — ขอ permission + save ลง Column I
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

  // เรียกตอน modal load พร้อมส่ง hasSubscription มาจาก sheet
  // - ถ้า sheet ไม่มี subscription (Column I ว่าง) → subscribe ใหม่เลย (ขอ permission + save)
  // - ถ้า sheet มีแล้ว → sync เงียบๆ ไม่ต้องขอ permission ซ้ำ
  const ensureSubscription = async (
    hasSubscriptionInSheet: boolean,
  ): Promise<void> => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      if (!hasSubscriptionInSheet) {
        // Column I ว่าง → ขอ permission ใหม่และ subscribe ใหม่
        await subscribe();
        return;
      }

      // Column I มีค่าแล้ว → replace subscription ใหม่เลย (ไม่ต้องขอ permission ซ้ำถ้า granted อยู่แล้ว)
      if (Notification.permission !== "granted") return;

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Unsubscribe ของเก่าออกก่อน แล้ว subscribe ใหม่
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          NOTIFICATION_CONFIG.VAPID_PUBLIC_KEY,
        ),
      });

      await fetch("/api/push-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userColId, subscription: newSub }),
      });

      setIsSubscribed(true);
    } catch {}
  };

  return { permission, isSubscribed, subscribe, ensureSubscription };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
