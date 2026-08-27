import { readFile } from "node:fs/promises";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import wawoff from "wawoff2";
import { loadRoLogoDataUrl } from "./ogLogo.js";

const fontFile = (rel: string): string =>
  join(process.cwd(), "node_modules", rel);

const cache = new Map<string, ArrayBuffer>();

const loadTtf = async (rel: string): Promise<ArrayBuffer> => {
  const cached = cache.get(rel);
  if (cached) return cached;
  const woff2 = await readFile(fontFile(rel));
  const ttfBytes = await wawoff.decompress(new Uint8Array(woff2));
  const view = new Uint8Array(ttfBytes);
  const buf = view.buffer.slice(
    view.byteOffset,
    view.byteOffset + view.byteLength,
  ) as ArrayBuffer;
  cache.set(rel, buf);
  return buf;
};

/**
 * Fontsource ships one file per unicode subset, and `latin-ext` holds only the
 * accented glyphs — `ă ș ț` for Romanian. Satori keeps a single file per family
 * and weight, so each face registers its accented subset as its own family and
 * is asked for through a two-name stack. Miss this and RO text silently loses
 * either its plain letters or its diacritics, whichever the one file lacks.
 */
const EXT = "Ext";

const extFamily = (family: string): string => `${family} ${EXT}`;

/** Font stack for `fontFamily`: base subset first, accented one behind it. */
const stackFor = (family: string): string => `${family}, ${extFamily(family)}`;

interface FaceSpec {
  family: string;
  weight: 400 | 600 | 700;
  /** `@fontsource` path with `{subset}` standing in for latin / latin-ext. */
  path: string;
}

const SANS = "Inter";
const MONO = "JetBrains Mono";

const displayFace = (variant: "en" | "ro"): FaceSpec =>
  variant === "ro"
    ? {
        family: "Oswald",
        weight: 600,
        path: "@fontsource/oswald/files/oswald-{subset}-600-normal.woff2",
      }
    : {
        family: "Big Shoulders Display",
        weight: 700,
        path: "@fontsource/big-shoulders-display/files/big-shoulders-display-{subset}-700-normal.woff2",
      };

const faces = (variant: "en" | "ro"): FaceSpec[] => [
  displayFace(variant),
  {
    family: SANS,
    weight: 400,
    path: "@fontsource/inter/files/inter-{subset}-400-normal.woff2",
  },
  {
    family: SANS,
    weight: 600,
    path: "@fontsource/inter/files/inter-{subset}-600-normal.woff2",
  },
  {
    family: MONO,
    weight: 400,
    path: "@fontsource/jetbrains-mono/files/jetbrains-mono-{subset}-400-normal.woff2",
  },
];

interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 600 | 700;
  style: "normal";
}

const loadFonts = async (variant: "en" | "ro"): Promise<SatoriFont[]> => {
  const pairs = await Promise.all(
    faces(variant).map(async (face) => {
      const [latin, ext] = await Promise.all([
        loadTtf(face.path.replace("{subset}", "latin")),
        loadTtf(face.path.replace("{subset}", "latin-ext")),
      ]);
      return [
        {
          name: face.family,
          data: latin,
          weight: face.weight,
          style: "normal",
        },
        {
          name: extFamily(face.family),
          data: ext,
          weight: face.weight,
          style: "normal",
        },
      ] satisfies SatoriFont[];
    }),
  );
  return pairs.flat();
};

export interface OgInput {
  title: string;
  /** Homepage only — small caps label above the title. */
  kicker?: string;
  /** Poster layout only — the tagline under the title. */
  subtitle?: string;
  accent: string;
  /** Dark ink on photo backgrounds with scrim. */
  background?: string;
  variant?: "en" | "ro";
  /** Show the wordmark above the title. Default true; false on homepage. */
  showLogo?: boolean;
  /** Text beside the crest on RO cards — the site name, so renames follow. */
  wordmark?: string;
  /** Saturated accent backdrop (region OG) — dark text, uppercase title. */
  onAccent?: boolean;
  /**
   * `poster` centres a crest emblem over an oversized title, the way the RO
   * home hero reads. Everything else stacks in the bottom-left corner.
   */
  layout?: "corner" | "poster";
}

/** Shared inset for logo + title (matches hero pad-canvas feel, scaled for OG). */
const CONTENT_INSET = {
  left: 140,
  right: 64,
  bottom: 72,
} as const;

const SURFACE = "#1f1d1a";
const LINE = "#3a352e";
const INK = "#f3f0e8";
const INK_ON_PHOTO = "#faf8f2";
/** Matches `.accent-drenched` / `--accent-ink` on region heroes. */
const INK_ON_ACCENT = "#141210";

const hexToRgb = (hex: string): [number, number, number] => {
  const s = hex.replace("#", "");
  const n =
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return [r, g, b];
};

const accentTinted = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const enLogoNode = (color: string, fontFamily: string) => ({
  type: "div",
  props: {
    style: {
      display: "flex",
      fontFamily,
      fontSize: 16,
      letterSpacing: "-0.01em",
      lineHeight: 1.2,
      color,
    },
    children: [
      {
        type: "span",
        props: {
          style: { fontWeight: 400, opacity: 0.75 },
          children: "House",
        },
      },
      {
        type: "span",
        props: {
          style: { fontWeight: 600 },
          children: "Moldovan",
        },
      },
    ],
  },
});

const roLogoNode = (logoSrc: string, fontFamily: string, wordmark: string) => ({
  type: "div",
  props: {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      color: INK_ON_PHOTO,
    },
    children: [
      {
        type: "img",
        props: {
          src: logoSrc,
          width: 30,
          height: 30,
          style: { width: 30, height: 30 },
        },
      },
      {
        type: "div",
        props: {
          style: {
            fontFamily,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "0.02em",
            lineHeight: 1.1,
          },
          children: wordmark,
        },
      },
    ],
  },
});

/** The home hero's crest disc, scaled for the poster layout. */
const emblemNode = (logoSrc: string) => ({
  type: "div",
  props: {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 128,
      height: 128,
      borderRadius: 999,
      background: SURFACE,
      border: `1px solid ${LINE}`,
    },
    children: [
      {
        type: "img",
        props: {
          src: logoSrc,
          width: 84,
          height: 84,
          style: { width: 84, height: 84 },
        },
      },
    ],
  },
});

const photoLayer = (background: string) => ({
  type: "img",
  props: {
    src: background,
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      width: 1200,
      height: 630,
      objectFit: "cover",
    },
  },
});

export const renderOg = async (input: OgInput): Promise<Uint8Array> => {
  const variant = input.variant ?? "en";
  const fonts = await loadFonts(variant);
  const display = displayFace(variant);
  const displayWeight = display.weight;
  const displayStack = stackFor(display.family);
  const sansStack = stackFor(SANS);
  const monoStack = stackFor(MONO);
  const hasPhoto = Boolean(input.background);
  const onAccent = input.onAccent ?? false;
  const onPhoto = hasPhoto && !onAccent;
  const ink = onAccent ? INK_ON_ACCENT : onPhoto ? INK_ON_PHOTO : INK;
  const roLogo = variant === "ro" ? await loadRoLogoDataUrl() : undefined;
  const showLogo = input.showLogo !== false;
  const poster = input.layout === "poster";

  const contentNode = poster
    ? {
        type: "div",
        props: {
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 36,
          },
          children: [
            ...(roLogo ? [emblemNode(roLogo)] : []),
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  fontFamily: displayStack,
                  fontSize: 132,
                  fontWeight: displayWeight,
                  lineHeight: 0.82,
                  letterSpacing: "-0.05em",
                  textTransform: "uppercase",
                  textAlign: "center",
                  color: ink,
                  textShadow: "0 2px 40px rgba(12, 10, 8, 0.6)",
                },
                children: input.title,
              },
            },
            ...(input.subtitle
              ? [
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        fontFamily: sansStack,
                        fontSize: 30,
                        lineHeight: 1.3,
                        letterSpacing: "-0.01em",
                        textAlign: "center",
                        color: ink,
                        opacity: 0.9,
                        textShadow: "0 2px 24px rgba(12, 10, 8, 0.55)",
                      },
                      children: input.subtitle,
                    },
                  },
                ]
              : []),
          ],
        },
      }
    : {
        type: "div",
        props: {
          style: {
            position: "absolute",
            left: CONTENT_INSET.left,
            right: CONTENT_INSET.right,
            bottom: CONTENT_INSET.bottom,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 16,
          },
          children: [
            ...(showLogo
              ? [
                  variant === "ro" && roLogo
                    ? roLogoNode(roLogo, displayStack, input.wordmark ?? "")
                    : enLogoNode(ink, sansStack),
                ]
              : []),
            ...(input.kicker
              ? [
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        fontFamily: monoStack,
                        fontSize: 14,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        lineHeight: 1.25,
                        color: ink,
                        opacity: onAccent ? 1 : onPhoto ? 0.88 : 0.72,
                      },
                      children: input.kicker,
                    },
                  },
                ]
              : []),
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  fontFamily: displayStack,
                  fontSize: variant === "ro" ? 72 : 76,
                  fontWeight: displayWeight,
                  lineHeight:
                    variant === "ro"
                      ? onAccent
                        ? 0.98
                        : 1.04
                      : onAccent
                        ? 0.92
                        : 1,
                  letterSpacing:
                    variant === "ro"
                      ? onAccent
                        ? "0.04em"
                        : "0.01em"
                      : onAccent
                        ? "-0.04em"
                        : "-0.02em",
                  textTransform: onAccent ? "uppercase" : "none",
                  maxWidth: 980,
                  color: ink,
                  ...(onPhoto
                    ? { textShadow: "0 2px 24px rgba(12, 10, 8, 0.55)" }
                    : {}),
                },
                children: input.title,
              },
            },
          ],
        },
      };

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: SURFACE,
          color: ink,
          fontFamily: sansStack,
          position: "relative",
        },
        children: [
          ...(input.background
            ? [photoLayer(input.background)]
            : [
                {
                  type: "div",
                  props: {
                    style: {
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: "780px",
                      height: "780px",
                      background: accentTinted(input.accent, 1),
                      opacity: 0.42,
                      borderRadius: "999px",
                      filter: "blur(180px)",
                      transform: "translate(20%, -28%)",
                    },
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: 1200,
                      height: 630,
                      backgroundImage: `linear-gradient(180deg, transparent 0%, ${SURFACE} 92%)`,
                    },
                  },
                },
              ]),
          contentNode,
        ],
      },
    } as never,
    {
      width: 1200,
      height: 630,
      fonts,
    },
  );

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  })
    .render()
    .asPng();
  return new Uint8Array(png);
};
