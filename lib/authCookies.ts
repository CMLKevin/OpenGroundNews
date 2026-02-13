const SESSION_MAX_AGE_SEC = 14 * 24 * 60 * 60;

export function sessionCookieOptions(maxAgeSec = SESSION_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSec,
  };
}

export function expireCookieOptions() {
  return sessionCookieOptions(0);
}
