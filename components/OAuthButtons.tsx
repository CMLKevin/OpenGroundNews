"use client";

import { signIn } from "next-auth/react";
import { safeAppPath } from "@/lib/navigation";

export function OAuthButtons({ next }: { next: string }) {
  const callbackTarget = safeAppPath(next, "/my");
  const callback = `/auth/oauth-complete?next=${encodeURIComponent(callbackTarget)}`;

  return (
    <div className="u-grid u-grid-gap-05">
      <button className="btn" type="button" onClick={() => void signIn("google", { callbackUrl: callback })}>
        Continue with Google
      </button>
      <button className="btn" type="button" onClick={() => void signIn("apple", { callbackUrl: callback })}>
        Continue with Apple
      </button>
    </div>
  );
}
