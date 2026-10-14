import type { CollectionEntry } from "astro:content";
import { accentInkVar, type Accent } from "@shared/lib/accent";
import { getPublishedPlaces } from "~/lib/content";
import { getAllRegions, regionIdFromPlace } from "~/lib/regions";

/** One inked visit beside the authors' note. */
export interface NoteStamp {
  id: string;
  country: string;
  localName?: string;
  forceLocalName?: boolean;
  year: number;
  label?: string;
  /** CSS color. Omit to inherit the page accent ink. */
  ink?: string;
}

/**
 * One stamp per region: the country visited most recently there.
 * Ties break by country name. Used on the home and about notes.
 */
export async function homeNoteStamps(): Promise<NoteStamp[]> {
  const [places, regions] = await Promise.all([
    getPublishedPlaces(),
    getAllRegions(),
  ]);

  return [...regions]
    .sort((a, b) => a.data.order - b.data.order)
    .flatMap((region) => {
      const latest = places
        .filter((place) => regionIdFromPlace(place) === region.id)
        .flatMap((place) =>
          place.data.visits.map((visit) => ({ place, visit })),
        )
        .sort(
          (a, b) =>
            b.visit.year - a.visit.year ||
            a.place.data.name.localeCompare(b.place.data.name),
        )[0];
      if (!latest) return [];
      const accent: Accent = latest.place.data.accent ?? region.data.accent;
      return [
        {
          id: `note-${latest.place.id}-${latest.visit.year}`,
          country: latest.place.data.name,
          localName: latest.place.data.localName,
          forceLocalName: latest.place.data.stampLocalName,
          year: latest.visit.year,
          label: latest.visit.label,
          ink: accentInkVar(accent),
        },
      ];
    })
    .slice(0, 4);
}

/** Three most recent trips in a region, one stamp per country. */
export function regionNoteStamps(
  places: CollectionEntry<"places">[],
): NoteStamp[] {
  return places
    .flatMap((place) => {
      const latest = [...place.data.visits].sort((a, b) => b.year - a.year)[0];
      return latest ? [{ place, visit: latest }] : [];
    })
    .sort(
      (a, b) =>
        b.visit.year - a.visit.year ||
        a.place.data.name.localeCompare(b.place.data.name),
    )
    .slice(0, 3)
    .map((stamp) => ({
      id: `region-note-${stamp.place.id}-${stamp.visit.year}`,
      country: stamp.place.data.name,
      localName: stamp.place.data.localName,
      forceLocalName: stamp.place.data.stampLocalName,
      year: stamp.visit.year,
      label: stamp.visit.label,
    }));
}
