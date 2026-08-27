/**
 * Country outlines for map highlighting, traced from Natural Earth 10m and
 * stored as Leaflet-ready `[lat, lng]` rings so the client does no conversion.
 */
export type CountryShape = {
  id: string;
  name: string;
  rings: [number, number][][];
};

const shapeModules = import.meta.glob<CountryShape>(
  "../data/country-shapes/*.json",
  { eager: true, import: "default" },
);

const shapeById = new Map(
  Object.values(shapeModules).map((shape) => [shape.id, shape] as const),
);

export const getCountryShape = (placeId: string): CountryShape | undefined =>
  shapeById.get(placeId);
