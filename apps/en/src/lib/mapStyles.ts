/**
 * Shared basemap for EN maps: Esri World Topo — relief and place names from
 * continent view down to city streets, without swapping styles on zoom.
 */
export const MAP_TILES = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  maxZoom: 17,
  attribution:
    'Tiles &copy; <a href="https://www.esri.com">Esri</a> &amp; GIS community',
} as const;

/**
 * Pin colours on light map paper. UI accents are tuned for the dark canvas;
 * these hex values stay readable on topo tiles.
 */
export const ACCENT_PIN_COLOR = {
  jade: "#2f8b57",
  saffron: "#b07d16",
  terracotta: "#c0552c",
  cobalt: "#3d6f8c",
} as const;

export const pinColorForAccent = (
  accent: keyof typeof ACCENT_PIN_COLOR | undefined,
): string => ACCENT_PIN_COLOR[accent ?? "terracotta"];
