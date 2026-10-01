import L from "leaflet";
import { tablerIcon } from "@shared/lib/tablerIcon";
import {
  MAP_PAPER_BY_BASEMAP,
  pinColorForAccent,
  resolveBasemap,
  type ResolvedBasemap,
} from "~/lib/mapStyles";
import type { Box, RouteAtlasLayer } from "~/lib/itineraryRouteAtlas";
import {
  placeRouteLabels,
  ROUTE_ICON,
  ROUTE_PIN_R,
  type RouteMap,
} from "~/lib/routeMap";

type DrawnLine = {
  casing: L.Polyline;
  line: L.Polyline;
  transfer: boolean;
};

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function readColor(el: Element, token: string, fallback: string): string {
  return getComputedStyle(el).getPropertyValue(token).trim() || fallback;
}

const ACCENTS = ["jade", "saffron", "terracotta", "cobalt"] as const;

function routeBasemap(mapEl: HTMLElement): ResolvedBasemap {
  if (mapEl.classList.contains("locations-map--film")) return "film";
  if (mapEl.classList.contains("locations-map--paper")) return "paper";
  return resolveBasemap("adaptive");
}

/** Path and pins: deeper on the light map, brighter on the night map. */
function colors(mapEl: HTMLElement): { accent: string; paper: string } {
  const scope = mapEl.closest<HTMLElement>(".accent-scope");
  const name = scope?.dataset.accent;
  const accentName = ACCENTS.find((accent) => accent === name);
  const basemap = routeBasemap(mapEl);
  const accent = pinColorForAccent(accentName, basemap);
  mapEl.style.setProperty("--route-accent", accent);
  return {
    accent,
    paper: readColor(mapEl, "--color-map-paper", MAP_PAPER_BY_BASEMAP[basemap]),
  };
}

function controlBoxes(
  mapEl: HTMLElement,
): { x1: number; y1: number; x2: number; y2: number }[] {
  const mapBox = mapEl.getBoundingClientRect();
  const boxes = [];
  for (const el of mapEl.querySelectorAll<HTMLElement>(
    ".leaflet-control-scale, .leaflet-control-attribution",
  )) {
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;
    boxes.push({
      x1: box.left - mapBox.left - 6,
      y1: box.top - mapBox.top - 6,
      x2: box.right - mapBox.left + 6,
      y2: box.bottom - mapBox.top + 6,
    });
  }
  return boxes;
}

/**
 * Draw the itinerary on an existing map and fit it so the path frames the view.
 * The view stays put: this is the route plate, not a second explorer.
 */
export function mountItineraryRoute(
  map: L.Map,
  route: RouteMap,
  mapEl: HTMLElement,
  atlas: RouteAtlasLayer | null = null,
): { paint: () => void } {
  const lines: DrawnLine[] = [];
  const dots: L.CircleMarker[] = [];
  const markers = L.layerGroup().addTo(map);
  let laidOut = false;

  const paint = (): void => {
    const { accent, paper } = colors(mapEl);
    for (const drawn of lines) {
      const weight = drawn.transfer ? 2.2 : 3;
      drawn.casing.setStyle({
        color: paper,
        weight: weight + 3.5,
        opacity: 0.94,
      });
      drawn.line.setStyle({ color: accent, weight, opacity: 1 });
    }
    for (const dot of dots) {
      dot.setStyle({ color: accent, fillColor: paper });
    }
  };

  const draw = (): void => {
    const { accent, paper } = colors(mapEl);
    for (const drawn of lines) {
      drawn.casing.remove();
      drawn.line.remove();
    }
    lines.length = 0;
    for (const dot of dots) dot.remove();
    dots.length = 0;
    markers.clearLayers();

    for (const segment of route.segments) {
      const dash = segment.transfer ? "7 6" : undefined;
      const weight = segment.transfer ? 2.2 : 3;
      const casing = L.polyline(segment.latlngs, {
        color: paper,
        weight: weight + 3.5,
        opacity: 0.94,
        lineCap: "round",
        lineJoin: "round",
        dashArray: dash,
        interactive: false,
        smoothFactor: 0,
      }).addTo(map);
      const line = L.polyline(segment.latlngs, {
        color: accent,
        weight,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
        dashArray: dash,
        interactive: false,
        smoothFactor: 0,
      }).addTo(map);
      lines.push({ casing, line, transfer: segment.transfer });
    }

    const size = map.getSize();
    const pointOf = (latlng: [number, number]) =>
      map.latLngToContainerPoint(latlng);

    const stopPx = route.stops.map((stop) => {
      const pt = pointOf([stop.lat, stop.lng]);
      return { ...stop, x: pt.x, y: pt.y };
    });
    const linePx = route.segments.map((segment) =>
      segment.latlngs.map((latlng) => pointOf(latlng)),
    );

    const iconBoxes: { x: number; y: number; size: number }[] = [];
    for (const hop of route.transport) {
      if (hop.latlngs.length < 2) continue;
      const pts = hop.latlngs.map((latlng) => pointOf(latlng));
      const p = pts[0]!;
      const q = pts[pts.length - 1]!;
      const mid = pts[Math.floor((pts.length - 1) / 2)]!;
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const gap = 16;
      const candidates = [1, -1].map((side) => ({
        x: Math.round(mid.x + nx * gap * side - ROUTE_ICON / 2),
        y: Math.round(mid.y + ny * gap * side - ROUTE_ICON / 2),
      }));
      const inside = (c: { x: number; y: number }) =>
        c.x >= 4 &&
        c.y >= 4 &&
        c.x + ROUTE_ICON <= size.x - 4 &&
        c.y + ROUTE_ICON <= size.y - 4;
      const at = candidates.find(inside) ?? candidates[0];
      if (!at) continue;
      iconBoxes.push({ x: at.x, y: at.y, size: ROUTE_ICON });

      const midLatLng = hop.latlngs[Math.floor((hop.latlngs.length - 1) / 2)]!;
      L.marker(midLatLng, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: "route-mode-wrap",
          html: `<span class="route-mode">${tablerIcon(hop.mode)}</span>`,
          iconSize: [ROUTE_ICON, ROUTE_ICON],
          iconAnchor: [mid.x - at.x, mid.y - at.y],
        }),
      }).addTo(markers);
    }

    const labels = placeRouteLabels(
      stopPx,
      linePx,
      iconBoxes,
      controlBoxes(mapEl),
      size.x,
      size.y,
    );

    const occupied: Box[] = [...controlBoxes(mapEl)];
    for (const st of stopPx) {
      const r = st.parts.length
        ? (st.parts.length * (ROUTE_PIN_R * 2 + 2)) / 2 + 4
        : 8;
      occupied.push({ x1: st.x - r, y1: st.y - r, x2: st.x + r, y2: st.y + r });
    }
    for (const icon of iconBoxes) {
      occupied.push({
        x1: icon.x - 4,
        y1: icon.y - 4,
        x2: icon.x + icon.size + 4,
        y2: icon.y + icon.size + 4,
      });
    }
    for (const line of linePx) {
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1]!;
        const b = line[i]!;
        const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 10));
        for (let s = 0; s <= steps; s++) {
          const x = a.x + ((b.x - a.x) * s) / steps;
          const y = a.y + ((b.y - a.y) * s) / steps;
          occupied.push({ x1: x - 5, y1: y - 5, x2: x + 5, y2: y + 5 });
        }
      }
    }

    for (const label of labels) {
      const stop = stopPx[label.stopIndex];
      if (!stop) continue;
      const w = label.text.length * (label.strong ? 7.8 : 6.9);
      const h = label.strong ? 14 : 13;
      const x1 =
        label.anchor === "start"
          ? label.x
          : label.anchor === "end"
            ? label.x - w
            : label.x - w / 2;
      const y1 = label.y - h + 2;
      occupied.push({ x1: x1 - 6, y1: y1 - 4, x2: x1 + w + 6, y2: y1 + h + 4 });
      L.marker([stop.lat, stop.lng], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: "route-label-wrap",
          html: `<span class="route-label${label.strong ? " is-strong" : ""}">${escapeHtml(label.text)}</span>`,
          iconSize: [Math.ceil(w), h + 1],
          iconAnchor: [stop.x - x1, stop.y - y1],
        }),
      }).addTo(markers);
    }

    route.stops.forEach((stop, index) => {
      const px = stopPx[index];
      if (!px) return;
      if (stop.parts.length === 0) {
        dots.push(
          L.circleMarker([stop.lat, stop.lng], {
            radius: 4.5,
            weight: 2.5,
            color: accent,
            fillColor: paper,
            fillOpacity: 1,
            opacity: 1,
            interactive: false,
          }).addTo(map),
        );
        return;
      }
      const n = stop.parts.length;
      stop.parts.forEach((num, i) => {
        const xOff = (i - (n - 1) / 2) * (ROUTE_PIN_R * 2 + 2);
        L.marker([stop.lat, stop.lng], {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: "route-pin-wrap",
            html: `<span class="route-pin">${num}</span>`,
            iconSize: [ROUTE_PIN_R * 2, ROUTE_PIN_R * 2],
            iconAnchor: [ROUTE_PIN_R - xOff, ROUTE_PIN_R],
          }),
        }).addTo(markers);
      });
    });

    atlas?.placeLabels(occupied);
  };

  let lastW = 0;
  let lastH = 0;
  let tries = 0;
  let observer: ResizeObserver | undefined;

  const layout = (): void => {
    if (!mapEl.isConnected) {
      observer?.disconnect();
      return;
    }
    map.invalidateSize({ animate: false, pan: false });
    const size = map.getSize();
    if (size.x < 20 || size.y < 20) {
      if (tries++ < 20) requestAnimationFrame(layout);
      return;
    }
    if (size.x === lastW && size.y === lastH && laidOut) return;
    lastW = size.x;
    lastH = size.y;
    const padX = (size.x * route.pad) / route.width;
    const padY = (size.y * route.pad) / route.height;
    map.fitBounds(route.bounds, {
      paddingTopLeft: [padX, padY],
      paddingBottomRight: [padX, padY],
      animate: false,
    });
    draw();
    laidOut = true;
  };

  observer = new ResizeObserver(() => layout());
  observer.observe(mapEl);
  layout();

  return { paint };
}
