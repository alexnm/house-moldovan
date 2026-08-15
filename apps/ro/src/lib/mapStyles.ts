/**
 * One basemap for every map on the site: Esri World Topo Map. It holds relief
 * and place names from country view down to the slope, and keeps its contour
 * lines past mid zoom, so nothing has to swap styles as the reader zooms.
 */
export const MAP_TILES = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  maxZoom: 17,
  attribution:
    'Dale &copy; <a href="https://www.esri.com">Esri</a> și comunitatea GIS',
} as const;

/**
 * Difficulty on map paper: the jade / saffron / terracotta ladder, darkened
 * since the UI accents are tuned for the dark canvas, not for light tiles.
 */
const DIFFICULTY_COLOR: Record<string, string> = {
  usor: "#2f8b57",
  mediu: "#b07d16",
  dificil: "#c0552c",
  tehnic: "#8f2f1c",
};

export const difficultyColor = (difficulty: string): string =>
  DIFFICULTY_COLOR[difficulty] ?? "#a8482c";
