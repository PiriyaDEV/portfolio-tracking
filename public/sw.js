self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "แจ้งเตือน", {
      body: data.body || "",
      icon: data.icon || "/apple-icon.png",
      badge: "/apple-icon.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/main"));
});
