/**
 * Shared basemap for EN maps: Carto Voyager in light mode — colour and road
 * detail without swapping styles on zoom.
 */
export type MapTileConfig = {
  url: string;
  maxZoom: number;
  attribution: string;
  subdomains?: string;
};

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const ESRI_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com">Esri</a> &amp; GIS community';

/** Free at https://carto.com/basemaps/apikey — required for production raster tiles. */
const CARTO_API_KEY = import.meta.env.PUBLIC_CARTO_API_KEY?.trim();

const withCartoKey = (url: string): string => {
  if (!CARTO_API_KEY) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}key=${encodeURIComponent(CARTO_API_KEY)}`;
};

export const MAP_TILES = {
  url: withCartoKey(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  ),
  maxZoom: 20,
  attribution: CARTO_ATTRIBUTION,
  subdomains: "abcd",
} as const satisfies MapTileConfig;

/**
 * Night basemap: Esri dark gray canvas so pins and routes carry the colour
 * instead of the terrain.
 */
export const MAP_TILES_FILM = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  maxZoom: 16,
  attribution: ESRI_ATTRIBUTION,
} as const satisfies MapTileConfig;

export type ResolvedBasemap = "paper" | "film";

/** `adaptive` follows site theme: Voyager in light mode, Esri dark gray at night. */
export type Basemap = ResolvedBasemap | "adaptive";

export const MAP_TILES_BY_BASEMAP = {
  paper: MAP_TILES,
  film: MAP_TILES_FILM,
} as const;

export const resolveBasemap = (basemap: Basemap): ResolvedBasemap => {
  if (basemap !== "adaptive") return basemap;
  return document.documentElement.dataset.theme === "light" ? "paper" : "film";
};

export const tileLayerOptions = (
  tiles: MapTileConfig,
): {
  attribution: string;
  maxZoom: number;
  crossOrigin: boolean;
  subdomains?: string;
} => ({
  attribution: tiles.attribution,
  maxZoom: tiles.maxZoom,
  crossOrigin: true,
  ...(tiles.subdomains ? { subdomains: tiles.subdomains } : {}),
});

/**
 * Pin colours on the light Voyager canvas. UI accents are tuned for the dark
 * canvas; these hex values stay readable on colour basemaps.
 */
export const ACCENT_PIN_COLOR = {
  jade: "#2f8b57",
  saffron: "#b07d16",
  terracotta: "#c0552c",
  cobalt: "#3d6f8c",
} as const;

/** Same chapters, pushed brighter so they hold up on the night basemap. */
export const ACCENT_PIN_COLOR_FILM = {
  jade: "#5fd394",
  saffron: "#ffc93f",
  terracotta: "#ff9257",
  cobalt: "#79b6e6",
} as const;

export const ACCENT_PIN_COLOR_BY_BASEMAP = {
  paper: ACCENT_PIN_COLOR,
  film: ACCENT_PIN_COLOR_FILM,
} as const;

/**
 * Voyager clipped to a highlighted country on the night basemap — the shape
 * keeps colour and labels instead of turning into a flat cut-out.
 */
export const MAP_HIGHLIGHT_TILES_BY_BASEMAP = {
  paper: null,
  film: {
    url: MAP_TILES.url,
    maxZoom: MAP_TILES.maxZoom,
    subdomains: MAP_TILES.subdomains,
  },
} as const;

/**
 * Country-shape highlight: the neighbours sink under a wash while the subject
 * country is lifted with a warm glaze and a traced edge. Hex rather than
 * tokens because these paint SVG on the tiles.
 */
export const COUNTRY_HIGHLIGHT_BY_BASEMAP = {
  paper: {
    mask: "#241c14",
    maskOpacity: 0.2,
    glow: "var(--color-accent)",
    glowOpacity: 0.1,
    edge: "#3a2c20",
    edgeOpacity: 0.55,
  },
  film: {
    mask: "#0b0e12",
    maskOpacity: 0.22,
    glow: "var(--color-accent)",
    glowOpacity: 0.1,
    edge: "#fbf3e6",
    edgeOpacity: 0.5,
  },
} as const;

export const pinColorForAccent = (
  accent: keyof typeof ACCENT_PIN_COLOR | undefined,
  basemap: ResolvedBasemap = "paper",
): string => ACCENT_PIN_COLOR_BY_BASEMAP[basemap][accent ?? "terracotta"];

/**
 * Chapter accents for map popups. Popups always use the film-night palette, so
 * these stay on the dark-canvas values instead of theme-aware `-ink` tokens.
 */
export const MAP_POP_ACCENT = {
  jade: "oklch(0.75 0.175 155)",
  saffron: "oklch(0.9 0.19 85)",
  terracotta: "oklch(0.75 0.19 35)",
  cobalt: "oklch(0.77 0.15 250)",
} as const;

export const mapPopAccentColor = (
  accent: keyof typeof MAP_POP_ACCENT | undefined,
): string => MAP_POP_ACCENT[accent ?? "terracotta"];
