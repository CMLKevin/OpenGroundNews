// Backwards-compatible shim: the rest of the app imports from "@/lib/authStore".
// We now use the DB-backed implementation for Ground News parity features.
export * from "@/lib/dbAuth";

