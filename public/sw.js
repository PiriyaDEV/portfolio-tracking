self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "แจ้งเตือน", {
      body: data.body || "",
      icon: data.icon || "/apple-icon.png",
      badge: "/apple-icon.png",
      data: { url: data.url || "/main/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/main/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/main") && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      }),
  );
});
