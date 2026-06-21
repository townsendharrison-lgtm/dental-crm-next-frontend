// Firebase Messaging Service Worker
// This runs in the background to receive push notifications even when the tab is closed

importScripts("https://www.gstatic.com/firebasejs/11.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.7.1/firebase-messaging-compat.js");

// Initialize Firebase directly in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCrgN9NRdUfnfqWhhbNKDCtbqZykXtS66k",
  authDomain: "dsg-crm-eda78.firebaseapp.com",
  projectId: "dsg-crm-eda78",
  storageBucket: "dsg-crm-eda78.firebasestorage.app",
  messagingSenderId: "551973724129",
  appId: "1:551973724129:web:913376d3d7e7fad321fca0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);

  // If the payload contains a 'notification' object, Firebase automatically
  // displays a system notification. We don't want to show a duplicate.
  if (payload.notification) {
    console.log("[SW] Firebase auto-handled notification, skipping manual display.");
    return;
  }

  // Fallback: manually display notification if only data was sent
  const notificationTitle = payload.data?.title || "Dental CRM";
  const notificationOptions = {
    body: payload.data?.body || "You have a new notification",
    icon: "/logo.png",
    badge: "/logo.png",
    data: payload.data,
    requireInteraction: true,
    tag: "dental-crm-notification",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If there's already an open tab, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      return clients.openWindow("/");
    })
  );
});
