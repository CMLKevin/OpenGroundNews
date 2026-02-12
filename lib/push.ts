import webpush from "web-push";

export type WebPushKeys = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

let configured = false;

export function getWebPushKeys(): WebPushKeys | null {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
  const subject = (process.env.VAPID_SUBJECT || "").trim();
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

function ensureConfigured() {
  if (configured) return;
  const keys = getWebPushKeys();
  if (!keys) return;
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  configured = true;
}

export function isWebPushConfigured(): boolean {
  return Boolean(getWebPushKeys());
}

export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function sendWebPush(
  sub: StoredSubscription,
  payload: { title: string; body: string; url?: string; tag?: string },
) {
  ensureConfigured();
  const keys = getWebPushKeys();
  if (!keys) {
    const err = new Error("Web Push is not configured (missing VAPID keys).");
    (err as any).code = "WEBPUSH_NOT_CONFIGURED";
    throw err;
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    tag: payload.tag || "ogn",
  });

  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    } as any,
    message,
  );
}

