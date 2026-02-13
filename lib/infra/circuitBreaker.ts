import { createHash } from "node:crypto";

type CircuitState = {
  failures: number;
  openedAt: number;
};

const state = new Map<string, CircuitState>();

function keyFor(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

export function canExecute(name: string, opts?: { failureThreshold?: number; cooldownMs?: number }) {
  const failureThreshold = Math.max(1, opts?.failureThreshold ?? 5);
  const cooldownMs = Math.max(1000, opts?.cooldownMs ?? 60_000);
  const key = keyFor(name);
  const current = state.get(key);
  if (!current) return true;
  if (current.failures < failureThreshold) return true;
  if (Date.now() - current.openedAt >= cooldownMs) {
    state.delete(key);
    return true;
  }
  return false;
}

export function recordSuccess(name: string) {
  state.delete(keyFor(name));
}

export function recordFailure(name: string) {
  const key = keyFor(name);
  const current = state.get(key) || { failures: 0, openedAt: 0 };
  const next = {
    failures: current.failures + 1,
    openedAt: Date.now(),
  };
  state.set(key, next);
}

export function getCircuitState(name: string) {
  return state.get(keyFor(name)) || { failures: 0, openedAt: 0 };
}
