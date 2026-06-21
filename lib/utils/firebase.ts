import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

let app: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * Initialize Firebase app and messaging.
 * Returns false if credentials are missing or the browser doesn't support notifications.
 */
export function initializeFirebase(): boolean {
  if (app) return true; // Already initialized

  // Check if Firebase config is available
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn("⚠️ Firebase config missing — push notifications disabled");
    return false;
  }

  // Check browser support
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
    console.warn("⚠️ Browser does not support push notifications");
    return false;
  }

  try {
    app = initializeApp(firebaseConfig);
    messagingInstance = getMessaging(app);
    console.log("🔔 Firebase client initialized");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize Firebase:", error);
    return false;
  }
}

/**
 * Register the service worker for background push.
 * Firebase config is hardcoded in firebase-messaging-sw.js.
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error("Failed to register service worker:", error);
    return null;
  }
}

/**
 * Request notification permission and get FCM token.
 * Sends the token to the backend for storage.
 *
 * @param authToken - The user's Supabase auth token for backend API calls
 * @returns The FCM token string, or null if permission denied / error
 */
export async function requestNotificationPermission(authToken: string): Promise<string | null> {
  if (!initializeFirebase() || !messagingInstance) return null;

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("🔕 Notification permission denied");
      return null;
    }

    // Register service worker
    const swRegistration = await registerServiceWorker();
    if (!swRegistration) return null;

    // Get FCM token
    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn("Failed to get FCM token");
      return null;
    }

    console.log("🔑 FCM token obtained");

    // Send token to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
    try {
      await fetch(`${backendUrl}/api/notifications/register-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token,
          deviceInfo: `${navigator.userAgent.substring(0, 100)}`,
        }),
      });
      console.log("✅ FCM token registered with backend");
    } catch (error) {
      console.error("Failed to register FCM token with backend:", error);
    }

    return token;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return null;
  }
}

/**
 * Listen for foreground push messages.
 * Returns an unsubscribe function.
 *
 * @param callback - Called with each foreground message payload
 */
export function onForegroundMessage(
  callback: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void
): (() => void) | null {
  if (!messagingInstance) {
    console.warn("Firebase messaging not initialized — cannot listen for foreground messages");
    return null;
  }

  const unsubscribe = onMessage(messagingInstance, (payload) => {
    console.log("📩 Foreground message received:", payload);
    callback(payload);
  });

  return unsubscribe;
}

/**
 * Unregister the FCM token from the backend (call on logout).
 */
export async function unregisterFCMToken(authToken: string, fcmToken: string): Promise<void> {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  try {
    await fetch(`${backendUrl}/api/notifications/unregister-token`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: fcmToken }),
    });
  } catch (error) {
    console.error("Failed to unregister FCM token:", error);
  }
}

/**
 * Check if notification permission has been granted.
 */
export function isNotificationPermissionGranted(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
}

/**
 * Check if notification permission has been denied (user explicitly blocked).
 */
export function isNotificationPermissionDenied(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied";
}
