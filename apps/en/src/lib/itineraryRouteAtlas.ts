import L from "leaflet";
import { NATURAL_EARTH_ATTRIBUTION } from "~/lib/mapStyles";
import type { RouteAtlas } from "~/lib/routeMap";

export const ATLAS_MAX_ZOOM = 12;

export type Box = { x1: number; y1: number; x2: number; y2: number };

export type RegionAtlasOptions = {
  /** Natural Earth country names that belong to this region (clickable). */
  regionCountryNames: readonly string[];
  onSelect?: (name: string) => void;
};

export type RouteAtlasLayer = {
  setVisible: (visible: boolean) => void;
  /** Light one country and sink the rest. `null` draws every country equal. */
  setFocus: (name: string | null) => void;
  /** Region hub: tint one country on list hover (no zoom / selection). */
  setPreview: (name: string | null) => void;
  /** Place country names in container pixels, clear of `occupied`. */
  placeLabels: (occupied: readonly Box[]) => void;
};

const PANE = "routeAtlas";
const LABEL_PANE = "routeAtlasLabels";
const CHAR_W = 8;
const LABEL_H = 12;
const EDGE = 10;

const overlaps = (a: Box, b: Box) =>
  a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Vector world under the route: land, lakes and country names. Sits below the
 * route panes, and replaces the tiles in whichever theme selects `atlas`.
 */
export function mountRouteAtlas(
  map: L.Map,
  atlas: RouteAtlas,
  mapEl: HTMLElement,
  regionOptions?: RegionAtlasOptions,
): RouteAtlasLayer {
  const regionNames = new Set(regionOptions?.regionCountryNames ?? []);
  const regionHub = regionNames.size > 0;
  const pane = map.createPane(PANE);
  pane.style.zIndex = "250";
  const labelPane = map.createPane(LABEL_PANE);
  labelPane.style.zIndex = "390";
  // The pane covers the map. Hits pass through except on the labels themselves.
  labelPane.style.pointerEvents = "none";

  const renderer = L.svg({ pane: PANE, padding: 0.5 });
  const shapes = L.layerGroup();
  const landByName = new Map<string, L.Polygon>();

  for (const country of atlas.countries) {
    const inRegion = regionNames.has(country.name);
    const polygon = L.polygon(
      country.rings.map((ring) => [ring]),
      {
        pane: PANE,
        renderer,
        className: "atlas-land",
        interactive: regionHub && inRegion,
        smoothFactor: 0.6,
      },
    ).addTo(shapes);
    landByName.set(country.name, polygon);
  }
  let lakes: L.Polygon | null = null;
  if (atlas.lakes.length) {
    lakes = L.polygon(
      atlas.lakes.map((ring) => [ring]),
      {
        pane: PANE,
        renderer,
        className: "atlas-lake",
        interactive: false,
        smoothFactor: 0.6,
      },
    ).addTo(shapes);
  }

  const labels = L.layerGroup();
  let visible = false;
  let focusName: string | null = null;
  let previewName: string | null = null;

  const focusClass = (name: string): string => {
    const parts = ["atlas-land"];
    if (regionNames.has(name)) parts.push("is-region");
    if (name === focusName) parts.push("is-focus");
    else if (name === previewName) parts.push("is-preview");
    return parts.join(" ");
  };

  const applyFocus = (): void => {
    mapEl.classList.toggle("locations-map--atlas-focus", focusName !== null);
    for (const [name, polygon] of landByName) {
      // Set before the path exists so the first draw is already focused.
      polygon.options.className = focusClass(name);
      polygon.getElement()?.setAttribute("class", focusClass(name));
    }
    if (!visible) return;
    const focused = focusName ? landByName.get(focusName) : undefined;
    if (regionHub) {
      const previewed = previewName ? landByName.get(previewName) : undefined;
      for (const [name, polygon] of landByName) {
        if (!regionNames.has(name) || polygon === focused || polygon === previewed)
          continue;
        polygon.bringToFront();
      }
      previewed?.bringToFront();
      focused?.bringToFront();
      lakes?.bringToFront();
    } else if (focused) {
      focused.bringToFront();
      lakes?.bringToFront();
    }
    for (const el of labelPane.querySelectorAll<HTMLElement>(
      "[data-atlas-country]",
    )) {
      el.classList.toggle("is-focus", el.dataset.atlasCountry === focusName);
      el.classList.toggle(
        "is-preview",
        focusName === null && el.dataset.atlasCountry === previewName,
      );
    }
  };

  const setFocus = (name: string | null): void => {
    focusName = name;
    if (name !== null) previewName = null;
    applyFocus();
  };

  const setPreview = (name: string | null): void => {
    if (focusName !== null) return;
    previewName = name;
    applyFocus();
  };

  const setVisible = (next: boolean): void => {
    if (next === visible) return;
    visible = next;
    mapEl.classList.toggle("locations-map--atlas", next);
    if (next) {
      applyFocus();
      shapes.addTo(map);
      labels.addTo(map);
      map.attributionControl.addAttribution(NATURAL_EARTH_ATTRIBUTION);
      applyFocus();
    } else {
      shapes.remove();
      labels.remove();
      map.attributionControl.removeAttribution(NATURAL_EARTH_ATTRIBUTION);
    }
  };

  const placeLabels = (occupied: readonly Box[]): void => {
    labels.clearLayers();
    const size = map.getSize();
    const taken: Box[] = [...occupied];
    const ordered = [...atlas.countries].sort((a, b) => a.rank - b.rank);

    for (const country of ordered) {
      if (regionHub && !regionNames.has(country.name)) continue;
      const pt = map.latLngToContainerPoint(country.label);
      const text = country.name.toUpperCase();
      const w = text.length * CHAR_W + (regionHub ? 16 : 0);
      const fits = (y: number): Box | null => {
        const box = {
          x1: pt.x - w / 2,
          y1: y - LABEL_H / 2,
          x2: pt.x + w / 2,
          y2: y + LABEL_H / 2,
        };
        const inside =
          box.x1 >= EDGE &&
          box.y1 >= EDGE &&
          box.x2 <= size.x - EDGE &&
          box.y2 <= size.y - EDGE;
        return inside && !taken.some((o) => overlaps(o, box)) ? box : null;
      };
      let box: Box | null = null;
      for (const dy of [0, -16, 16, -32, 32]) {
        box = fits(pt.y + dy);
        if (box) break;
      }
      if (!box) continue;
      taken.push(box);
      const safeName = escapeHtml(country.name);
      const labelClass = regionHub
        ? `atlas-label atlas-label--pill${country.name === focusName ? " is-focus" : ""}${focusName === null && country.name === previewName ? " is-preview" : ""}`
        : `atlas-label${country.name === focusName ? " is-focus" : ""}`;
      const labelHtml = regionHub
        ? `<button type="button" class="${labelClass}" data-atlas-country="${safeName}">${escapeHtml(text)}</button>`
        : `<span class="${labelClass}" data-atlas-country="${safeName}">${escapeHtml(text)}</span>`;
      const marker = L.marker(
        map.containerPointToLatLng([pt.x, (box.y1 + box.y2) / 2]),
        {
          pane: LABEL_PANE,
          interactive: regionHub,
          keyboard: false,
          icon: L.divIcon({
            className: "atlas-label-wrap",
            html: labelHtml,
            iconSize: [Math.ceil(w), LABEL_H],
            iconAnchor: [w / 2, LABEL_H / 2],
          }),
        },
      ).addTo(labels);
      if (regionHub && regionOptions?.onSelect) {
        marker.on("click", () => {
          regionOptions.onSelect!(country.name);
        });
        marker.on("mouseover", () => setPreview(country.name));
        marker.on("mouseout", () => {
          if (previewName === country.name) setPreview(null);
        });
      }
    }
  };

  if (regionHub) {
    for (const [name, polygon] of landByName) {
      if (!regionNames.has(name)) continue;
      polygon.on("mouseover", () => {
        if (focusName !== null) return;
        setPreview(name);
      });
      polygon.on("mouseout", () => {
        if (focusName !== null) return;
        if (previewName === name) setPreview(null);
      });
    }
  }

  return { setVisible, setFocus, setPreview, placeLabels };
}

