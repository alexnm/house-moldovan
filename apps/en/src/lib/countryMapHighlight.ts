import L from "leaflet";
import {
  COUNTRY_HIGHLIGHT_BY_BASEMAP,
  MAP_HIGHLIGHT_TILES_BY_BASEMAP,
  tileLayerOptions,
  type MapTileConfig,
  type ResolvedBasemap,
} from "~/lib/mapStyles";

type Ring = [number, number][];

type ProjectableMap = L.Map & {
  _latLngToNewLayerPoint(
    latlng: L.LatLngExpression,
    zoom: number,
    center: L.LatLng,
  ): L.Point;
  _latLngBoundsToNewLayerBounds(
    latlngBounds: L.LatLngBounds,
    zoom: number,
    center: L.LatLng,
  ): L.Bounds;
};

const SVG_NS = "http://www.w3.org/2000/svg";

const WORLD_RING: Ring = [
  [-89.9, -179.9],
  [-89.9, 179.9],
  [89.9, 179.9],
  [89.9, -179.9],
];

function zoomEventFrom(event?: L.LeafletEvent): L.ZoomAnimEvent | undefined {
  return event?.type === "zoomanim" ? (event as L.ZoomAnimEvent) : undefined;
}

function projectRingPoint(
  map: ProjectableMap,
  point: Ring[number],
  zoomEvent?: L.ZoomAnimEvent,
): L.Point {
  const latlng = L.latLng(point[0], point[1]);
  if (zoomEvent) {
    return map._latLngToNewLayerPoint(latlng, zoomEvent.zoom, zoomEvent.center);
  }
  return map.latLngToLayerPoint(latlng);
}

function ringPath(
  map: ProjectableMap,
  ring: Ring,
  zoomEvent?: L.ZoomAnimEvent,
): string {
  return (
    ring
      .map((point, index) => {
        const { x, y } = projectRingPoint(map, point, zoomEvent);
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

function ringsPath(
  map: ProjectableMap,
  ringList: Ring[],
  zoomEvent?: L.ZoomAnimEvent,
): string {
  return ringList.map((ring) => ringPath(map, ring, zoomEvent)).join(" ");
}

function layerViewBox(
  map: ProjectableMap,
  zoomEvent?: L.ZoomAnimEvent,
): { topLeft: L.Point; width: number; height: number } {
  const size = map.getSize();

  if (zoomEvent) {
    const bounds = map._latLngBoundsToNewLayerBounds(
      L.latLngBounds(
        map.containerPointToLatLng(L.point(0, size.y)),
        map.containerPointToLatLng(L.point(size.x, 0)),
      ),
      zoomEvent.zoom,
      zoomEvent.center,
    );
    return {
      topLeft: bounds.min,
      width: bounds.max.x - bounds.min.x,
      height: bounds.max.y - bounds.min.y,
    };
  }

  const topLeft = map.containerPointToLayerPoint(L.point(0, 0));
  const bottomRight = map.containerPointToLayerPoint(L.point(size.x, size.y));
  return {
    topLeft,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

export type CountryHighlightController = {
  setBasemap: (basemap: ResolvedBasemap) => void;
  setRings: (next: Ring[]) => void;
  setPaused: (paused: boolean) => void;
  sync: () => void;
  destroy: () => void;
};

function boundsFromRings(ringList: Ring[]): L.LatLngBounds {
  const bounds = L.latLngBounds([]);
  for (const ring of ringList) {
    for (const point of ring) bounds.extend(point);
  }
  return bounds;
}

/** Country outline, glow, mask, and optional daylight tile clip — one sync path. */
export function mountCountryHighlight(
  map: L.Map,
  initialRings: Ring[],
  basemap: ResolvedBasemap,
  initialBounds: L.LatLngBounds,
): CountryHighlightController {
  let rings = initialRings;
  let highlightBounds = initialBounds.isValid()
    ? initialBounds
    : boundsFromRings(rings);
  let syncPaused = false;

  const projectableMap = map as ProjectableMap;
  let currentBasemap = basemap;
  let dayTileLayer: L.TileLayer | null = null;
  let dayPane: HTMLElement | null = null;

  const svgPane = map.createPane("countryHighlight");
  svgPane.style.zIndex = "360";
  svgPane.style.pointerEvents = "none";

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("pointer-events", "none");
  svgPane.appendChild(svg);

  const maskPath = document.createElementNS(SVG_NS, "path");
  const glowPath = document.createElementNS(SVG_NS, "path");
  const edgePath = document.createElementNS(SVG_NS, "path");

  maskPath.setAttribute("fill-rule", "evenodd");
  edgePath.setAttribute("fill", "none");
  edgePath.setAttribute("stroke-width", "1.25");
  edgePath.setAttribute("stroke-linejoin", "round");
  svg.append(maskPath, glowPath, edgePath);

  const clearDayTiles = (): void => {
    if (dayTileLayer) {
      map.removeLayer(dayTileLayer);
      dayTileLayer = null;
    }
    dayPane?.remove();
    dayPane = null;
  };

  const applyBasemapStyles = (resolved: ResolvedBasemap): void => {
    const style = COUNTRY_HIGHLIGHT_BY_BASEMAP[resolved];
    const dayTiles = MAP_HIGHLIGHT_TILES_BY_BASEMAP[resolved];

    maskPath.setAttribute("fill", style.mask);
    maskPath.setAttribute("fill-opacity", String(style.maskOpacity));
    glowPath.setAttribute("fill", style.glow);
    glowPath.setAttribute("fill-opacity", String(style.glowOpacity));
    glowPath.style.mixBlendMode = dayTiles ? "multiply" : "screen";
    edgePath.setAttribute("stroke", style.edge);
    edgePath.setAttribute("stroke-opacity", String(style.edgeOpacity));

    if (!rings.length) {
      clearDayTiles();
      return;
    }

    if (dayTiles && !dayTileLayer) {
      dayPane = map.createPane("countryTiles");
      dayPane.style.zIndex = "250";
      dayPane.style.pointerEvents = "none";

      dayTileLayer = L.tileLayer(dayTiles.url, {
        ...tileLayerOptions(dayTiles as MapTileConfig),
        pane: "countryTiles",
        bounds: highlightBounds,
      }).addTo(map);
    }

    if (!dayTiles && dayTileLayer) {
      clearDayTiles();
    }
  };

  const syncHighlight = (event?: L.LeafletEvent): void => {
    if (!rings.length || syncPaused) return;

    const animatingZoom = (
      map as L.Map & { _animatingZoom?: boolean }
    )._animatingZoom;
    if (event?.type !== "zoomanim" && animatingZoom) return;

    const zoomEvent = zoomEventFrom(event);
    const countryPath = ringsPath(projectableMap, rings, zoomEvent);
    const { topLeft, width, height } = layerViewBox(projectableMap, zoomEvent);

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute(
      "viewBox",
      `${topLeft.x} ${topLeft.y} ${width} ${height}`,
    );
    L.DomUtil.setPosition(svg, topLeft);

    maskPath.setAttribute(
      "d",
      `${ringPath(projectableMap, WORLD_RING, zoomEvent)} ${countryPath}`,
    );
    glowPath.setAttribute("d", countryPath);
    edgePath.setAttribute("d", countryPath);

    if (dayPane) {
      dayPane.style.clipPath = `path("${countryPath}")`;
    }
  };

  const setRings = (next: Ring[]): void => {
    rings = next;
    highlightBounds = boundsFromRings(next);
    clearDayTiles();

    if (!rings.length) {
      svgPane.style.display = "none";
      maskPath.removeAttribute("d");
      glowPath.removeAttribute("d");
      edgePath.removeAttribute("d");
      return;
    }

    svgPane.style.display = "";
    applyBasemapStyles(currentBasemap);
    syncHighlight();
  };

  if (!rings.length) {
    svgPane.style.display = "none";
  } else {
    applyBasemapStyles(currentBasemap);
    syncHighlight();
  }
  map.on("viewreset move zoom zoomanim", syncHighlight);

  return {
    setBasemap: (resolved: ResolvedBasemap) => {
      if (resolved === currentBasemap) return;
      currentBasemap = resolved;
      if (!rings.length) return;
      applyBasemapStyles(resolved);
      syncHighlight();
    },
    setRings,
    setPaused: (paused: boolean) => {
      syncPaused = paused;
      if (!paused && rings.length) syncHighlight();
    },
    sync: () => syncHighlight(),
    destroy: () => {
      map.off("viewreset move zoom zoomanim", syncHighlight);
      clearDayTiles();
      svgPane.remove();
    },
  };
}

/** @deprecated Use mountCountryHighlight — kept for simple one-shot mounts. */
export function drawCountryHighlight(
  map: L.Map,
  rings: Ring[],
  basemap: ResolvedBasemap,
  highlightBounds: L.LatLngBounds,
): void {
  mountCountryHighlight(map, rings, basemap, highlightBounds);
}
