/* eslint-disable no-restricted-globals */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "OpenGroundNews";
  const body = data.body || "New update available.";
  const url = data.url || "/";
  const tag = data.tag || "ogn";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsArr) => {
        const existing = clientsArr.find((c) => c.url && c.focus);
        if (existing) {
          existing.focus();
          return existing.navigate(url);
        }
        return self.clients.openWindow(url);
      }),
  );
});

