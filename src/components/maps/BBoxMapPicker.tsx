import { useEffect, useRef, useState } from "react";
import 'leaflet/dist/leaflet.css';

export type BBoxNumbers = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

type Props = {
  value: Partial<BBoxNumbers>;
  onChange: (b: BBoxNumbers) => void;
  className?: string;
};

/**
 * Click-and-drag rectangle picker on a Leaflet map.
 * Leaflet is imported dynamically so SSR doesn't crash on `window`.
 */
export function BBoxMapPicker({ value, onChange, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const rectRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const dragRef = useRef<{ start: [number, number] | null }>({ start: null });

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return;  // ← add this
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      LRef.current = L;

      const map = L.map(containerRef.current, {
        center: [40, 0],
        zoom: 2,
        worldCopyJump: true,
      });
      L.tileLayer(process.env.NEXT_PUBLIC_MAP_TILE_URL || "", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;
      setReady(true);

      // Leaflet measures its container size once on init. If this component
      // mounts inside a hidden tab panel (Chakra keeps inactive TabPanels in the
      // DOM but display:none), that measurement is wrong/zero, and the map only
      // loads tiles for that stale small area. Re-measure on the next tick, once
      // layout has actually settled.
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
      // Drag-to-draw with shift key OR plain drag while in "draw mode" toggled via button
      // For simplicity: shift+drag draws a rectangle.
      map.on("mousedown", (e: any) => {
        if (!e.originalEvent.shiftKey) return;
        map.dragging.disable();
        dragRef.current.start = [e.latlng.lat, e.latlng.lng];
      });
      map.on("mousemove", (e: any) => {
        const s = dragRef.current.start;
        if (!s) return;
        drawRect(s, [e.latlng.lat, e.latlng.lng]);
      });
      map.on("mouseup", (e: any) => {
        const s = dragRef.current.start;
        map.dragging.enable();
        if (!s) return;
        const end: [number, number] = [e.latlng.lat, e.latlng.lng];
        dragRef.current.start = null;
        const bb: BBoxNumbers = {
          minLat: Math.min(s[0], end[0]),
          maxLat: Math.max(s[0], end[0]),
          minLon: Math.min(s[1], end[1]),
          maxLon: Math.max(s[1], end[1]),
        };
        onChange(bb);
      });
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Sync rectangle from external value changes
  useEffect(() => {
    if (!ready) return;
    const { minLat, maxLat, minLon, maxLon } = value;
    if ([minLat, maxLat, minLon, maxLon].every((v) => typeof v === "number" && !Number.isNaN(v))) {
      drawRect([minLat as number, minLon as number], [maxLat as number, maxLon as number]);
    }
  }, [value.minLat, value.maxLat, value.minLon, value.maxLon, ready]);

  function drawRect(a: [number, number], b: [number, number]) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const bounds = L.latLngBounds(a, b);
    if (rectRef.current) {
      rectRef.current.setBounds(bounds);
    } else {
      rectRef.current = L.rectangle(bounds, {
        color: "#4f46e5",        // border color — indigo, more visible than the current muted gray
        weight: 2,
        opacity: 1,
        dashArray: "6, 6",       // dashed border
        fillColor: "#4f46e5",
        fillOpacity: 0.12,       // lighter fill so map underneath stays readable
      }).addTo(map);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} className={className}>
      <div
        ref={containerRef}
        style={{
          height: '320px',
          width: '100%',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          backgroundColor: '#f7fafc',
        }}
      />
      <p style={{ fontSize: '12px', color: '#718096' }}>
        Hold <kbd style={{ padding: '2px 6px', borderRadius: '4px', background: '#edf2f7', border: '1px solid #e2e8f0', fontSize: '10px' }}>Shift</kbd> and drag
        on the map to draw a bounding box. The N/W/E/S fields will update automatically.
      </p>
    </div>
  );
}
