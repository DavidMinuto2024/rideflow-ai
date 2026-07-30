/**
 * RideFlow AI — Push Notification Service
 *
 * Handles Web Push subscription using VAPID and sends the subscription to the backend.
 */

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUser(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });
  return subscription;
}

export async function sendTokenToBackend(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/notifications/device-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: JSON.stringify(subscription),
      platform: 'web',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send push token to backend: ${error}`);
  }
}