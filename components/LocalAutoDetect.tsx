"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function setCookie(name: string, value: string, maxAgeDays = 365) {
  try {
    const maxAge = maxAgeDays * 24 * 60 * 60;
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function LocalAutoDetect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasLocation = Boolean(searchParams.get("location"));
    const hasCoords = Boolean(searchParams.get("lat")) && Boolean(searchParams.get("lon"));
    if (hasLocation || hasCoords) return;

    const existingLabel = window.localStorage.getItem("ogn_local_location") || "";
    const existingLat = Number(window.localStorage.getItem("ogn_local_lat"));
    const existingLon = Number(window.localStorage.getItem("ogn_local_lon"));

    if (existingLabel && Number.isFinite(existingLat) && Number.isFinite(existingLon)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("location", existingLabel);
      params.set("lat", String(existingLat));
      params.set("lon", String(existingLon));
      router.replace(`${pathname}?${params.toString()}`);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/geolocate", { cache: "no-store" });
        const data = (await res.json()) as any;
        if (!alive || !data?.ok) return;

        const label = String(data.label || "").trim();
        const lat = Number(data.lat);
        const lon = Number(data.lon);
        if (!label || !Number.isFinite(lat) || !Number.isFinite(lon)) return;

        window.localStorage.setItem("ogn_local_location", label);
        window.localStorage.setItem("ogn_local_lat", String(lat));
        window.localStorage.setItem("ogn_local_lon", String(lon));

        setCookie("ogn_local_label", label);
        setCookie("ogn_local_lat", String(lat));
        setCookie("ogn_local_lon", String(lon));

        const params = new URLSearchParams(searchParams.toString());
        params.set("location", label);
        params.set("lat", String(lat));
        params.set("lon", String(lon));
        router.replace(`${pathname}?${params.toString()}`);
      } catch {
        // ignore autodetect failures
      }
    })();

    return () => {
      alive = false;
    };
  }, [pathname, router, searchParams]);

  return null;
}
