import { readFile } from "node:fs/promises";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import wawoff from "wawoff2";
import { loadRoLogoDataUrl } from "~/lib/ogLogo";
import { ro } from "~/i18n/ro";

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

const loadFonts = async (
  variant: "en" | "ro",
): Promise<{
  display: ArrayBuffer;
  sans: ArrayBuffer;
  sansSemibold: ArrayBuffer;
  mono: ArrayBuffer;
}> => {
  const display =
    variant === "ro"
      ? "@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2"
      : "@fontsource/big-shoulders-display/files/big-shoulders-display-latin-700-normal.woff2";

  const [d, s, ss, m] = await Promise.all([
    loadTtf(display),
    loadTtf("@fontsource/inter/files/inter-latin-400-normal.woff2"),
    loadTtf("@fontsource/inter/files/inter-latin-600-normal.woff2"),
    loadTtf(
      "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2",
    ),
  ]);

  return { display: d, sans: s, sansSemibold: ss, mono: m };
};

export interface OgInput {
  title: string;
  /** Homepage only — small caps label above the title. */
  kicker?: string;
  accent: string;
  /** Dark ink on photo backgrounds with scrim. */
  background?: string;
  variant?: "en" | "ro";
  /** Show the wordmark above the title. Default true; false on homepage. */
  showLogo?: boolean;
  /** Saturated accent backdrop (region OG) — dark text, uppercase title. */
  onAccent?: boolean;
}

/** Shared inset for logo + title (matches hero pad-canvas feel, scaled for OG). */
const CONTENT_INSET = {
  left: 140,
  right: 64,
  bottom: 72,
} as const;

const SURFACE = "#1f1d1a";
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

const enLogoNode = (color: string) => ({
  type: "div",
  props: {
    style: {
      display: "flex",
      fontFamily: "Inter",
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

const roLogoNode = (logoSrc: string) => ({
  type: "div",
  props: {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      color: INK_ON_PHOTO,
    },
    children: [
      {
        type: "img",
        props: {
          src: logoSrc,
          width: 16,
          height: 16,
          style: { width: 16, height: 16 },
        },
      },
      {
        type: "div",
        props: {
          style: {
            fontFamily: "Source Serif 4",
            fontSize: 16,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          },
          children: ro.siteName,
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
  const displayFamily =
    variant === "ro" ? "Source Serif 4" : "Big Shoulders Display";
  const hasPhoto = Boolean(input.background);
  const onAccent = input.onAccent ?? false;
  const onPhoto = hasPhoto && !onAccent;
  const ink = onAccent ? INK_ON_ACCENT : onPhoto ? INK_ON_PHOTO : INK;
  const roLogo = variant === "ro" ? await loadRoLogoDataUrl() : undefined;
  const showLogo = input.showLogo !== false;

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
          fontFamily: "Inter",
          position: "relative",
        },
        children: [
          ...(input.background ? [photoLayer(input.background)] : [
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
          {
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
                        ? roLogoNode(roLogo)
                        : enLogoNode(ink),
                    ]
                  : []),
                ...(input.kicker
                  ? [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            fontFamily: "JetBrains Mono",
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
                      fontFamily: displayFamily,
                      fontSize: variant === "ro" ? 68 : 76,
                      fontWeight: variant === "ro" ? 400 : 700,
                      lineHeight: variant === "ro" ? 1.04 : onAccent ? 0.92 : 1,
                      letterSpacing: onAccent ? "-0.04em" : "-0.02em",
                      textTransform: onAccent ? "uppercase" : "none",
                      maxWidth: 980,
                      color: ink,
                      ...(onPhoto
                        ? {
                            textShadow: "0 2px 24px rgba(12, 10, 8, 0.55)",
                          }
                        : {}),
                    },
                    children: input.title,
                  },
                },
              ],
            },
          },
        ],
      },
    } as never,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: displayFamily,
          data: fonts.display,
          style: "normal",
          weight: variant === "ro" ? 400 : 700,
        },
        { name: "Inter", data: fonts.sans, style: "normal", weight: 400 },
        {
          name: "Inter",
          data: fonts.sansSemibold,
          style: "normal",
          weight: 600,
        },
        {
          name: "JetBrains Mono",
          data: fonts.mono,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  })
    .render()
    .asPng();
  return new Uint8Array(png);
};
