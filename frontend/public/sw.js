self.addEventListener('push', (e) => {
  if (!e.data) return;
  const data = e.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    // icon: '/icon-192.png', // Optional: add icon-192.png to public/
    data: data.data,
  });
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  clients.openWindow('/notifications');
});