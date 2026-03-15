// Kindora Service Worker — handles Web Push notifications
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Kindora", body: event.data.text() };
  }

  const title = data.title || "Kindora";
  const options = {
    body: data.body || "",
    icon: "/apple-touch-icon.png",
    badge: "/favicon.png",
    tag: data.tag || "kindora-reminder",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    requireInteraction: data.important || false,
    actions: data.important
      ? [{ action: "view", title: "View Calendar" }]
      : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
