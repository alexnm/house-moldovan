#!/usr/bin/env python3
"""One-off: emit MDX for legacy itinerary markdown files with new frontmatter + converted body."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

# noqa: I001
import importlib.util

spec = importlib.util.spec_from_file_location(
    "leg",
    ROOT / "scripts" / "convert-legacy-itinerary-body.py",
)
leg = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(leg)  # type: ignore


def body_for(src: Path) -> str:
    t = src.read_text(encoding="utf-8")
    b = leg.extract_body_from_legacy(t)
    return leg.convert_body(b)


# --- frontmatter (YAML) per slug ---

VIETNAM_CAMBODIA = """\
title: Discover Vietnam and Cambodia
highlights:
  - "Historical places, ancient and modern"
  - "Tropical landscape and long coasts"
  - "Lively, fast-changing cities and warm people"
  - "A useful first swing through mainland South-East Asia"
summary:
  - "About 15 days across Hanoi, the south, Siem Reap, and Phu Quoc by plane, bus, and boat."
  - "Best in the cool dry season (roughly December–March)."
  - "We planned it ourselves; ballpark was around $2200 per person back then."
days:
  - title: Arrive in Hanoi
    description: "Land and start in the capital: first tastes of the street, the traffic, the pho."
    locations: [{ label: "Hanoi", place: vietnam, coords: [105.8542, 21.0285] }]
  - title: Sapa
    description: "Transfer to the mountains; rice terraces and village walks."
    locations: [{ label: "Sapa", place: vietnam, coords: [103.8443, 22.3402] }]
  - title: Back to Hanoi
    description: "Return from Sapa, night in the city before heading east."
    locations: [{ label: "Hanoi", place: vietnam, coords: [105.8542, 21.0285] }]
  - title: Ha Long Bay
    description: "Overnight on the water among the karsts."
    locations: [{ label: "Ha Long Bay", place: vietnam, coords: [107.05, 20.9] }]
  - title: On to Ho Chi Minh City
    description: "End the cruise, bus to Hanoi, then fly to the south."
    locations: [{ label: "Ho Chi Minh City", place: vietnam, coords: [106.6297, 10.8231] }]
  - title: War history day trip
    description: "Museum, city sights, and the Cu Chi Tunnels from Ho Chi Minh City."
    locations: [{ label: "Ho Chi Minh City", place: vietnam, coords: [106.6297, 10.8231] }]
  - title: Saigon in depth
    description: "Full day in the city: old Saigon, markets, and the southern rhythm."
    locations: [{ label: "Ho Chi Minh City", place: vietnam, coords: [106.6297, 10.8231] }]
  - title: Mekong Delta
    description: "Day trip into the delta from the city."
    locations: [{ label: "Ho Chi Minh City", place: vietnam, coords: [106.6297, 10.8231] }]
  - title: Arrive in Siem Reap
    description: "Evening flight to the gateway to Angkor."
    locations: [{ label: "Siem Reap", place: cambodia, coords: [104.0, 13.41] }]
  - title: Countryside and lake
    description: "Bikes, villages, and a floating community on Tonlé Sap."
    locations: [{ label: "Siem Reap", place: cambodia, coords: [104.0, 13.41] }]
  - title: Angkor
    description: "Full days in the Angkor complex."
    locations: [{ label: "Siem Reap", place: cambodia, coords: [104.0, 13.41] }]
  - title: To Phu Quoc
    description: "From temples to the island, flight from Siem Reap."
    locations: [{ label: "Phu Quoc", place: vietnam, coords: [104.0, 10.2] }]
  - title: Island time
    description: "Beach and rest in the Gulf of Thailand."
    locations: [{ label: "Phu Quoc", place: vietnam, coords: [104.0, 10.2] }]
  - title: Phu Quoc, slow day
    description: "Another day by the water before the long hop north."
    locations: [{ label: "Phu Quoc", place: vietnam, coords: [104.0, 10.2] }]
  - title: Return to Hanoi
    description: "Fly back, last souvenirs, last bowls of pho, and goodbye for now."
    locations: [{ label: "Hanoi", place: vietnam, coords: [105.8542, 21.0285] }]
season: any
pace: packed
visited: 2020-02-20
published: 2020-06-08
hero: ../../assets/south-east-asia-cover.jpg
tags: [vietnam, cambodia, south-east-asia, culture, nature]
featured: false
"""

UZBEKISTAN = """\
title: Follow the Silk Road in Uzbekistan
highlights:
  - "Islamic art, tilework, and bazaar life in living cities"
  - "Tashkent to Khiva, Bukhara, and Samarkand by train, car, and short flights"
  - "A private tour helped where English and Russian do not get you far"
summary:
  - "About eight days in spring or autumn, flying and riding the main Silk Road arc."
  - "Mostly train and car with one domestic leg; we used a local operator from home."
  - "Rough budget at the time was on the order of $2000 per person."
days:
  - title: Tashkent
    description: "Arrive, metro and markets, a Soviet-organized but green capital base."
    locations: [{ label: "Tashkent", place: uzbekistan, coords: [69.2401, 41.3111] }]
  - title: Khiva
    description: "Fly to Urgench, short transfer; walls and minarets in the Kyzylkum fringe."
    locations: [{ label: "Khiva", place: uzbekistan, coords: [60.63, 41.55] }]
  - title: Bukhara
    description: "Desert train to the old khanate core: plazas, minaret, and still-active madrasas."
    locations: [{ label: "Bukhara", place: uzbekistan, coords: [64.4286, 39.7681] }]
  - title: Bukhara again
    description: "Second day in the same base for mosques, Ark, and bazaar browsing."
    locations: [{ label: "Bukhara", place: uzbekistan, coords: [64.4286, 39.7681] }]
  - title: Shahrisabz to Samarkand
    description: "Road to Timur’s birthplace, then the evening in the Registan’s city."
    locations: [{ label: "Samarkand", place: uzbekistan, coords: [66.9597, 39.6542] }]
  - title: Samarkand
    description: "Registan, necropolis, and the tilework that justifies the whole trip."
    locations: [{ label: "Samarkand", place: uzbekistan, coords: [66.9597, 39.6542] }]
  - title: Samarkand
    description: "Mosques, Ulugh Beg, Afrasiyab, and a second day of the same splendour."
    locations: [{ label: "Samarkand", place: uzbekistan, coords: [66.9597, 39.6542] }]
  - title: Samarkand, then Tashkent
    description: "Last hours in the old city, then the train back to the capital to fly out."
    locations: [{ label: "Samarkand", place: uzbekistan, coords: [66.9597, 39.6542] }, { label: "Tashkent", place: uzbekistan, coords: [69.2401, 41.3111] }]
season: spring
pace: balanced
visited: 2019-04-20
published: 2020-05-10
hero: ../../assets/uzbekistan/registan.jpg
tags: [uzbekistan, central-asia, culture]
featured: false
"""

SOUTH_AMERICA = """\
title: Argentina, Chile and Uruguay in three weeks
highlights:
  - "From Buenos Aires to Patagonia, the Falls, the central Andes, and the Río de la Plata"
  - "Big-city walking tours, long hikes, and a ferry finish in Uruguay"
  - "We booked it ourselves, mostly on LATAM and Sky as the regional workhorses"
summary:
  - "Nineteen days on the road; December to March is the window we aimed for."
  - "Ferries, buses, and a lot of domestic flights—prices in South America are not Asia-cheap."
  - "We spent on the order of $3500 per person at the time, flights included."
days:
  - title: Buenos Aires
    description: "Arrive and get oriented; steaks, tango, and a first look at the capital."
    locations: [{ label: "Buenos Aires", place: argentina, coords: [-58.3816, -34.6037] }]
  - title: La Boca and more
    description: "Colour, football lore, and another night in the city."
    locations: [{ label: "Buenos Aires", place: argentina, coords: [-58.3816, -34.6037] }]
  - title: To El Chalten
    description: "Fly to El Calafate and bus into the hiking capital under Fitz Roy."
    locations: [{ label: "El Chalten", place: argentina, coords: [-72.8856, -49.3308] }]
  - title: Laguna de los Tres
    description: "The big day hike to the most famous view in the massif."
    locations: [{ label: "El Chalten", place: argentina, coords: [-72.8856, -49.3308] }]
  - title: Loma del Pliegue Tumbado
    description: "Second full day in the same base for the high ridge and wider panorama."
    locations: [{ label: "El Chalten", place: argentina, coords: [-72.8856, -49.3308] }]
  - title: Lago del Desierto, then Calafate
    description: "Short northern outing, then bus back to the glacier town."
    locations: [{ label: "El Chalten", place: argentina, coords: [-72.8856, -49.3308] }, { label: "El Calafate", place: argentina, coords: [-72.2607, -50.3404] }]
  - title: Perito Moreno
    description: "Balconies and, if you book it, a walk on the ice above Lago Rico."
    locations: [{ label: "El Calafate", place: argentina, coords: [-72.2607, -50.3404] }]
  - title: Torres del Paine day
    description: "Long day from Calafate into Chile’s most famous park and back."
    locations: [{ label: "El Calafate", place: argentina, coords: [-72.2607, -50.3404] }]
  - title: "Fly to Iguazú, settle in"
    description: "Patagonia to the tropics: connect through BA if needed, base in Puerto Iguazú."
    locations: [{ label: "Puerto Iguazu", place: argentina, coords: [-54.5767, -25.6105] }]
  - title: Iguazú, Argentine side
    description: "Argentine circuits, spray, and coatis on the long walkways."
    locations: [{ label: "Puerto Iguazu", place: argentina, coords: [-54.5767, -25.6105] }]
  - title: Iguazú, Brazilian side, then Buenos Aires
    description: "Second country in one great park, then back to the capital for a night."
    locations: [{ label: "Puerto Iguazu", place: argentina, coords: [-54.5767, -25.6105] }, { label: "Buenos Aires", place: argentina, coords: [-58.3816, -34.6037] }]
  - title: To Santiago
    description: "Cross the Andes to Chile’s long capital between peaks and smog in summer."
    locations: [{ label: "Santiago", place: chile, coords: [-70.6506, -33.4378] }]
  - title: Santiago
    description: "Plaza, palaces, and memory in a city built between the cordillera and the coast."
    locations: [{ label: "Santiago", place: chile, coords: [-70.6506, -33.4378] }]
  - title: Cajon del Maipo
    description: "High Andean day out: volcano foothills, dry air, and a break from the heat."
    locations: [{ label: "Santiago", place: chile, coords: [-70.6506, -33.4378] }]
  - title: Valparaiso
    description: "Port, funiculars, and street art on the Pacific; easy day or overnight back."
    locations: [{ label: "Valparaiso", place: chile, coords: [-71.6309, -33.028] }]
  - title: Aconcagua
    description: "Day trip to the high valley and views of the summit from Argentina’s side."
    locations: [{ label: "Aconcagua", place: argentina, coords: [-69.3, -32.8] }, { label: "Santiago", place: chile, coords: [-70.6506, -33.4378] }]
  - title: To Montevideo
    description: "Fly to the sleepy capital on the Río de la Plata for the home stretch."
    locations: [{ label: "Montevideo", place: uruguay, coords: [-56.1645, -34.9011] }]
  - title: Montevideo
    description: "Beach, old city, and another steak before the short hop to the colonial town."
    locations: [{ label: "Montevideo", place: uruguay, coords: [-56.1645, -34.9011] }]
  - title: "Colonia, then Buenos Aires and home"
    description: "Cobbled Colonia, ferry across the Río de la Plata, last night in BA, and the flight from Ezeiza."
    locations: [{ label: "Colonia", place: uruguay, coords: [-57.85, -34.48] }, { label: "Buenos Aires", place: argentina, coords: [-58.3816, -34.6037] }]
season: summer
pace: packed
visited: 2020-01-15
published: 2020-05-03
hero: ../../assets/south-america-cover.jpg
tags: [south-america, argentina, chile, uruguay, patagonia, nature]
featured: false
"""

JAPAN_SAKURA = """\
title: Touring Japan during sakura
highlights:
  - "Subway passes, shinkansen, and Kansai through-pass for a two-week loop"
  - "Tokyo’s wards, then Kyoto as base for Nara, Osaka, and the mountains"
  - "Rural Gifu and Nagano: gasshō houses, onsen, and a ropeway in the alps of Honshu"
summary:
  - "A full cherry-blossom-season arc with buffer days for bad weather in Tokyo and Kyoto."
  - "Trains, buses, and a lot of walking; spring is the busy window—book early."
  - "We splashed out on a pocket Wi-Fi; it was worth every yen."
days:
  - title: "Tokyo: arrival, Chiyoda, Taito"
    description: "Settle in, train lines, and first sakura or almost-sakura in the capital."
    locations: [{ label: "Tokyo", place: japan, coords: [139.6917, 35.6895] }]
  - title: "Tokyo: Minato, Shinjuku, Shibuya"
    description: "Towers, Tocho, Gyoen, and the crossing after dark."
    locations: [{ label: "Tokyo", place: japan, coords: [139.6917, 35.6895] }]
  - title: "Tokyo: rain-day museum plan"
    description: "Miraikan, Yurikamome, and indoor backup when the weather fails."
    locations: [{ label: "Tokyo", place: japan, coords: [139.6917, 35.6895] }]
  - title: Shinkansen to Kyoto
    description: "Bullet train south; base in Kansai for the week ahead."
    locations: [{ label: "Kyoto", place: japan, coords: [135.768, 35.0116] }]
  - title: Himeji and Kobe
    description: "White castle, Akashi bridge, and Kobe beef in one long day from Kyoto."
    locations: [{ label: "Himeji", place: japan, coords: [134.6853, 34.8404] }, { label: "Kobe", place: japan, coords: [135.1955, 34.69] }, { label: "Kyoto", place: japan, coords: [135.768, 35.0116] }]
  - title: Nara and Osaka
    description: "Deer, Todai-ji, and Dotonbori evening energy."
    locations: [{ label: "Nara", place: japan, coords: [135.8049, 34.6851] }, { label: "Osaka", place: japan, coords: [135.5022, 34.6937] }, { label: "Kyoto", place: japan, coords: [135.768, 35.0116] }]
  - title: Kurama and Fushimi Inari
    description: "Hill walk and endless torii; a long, stair-heavy day."
    locations: [{ label: "Kyoto", place: japan, coords: [135.768, 35.0116] }]
  - title: "Kyoto: Kiyomizu, gold and silver, Arashiyama"
    description: "Temples, bamboo, and macaques when the schedule allows."
    locations: [{ label: "Kyoto", place: japan, coords: [135.768, 35.0116] }]
  - title: "Kyoto: Arashiyama and Gion"
    description: "West-side nature and evening streets before leaving Kansai."
    locations: [{ label: "Kyoto", place: japan, coords: [135.768, 35.0116] }]
  - title: To Takayama
    description: "Bus over the pass into wooden-town mountain Japan."
    locations: [{ label: "Takayama", place: japan, coords: [137.2523, 36.14] }]
  - title: Shirakawa-go, then Okuhida
    description: "UNESCO gasshō hamlets, then up to the onsen cluster for the night."
    locations: [{ label: "Shirakawa-go", place: japan, coords: [136.9, 36.25] }, { label: "Okuhida Onsen", place: japan, coords: [137.8, 36.2] }]
  - title: Shinhotaka Ropeway
    description: "Cable cars and snow walls before another night in the high valley."
    locations: [{ label: "Okuhida Onsen", place: japan, coords: [137.8, 36.2] }]
  - title: Matsumoto, return to Tokyo
    description: "Black castle in the cherry light, then the long bus or train east."
    locations: [{ label: "Matsumoto", place: japan, coords: [137.972, 36.2389] }, { label: "Tokyo", place: japan, coords: [139.6917, 35.6895] }]
  - title: "Tokyo: Chuo, Tsukiji, Ginza, hanami"
    description: "Sushi at dawn, Hamarikyu, Nakameguro, and a last walk under the blooms."
    locations: [{ label: "Tokyo", place: japan, coords: [139.6917, 35.6895] }]
  - title: "Departure from Tokyo"
    description: "Morning flight home after a packed Honshu loop."
    locations: [{ label: "Tokyo", place: japan, coords: [139.6917, 35.6895] }]
season: spring
pace: packed
visited: 2017-04-10
published: 2020-05-15
hero: ../../assets/seed/kyoto-hero.jpg
tags: [japan, east-asia, culture, nature, spring]
featured: false
"""

ISRAEL_JORDAN = """\
title: A taste of the Middle East
highlights:
  - "Mediterranean Israel, then Jerusalem, Eilat, and across to Jordan’s desert and Petra"
  - "10 days: Tel Aviv, coast, holy city, Red Sea, Wadi Rum, and Petra"
  - "Buses, day tours, and one long crossing—travel light, dress modestly, carry cash and patience"
summary:
  - "We aimed for two shoulder seasons, spring and autumn, with milder highland weather."
  - "Rough spend was about $1500 per person, excluding long-haul flights to Ben Gurion."
  - "Border paperwork at airports can be slow; the rest of the experience made up for it."
days:
  - title: Tel Aviv
    description: "First nights by the Med: promenade, markets, hummus, and a modern city break."
    locations: [{ label: "Tel Aviv", place: israel, coords: [34.7818, 32.0853] }]
  - title: North coast day trip
    description: "Caesarea, Rosh HaNikra, Akko, and the Bahá’í terraces in Haifa in one long day."
    locations: [{ label: "Haifa", place: israel, coords: [35.0, 32.8] }, { label: "Tel Aviv", place: israel, coords: [34.7818, 32.0853] }]
  - title: Jaffa
    description: "Old port lanes and a free-tour read on layered history, still in the Tel Aviv base."
    locations: [{ label: "Tel Aviv", place: israel, coords: [34.7818, 32.0853] }]
  - title: To Jerusalem
    description: "Bus up to the high city; first walk inside the walls and the four quarters."
    locations: [{ label: "Jerusalem", place: israel, coords: [35.2137, 31.7683] }]
  - title: Deep Jerusalem
    description: "Temple Mount, Mount of Olives, and more stone alleys in the same stay."
    locations: [{ label: "Jerusalem", place: israel, coords: [35.2137, 31.7683] }]
  - title: "Yad Vashem, then Eilat"
    description: "Holocaust memorial morning, then overland to the Red Sea in the far south."
    locations: [{ label: "Jerusalem", place: israel, coords: [35.2137, 31.7683] }, { label: "Eilat", place: israel, coords: [34.95, 29.55] }]
  - title: Eilat
    description: "Reef, beach, and a breather on the gulf before Jordan."
    locations: [{ label: "Eilat", place: israel, coords: [34.95, 29.55] }]
  - title: "Wadi Rum"
    description: "Cross the border, 4x4 in the red desert, bedouin camp under the stars."
    locations: [{ label: "Wadi Rum", place: jordan, coords: [35.4, 29.6] }]
  - title: "Petra, back to Eilat"
    description: "Full day in the rock city, return to the Israeli side for a last Red Sea base."
    locations: [{ label: "Petra", place: jordan, coords: [35.45, 30.33] }, { label: "Eilat", place: israel, coords: [34.95, 29.55] }]
  - title: "Red Canyon, Tel Aviv"
    description: "Hike a sandstone slot, then the bus north to the coast for a final night."
    locations: [{ label: "Eilat", place: israel, coords: [34.95, 29.55] }, { label: "Tel Aviv", place: israel, coords: [34.7818, 32.0853] }]
season: any
pace: packed
visited: 2019-02-15
published: 2020-05-03
hero: ../../assets/jordan/petra.jpg
tags: [israel, jordan, middle-east, culture]
featured: false
"""

OUT: list[tuple[str, str, Path]] = [
    ("vietnam-cambodia.mdx", VIETNAM_CAMBODIA, ROOT / "src/content/itineraries/vietnam-cambodia.md"),
    ("uzbekistan.mdx", UZBEKISTAN, ROOT / "src/content/itineraries/uzbekistan.md"),
    (
        "south-america.mdx",
        SOUTH_AMERICA,
        ROOT / "src/content/itineraries/south-america.md",
    ),
    (
        "japan-sakura-tour.mdx",
        JAPAN_SAKURA,
        ROOT / "src/content/itineraries/japan.md",
    ),
    ("israel-jordan.mdx", ISRAEL_JORDAN, ROOT / "src/content/itineraries/israel-jordan.md"),
]


def main() -> None:
    for out_name, fm, src in OUT:
        if not src.is_file():
            print("skip missing", src, file=sys.stderr)
            continue
        body = body_for(src)
        mdx = (
            "---\n"
            + fm.strip()
            + "\n---\n\nimport AssetImage from "
            + '"~/components/mdx/AssetImage.astro";\n\n'
            + body
            + "\n"
        )
        out_path = ROOT / "src" / "content" / "itineraries" / out_name
        out_path.write_text(mdx, encoding="utf-8")
        print("wrote", out_path)
        src.unlink()
        print("removed", src)


if __name__ == "__main__":
    main()
