#!/usr/bin/env node
/**
 * One-off migration: country locations + article location refs.
 * Run from repo root: node .dev-shots/migrate-locations.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const PLACES = join(ROOT, "apps/en/src/content/places");
const CONTENT = join(ROOT, "apps/en/src/content");

/** @type {Record<string, { id: string, name: string, lat: number, lng: number, image?: string }[]>} */
const COUNTRY_LOCATIONS = {
  jordan: [
    { id: "petra", name: "Petra", lat: 30.3285, lng: 35.4444 },
    { id: "wadi-rum", name: "Wadi Rum", lat: 29.5328, lng: 35.4206 },
  ],
  israel: [
    { id: "tel-aviv", name: "Tel Aviv", lat: 32.0853, lng: 34.7818 },
    { id: "jerusalem", name: "Jerusalem", lat: 31.7683, lng: 35.2137 },
    {
      id: "jerusalem-old-city",
      name: "Jerusalem Old City",
      lat: 31.7767,
      lng: 35.2345,
    },
    { id: "mount-of-olives", name: "Mount of Olives", lat: 31.7784, lng: 35.2459 },
    { id: "eilat", name: "Eilat", lat: 29.5577, lng: 34.9519 },
  ],
  argentina: [
    { id: "buenos-aires", name: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
    { id: "el-chalten", name: "El Chaltén", lat: -49.3315, lng: -72.8863 },
    { id: "el-calafate", name: "El Calafate", lat: -50.3379, lng: -72.2648 },
    { id: "puerto-iguazu", name: "Puerto Iguazú", lat: -25.5977, lng: -54.5786 },
  ],
  brazil: [
    { id: "foz-do-iguacu", name: "Foz do Iguaçu", lat: -25.6953, lng: -54.4367 },
  ],
  chile: [
    { id: "santiago", name: "Santiago", lat: -33.4489, lng: -70.6693 },
    { id: "torres-del-paine", name: "Torres del Paine", lat: -50.9423, lng: -73.4068 },
    { id: "cerro-alegre", name: "Cerro Alegre", lat: -33.0393, lng: -71.6273 },
    { id: "valparaiso-port", name: "Valparaíso port", lat: -33.0472, lng: -71.6127 },
  ],
  uruguay: [
    { id: "montevideo", name: "Montevideo", lat: -34.9011, lng: -56.1645 },
    {
      id: "colonia-del-sacramento",
      name: "Colonia del Sacramento",
      lat: -34.4716,
      lng: -57.8442,
    },
  ],
  vietnam: [
    { id: "hanoi", name: "Hanoi", lat: 21.0278, lng: 105.8342 },
    { id: "sapa", name: "Sapa", lat: 22.3364, lng: 103.8438 },
    { id: "cat-cat", name: "Cat Cat", lat: 22.3143, lng: 103.8402 },
    { id: "ha-long-bay", name: "Ha Long Bay", lat: 20.9101, lng: 107.1839 },
    { id: "ho-chi-minh-city", name: "Ho Chi Minh City", lat: 10.7769, lng: 106.7009 },
    { id: "phu-quoc", name: "Phu Quoc", lat: 10.227, lng: 103.964 },
  ],
  cambodia: [
    { id: "siem-reap", name: "Siem Reap", lat: 13.3633, lng: 103.8564 },
    { id: "angkor-wat", name: "Angkor Wat", lat: 13.4125, lng: 103.867 },
    { id: "angkor-thom", name: "Angkor Thom", lat: 13.4413, lng: 103.859 },
    { id: "ta-prohm", name: "Ta Prohm", lat: 13.4348, lng: 103.8892 },
  ],
  japan: [
    { id: "tokyo", name: "Tokyo", lat: 35.6762, lng: 139.6503 },
    { id: "kyoto", name: "Kyoto", lat: 35.0116, lng: 135.7681 },
    { id: "takayama", name: "Takayama", lat: 36.1461, lng: 137.2522 },
    { id: "shirakawa-go", name: "Shirakawa-go", lat: 36.2576, lng: 136.9063 },
    { id: "okuhida-onsen", name: "Okuhida Onsen", lat: 36.239, lng: 137.564 },
  ],
  uzbekistan: [
    { id: "tashkent", name: "Tashkent", lat: 41.2995, lng: 69.2401 },
    { id: "khiva", name: "Khiva", lat: 41.3775, lng: 60.3619 },
    { id: "bukhara", name: "Bukhara", lat: 39.7747, lng: 64.4286 },
    { id: "samarkand", name: "Samarkand", lat: 39.627, lng: 66.975 },
  ],
  singapore: [
    { id: "singapore", name: "Singapore", lat: 1.2868, lng: 103.8545 },
  ],
  malaysia: [
    { id: "kuala-lumpur", name: "Kuala Lumpur", lat: 3.139, lng: 101.6869 },
    { id: "cameron-highlands", name: "Cameron Highlands", lat: 4.4696, lng: 101.3831 },
    { id: "penang", name: "Penang", lat: 5.4141, lng: 100.3288 },
    { id: "george-town", name: "George Town", lat: 5.4141, lng: 100.3288 },
  ],
  thailand: [
    { id: "phuket", name: "Phuket", lat: 7.8804, lng: 98.3923 },
    { id: "phi-phi-islands", name: "Phi Phi Islands", lat: 7.7407, lng: 98.7784 },
  ],
  spain: [
    { id: "tenerife", name: "Tenerife", lat: 28.2724, lng: -16.6425 },
    { id: "sevilla", name: "Sevilla", lat: 37.3891, lng: -5.9845 },
    { id: "cordoba", name: "Córdoba", lat: 37.8882, lng: -4.7794 },
    { id: "granada", name: "Granada", lat: 37.1773, lng: -3.5986 },
  ],
  poland: [
    { id: "krakow", name: "Kraków", lat: 50.0616, lng: 19.9373 },
    { id: "wroclaw", name: "Wrocław", lat: 51.1099, lng: 17.0325 },
    { id: "gdansk", name: "Gdańsk", lat: 54.3489, lng: 18.6533 },
    { id: "torun", name: "Toruń", lat: 53.0103, lng: 18.6047 },
    { id: "warsaw", name: "Warsaw", lat: 52.2497, lng: 21.0122 },
  ],
  belgium: [{ id: "ghent", name: "Ghent", lat: 51.0543, lng: 3.7174 }],
  france: [{ id: "strasbourg", name: "Strasbourg", lat: 48.5817, lng: 7.7509 }],
  "hong-kong": [
    { id: "victoria-peak", name: "Victoria Peak", lat: 22.2783, lng: 114.1747 },
  ],
  peru: [
    {
      id: "cusco-plaza-de-armas",
      name: "Plaza de Armas, Cusco",
      lat: -13.5167,
      lng: -71.9788,
    },
    { id: "sacsayhuaman", name: "Sacsayhuamán", lat: -13.5089, lng: -71.9822 },
  ],
  italy: [{ id: "dolomites", name: "Dolomites", lat: 46.4102, lng: 11.844 }],
  "united-arab-emirates": [
    { id: "burj-khalifa", name: "Burj Khalifa", lat: 25.1972, lng: 55.2744 },
    { id: "dubai-marina", name: "Dubai Marina", lat: 25.0805, lng: 55.1403 },
    { id: "palm-jumeirah", name: "Palm Jumeirah", lat: 25.1124, lng: 55.139 },
  ],
};

/** Map itinerary/article labels to qualified location ids. */
const LABEL_TO_ID = {
  "Tel Aviv": "israel/tel-aviv",
  Jerusalem: "israel/jerusalem",
  "Jerusalem Old City": "israel/jerusalem-old-city",
  "Mount of Olives": "israel/mount-of-olives",
  Eilat: "israel/eilat",
  Petra: "jordan/petra",
  "Wadi Rum": "jordan/wadi-rum",
  "Buenos Aires": "argentina/buenos-aires",
  "El Chalten": "argentina/el-chalten",
  "El Chaltén": "argentina/el-chalten",
  "El Calafate": "argentina/el-calafate",
  "Puerto Iguazu": "argentina/puerto-iguazu",
  "Puerto Iguazú": "argentina/puerto-iguazu",
  "Foz do Iguaçu": "brazil/foz-do-iguacu",
  "Torres del Paine": "chile/torres-del-paine",
  Santiago: "chile/santiago",
  Montevideo: "uruguay/montevideo",
  "Colonia del Sacramento": "uruguay/colonia-del-sacramento",
  Hanoi: "vietnam/hanoi",
  Sapa: "vietnam/sapa",
  "Cat Cat": "vietnam/cat-cat",
  "Ha Long Bay": "vietnam/ha-long-bay",
  "Ho Chi Minh City": "vietnam/ho-chi-minh-city",
  "Siem Reap": "cambodia/siem-reap",
  "Phu Quoc": "vietnam/phu-quoc",
  Tokyo: "japan/tokyo",
  Kyoto: "japan/kyoto",
  Takayama: "japan/takayama",
  "Shirakawa-go": "japan/shirakawa-go",
  "Okuhida Onsen": "japan/okuhida-onsen",
  Tashkent: "uzbekistan/tashkent",
  Khiva: "uzbekistan/khiva",
  Bukhara: "uzbekistan/bukhara",
  Samarkand: "uzbekistan/samarkand",
  Singapore: "singapore/singapore",
  "Kuala Lumpur": "malaysia/kuala-lumpur",
  "Cameron Highlands": "malaysia/cameron-highlands",
  Penang: "malaysia/penang",
  "George Town": "malaysia/george-town",
  Phuket: "thailand/phuket",
  "Phi Phi Islands": "thailand/phi-phi-islands",
  Tenerife: "spain/tenerife",
  Sevilla: "spain/sevilla",
  Córdoba: "spain/cordoba",
  Granada: "spain/granada",
  Kraków: "poland/krakow",
  Wrocław: "poland/wroclaw",
  Gdańsk: "poland/gdansk",
  Toruń: "poland/torun",
  Warsaw: "poland/warsaw",
  Ghent: "belgium/ghent",
  Strasbourg: "france/strasbourg",
  "Victoria Peak": "hong-kong/victoria-peak",
  "Plaza de Armas, Cusco": "peru/cusco-plaza-de-armas",
  Sacsayhuamán: "peru/sacsayhuaman",
  Dolomites: "italy/dolomites",
  "Burj Khalifa": "united-arab-emirates/burj-khalifa",
  "Dubai Marina": "united-arab-emirates/dubai-marina",
  "Palm Jumeirah": "united-arab-emirates/palm-jumeirah",
  "Cerro Alegre": "chile/cerro-alegre",
  "Valparaíso port": "chile/valparaiso-port",
  "Angkor Wat": "cambodia/angkor-wat",
  "Angkor Thom": "cambodia/angkor-thom",
  "Ta Prohm": "cambodia/ta-prohm",
};

function formatLocation(loc) {
  const parts = [`  - id: ${loc.id}`, `    name: ${JSON.stringify(loc.name)}`];
  if (loc.image) parts.push(`    image: ${loc.image}`);
  parts.push(`    lat: ${loc.lat}`, `    lng: ${loc.lng}`);
  return parts.join("\n");
}

function patchCountryFile(countryId) {
  const locs = COUNTRY_LOCATIONS[countryId];
  if (!locs?.length) return;
  const path = join(PLACES, `${countryId}.md`);
  let text = readFileSync(path, "utf8");
  if (text.includes("\nlocations:")) {
    console.log(`skip country (already has locations): ${countryId}`);
    return;
  }
  const block = `\nlocations:\n${locs.map(formatLocation).join("\n")}\n`;
  text = text.replace(/\n---\n/, `${block}---\n`);
  writeFileSync(path, text);
  console.log(`patched country: ${countryId}`);
}

function labelToId(label) {
  const id = LABEL_TO_ID[label];
  if (!id) throw new Error(`Unknown label: ${label}`);
  return id;
}

function patchArticleFile(relPath) {
  const path = join(CONTENT, relPath);
  let text = readFileSync(path, "utf8");
  if (!text.includes("coordinates:") && !text.includes('label: "')) {
    if (text.includes("locations: [{ label:")) {
      // itinerary old format
    } else {
      return;
    }
  }

  // Replace itinerary day locations
  text = text.replace(
    /\{ label: "([^"]+)", country: (\w+) \}/g,
    (_, label) => labelToId(label),
  );
  text = text.replace(
    /\{ label: ([^,}]+), country: (\w+) \}/g,
    (_, labelRaw) => labelToId(labelRaw.trim()),
  );

  // Replace coordinates blocks with locations arrays
  text = text.replace(
    /coordinates:\n(?:  - \{ lat: [^\n]+\n?)+/g,
    (block) => {
      const labels = [...block.matchAll(/label:\s*(?:"([^"]+)"|([^,}]+))/g)].map(
        (m) => (m[1] ?? m[2]).trim(),
      );
      const ids = labels.map(labelToId);
      return `locations:\n${ids.map((id) => `  - ${id}`).join("\n")}\n`;
    },
  );

  // Fix itinerary day arrays that now have bare ids mixed with old yaml list syntax
  text = text.replace(
    /locations:\n      \[\n((?:        [^\n]+\n)+)      \]/g,
    (_, inner) => {
      const ids = [...inner.matchAll(/(\w+\/[\w-]+)/g)].map((m) => m[1]);
      return `locations: [${ids.join(", ")}]`;
    },
  );

  writeFileSync(path, text);
  console.log(`patched article: ${relPath}`);
}

for (const countryId of Object.keys(COUNTRY_LOCATIONS)) {
  patchCountryFile(countryId);
}

const articles = [
  "stories/petra-wadi-rum.mdx",
  "stories/ghent-travel-guide.mdx",
  "stories/hong-kong-3-days.mdx",
  "stories/historic-districts-of-singapore.mdx",
  "stories/strasbourg-travel-guide.mdx",
  "stories/wroclaw-travel-guide.mdx",
  "stories/sapa-vietnam-guide.mdx",
  "stories/dolomites-beginners-guide.mdx",
  "stories/el-chalten-patagonia-hikes.mdx",
  "stories/iguazu-falls-argentina-vs-brazil.mdx",
  "stories/angkor-wat-temples-guide.mdx",
  "spotlights/andalusia-cities.mdx",
  "spotlights/colorful-valparaiso.mdx",
  "spotlights/dubai-skyline-photos.mdx",
  "spotlights/festivals-in-cusco.mdx",
  "spotlights/jerusalem-holy-city.mdx",
  "spotlights/penang-street-art.mdx",
  "spotlights/polish-city-squares.mdx",
  "spotlights/singapore-by-night.mdx",
  "spotlights/sunset-on-teide.mdx",
  "spotlights/uruguay-oldest-city.mdx",
  "itineraries/israel-jordan-10-days.mdx",
  "itineraries/japan-cherry-blossom-2-weeks.mdx",
  "itineraries/south-america-3-weeks.mdx",
  "itineraries/singapore-malaysia-thailand-2-weeks.mdx",
  "itineraries/uzbekistan-silk-road.mdx",
  "itineraries/vietnam-cambodia-2-weeks.mdx",
];

for (const rel of articles) {
  patchArticleFile(rel);
}

console.log("done");
