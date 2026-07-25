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

  const data = payload.data || {};
  const notificationTitle = data.title || "Dental CRM";
  const isAssignment = data.type === "NEW_ASSIGNMENT";

  const notificationOptions = {
    body: data.body || "You have a new notification",
    icon: "/logo.png",
    badge: "/logo.png",
    data,
    requireInteraction: true,
    tag: isAssignment && data.assignmentId
      ? `assignment-${data.assignmentId}`
      : data.tag || "dental-crm-notification",
    renotify: true,
    ...(isAssignment
      ? {
          actions: [
            { action: "accept", title: "Accept" },
            { action: "decline", title: "Decline" },
          ],
        }
      : {}),
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

function resolveTargetUrl(data, action) {
  if (action === "accept" && data.acceptLink) return data.acceptLink;
  if (action === "decline" && data.declineLink) return data.declineLink;

  if (action === "accept" && data.assignmentId) {
    return `/mentor/command-center?assignmentAction=accept&assignmentId=${encodeURIComponent(data.assignmentId)}`;
  }
  if (action === "decline" && data.assignmentId) {
    return `/mentor/command-center?assignmentAction=decline&assignmentId=${encodeURIComponent(data.assignmentId)}`;
  }

  return data.link || data.url || "/";
}

function toAbsoluteUrl(targetUrl) {
  if (targetUrl.startsWith("http")) return targetUrl;
  return `${self.location.origin}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
}

// Handle notification click — open deep link / run Accept·Decline CTAs
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = toAbsoluteUrl(resolveTargetUrl(data, event.action));

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if ("navigate" in client) {
            try {
              return client.navigate(targetUrl);
            } catch {
              // fall through
            }
          }
          // Fallback: ask the page to handle the deep link
          try {
            client.postMessage({
              type: "NOTIFICATION_ACTION",
              action: event.action || "open",
              data,
              url: targetUrl,
            });
          } catch {
            // ignore
          }
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
