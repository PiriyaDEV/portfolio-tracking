self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "แจ้งเตือน", {
      body: data.body || "",
      icon: data.icon || "/apple-icon.png",
      badge: "/apple-icon.png",
      vibrate: data.vibrate ? [200, 100, 200] : [], // ← สั่น 3 ครั้ง หรือไม่สั่นเลย
    }),
  );
});
