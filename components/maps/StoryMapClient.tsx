"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = {
  id: string;
  slug: string;
  title: string;
  topic: string;
  location: string;
  lat: number;
  lon: number;
  bias: { left: number; center: number; right: number };
  sourceCount: number;
};

function dominantBias(point: Point): "left" | "center" | "right" {
  if (point.bias.center >= point.bias.left && point.bias.center >= point.bias.right) return "center";
  if (point.bias.left >= point.bias.right) return "left";
  return "right";
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function StoryMapClient({ points }: { points: Point[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [error, setError] = useState<string>("");
  const [mapReady, setMapReady] = useState(false);
  const [biasFilter, setBiasFilter] = useState<"all" | "left" | "center" | "right">("all");
  const [topicQuery, setTopicQuery] = useState("");
  const [minSources, setMinSources] = useState(0);

  const stablePoints = useMemo(() => points.slice(0, 800), [points]);
  const filteredPoints = useMemo(
    () =>
      stablePoints.filter((point) => {
        if (biasFilter !== "all" && dominantBias(point) !== biasFilter) return false;
        if (minSources > 0 && point.sourceCount < minSources) return false;
        if (topicQuery.trim().length > 0) {
          const needle = topicQuery.trim().toLowerCase();
          const haystack = `${point.title} ${point.topic} ${point.location}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      }),
    [stablePoints, biasFilter, minSources, topicQuery],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (!mounted || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: "https://demotiles.maplibre.org/style.json",
          center: [0, 20],
          zoom: 1.2,
        });
        mapRef.current = map;

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        map.on("load", () => {
          if (!mounted) return;
          map.addSource("stories", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            cluster: true,
            clusterMaxZoom: 8,
            clusterRadius: 48,
          });

          map.addLayer({
            id: "story-clusters",
            type: "circle",
            source: "stories",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#264653",
                12,
                "#2a9d8f",
                30,
                "#e9c46a",
                70,
                "#f4a261",
              ],
              "circle-radius": ["step", ["get", "point_count"], 15, 12, 19, 30, 24, 70, 30],
              "circle-opacity": 0.86,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
            },
          });

          map.addLayer({
            id: "story-cluster-count",
            type: "symbol",
            source: "stories",
            filter: ["has", "point_count"],
            layout: {
              "text-field": "{point_count_abbreviated}",
              "text-font": ["Open Sans Bold"],
              "text-size": 12,
            },
            paint: {
              "text-color": "#111111",
            },
          });

          map.addLayer({
            id: "story-point",
            type: "circle",
            source: "stories",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": [
                "match",
                ["get", "dominantBias"],
                "left",
                "#9a4040",
                "center",
                "#709e55",
                "right",
                "#406699",
                "#888888",
              ],
              "circle-radius": ["interpolate", ["linear"], ["get", "sourceCount"], 1, 5, 30, 11],
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 0.88,
            },
          });

          map.on("click", "story-clusters", (event: any) => {
            const features = map.queryRenderedFeatures(event.point, { layers: ["story-clusters"] });
            if (!features.length) return;
            const clusterId = features[0].properties?.cluster_id;
            const source: any = map.getSource("stories");
            if (!source || typeof source.getClusterExpansionZoom !== "function" || clusterId === undefined || clusterId === null) {
              return;
            }
            source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
              if (err) return;
              map.easeTo({
                center: (features[0].geometry as any).coordinates,
                zoom,
                duration: 500,
              });
            });
          });

          map.on("click", "story-point", (event: any) => {
            const feature = event.features?.[0];
            if (!feature) return;
            const coordinates = feature.geometry.coordinates.slice();
            const props = feature.properties || {};
            const html = [
              `<div class="u-grid u-grid-gap-02">`,
              `<strong>${escapeHtml(props.title || "Story")}</strong>`,
              `<span>${escapeHtml(props.topic || "Top Stories")} • ${escapeHtml(props.location || "International")}</span>`,
              `<a href="/story/${encodeURIComponent(String(props.slug || ""))}" target="_blank" rel="noreferrer">Open story</a>`,
              `</div>`,
            ].join("");
            new maplibregl.Popup({ offset: 20 }).setLngLat(coordinates).setHTML(html).addTo(map);
          });

          map.on("mouseenter", "story-clusters", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "story-clusters", () => {
            map.getCanvas().style.cursor = "";
          });
          map.on("mouseenter", "story-point", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "story-point", () => {
            map.getCanvas().style.cursor = "";
          });

          setMapReady(true);
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Map failed to load");
      }
    })();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const source = map.getSource("stories");
    if (!source) return;
    const data = {
      type: "FeatureCollection",
      features: filteredPoints.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [point.lon, point.lat],
        },
        properties: {
          id: point.id,
          slug: point.slug,
          title: point.title,
          topic: point.topic,
          location: point.location,
          sourceCount: point.sourceCount,
          dominantBias: dominantBias(point),
        },
      })),
    };
    source.setData(data);
  }, [filteredPoints, mapReady]);

  return (
    <section className="panel u-grid u-grid-gap-06">
      <div className="section-title u-pt-0">
        <h1 className="u-m0">Story Map</h1>
        <span className="story-meta">{filteredPoints.length} mapped stories</span>
      </div>
      <div className="filters-grid">
        <label className="story-meta u-grid u-grid-gap-02">
          Search
          <input
            className="input-control"
            value={topicQuery}
            onChange={(event) => setTopicQuery(event.target.value)}
            placeholder="Topic, title, or location"
          />
        </label>
        <label className="story-meta u-grid u-grid-gap-02">
          Bias
          <select
            className="select-control"
            value={biasFilter}
            onChange={(event) => setBiasFilter(event.target.value as "all" | "left" | "center" | "right")}
          >
            <option value="all">All</option>
            <option value="left">Left-leading</option>
            <option value="center">Center-leading</option>
            <option value="right">Right-leading</option>
          </select>
        </label>
        <label className="story-meta u-grid u-grid-gap-02">
          Min sources
          <input
            className="input-control"
            type="number"
            min={0}
            max={99}
            step={1}
            value={minSources}
            onChange={(event) => setMinSources(Math.max(0, Number(event.target.value) || 0))}
          />
        </label>
      </div>
      <div className="chip-row">
        <span className="chip">Clusters auto-expand as you zoom</span>
        <span className="chip">Marker size reflects source count</span>
      </div>
      {error ? <p className="story-meta u-m0">Map unavailable: {error}</p> : null}
      <div ref={containerRef} style={{ width: "100%", height: 560, borderRadius: 12, overflow: "hidden" }} />
      {!error && filteredPoints.length === 0 ? (
        <p className="story-meta u-m0">No mapped stories match your filters.</p>
      ) : null}
    </section>
  );
}
