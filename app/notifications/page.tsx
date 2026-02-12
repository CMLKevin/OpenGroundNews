import { PushNotificationsPanel } from "@/components/PushNotificationsPanel";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <main className="container u-page-pad">
      {/* Client side because Push API + SW registration require browser context. */}
      {/**
       * This page works best when signed in, but the UI still reports whether the
       * browser supports push + whether server VAPID keys are configured.
       */}
      <PushNotificationsPanel />
    </main>
  );
}
