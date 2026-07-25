import { readFile } from "node:fs/promises";
import { join } from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import wawoff from "wawoff2";

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
  mono: ArrayBuffer;
}> => {
  const display =
    variant === "ro"
      ? "@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2"
      : "@fontsource/big-shoulders-display/files/big-shoulders-display-latin-700-normal.woff2";

  const [d, s, m] = await Promise.all([
    loadTtf(display),
    loadTtf("@fontsource/inter/files/inter-latin-400-normal.woff2"),
    loadTtf(
      "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2",
    ),
  ]);

  return { display: d, sans: s, mono: m };
};

export interface OgInput {
  kicker: string;
  title: string;
  meta?: string;
  accent: string;
  variant?: "en" | "ro";
  siteName?: string;
}

const SURFACE = "#1f1d1a";
const INK = "#f3f0e8";
const INK_DIM = "#bfbcb1";

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

export const renderOg = async (input: OgInput): Promise<Uint8Array> => {
  const variant = input.variant ?? "en";
  const fonts = await loadFonts(variant);
  const displayFamily =
    variant === "ro" ? "Source Serif 4" : "Big Shoulders Display";
  const siteName =
    input.siteName ?? (variant === "ro" ? "Pe creastă" : "House Moldovan");

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: SURFACE,
          color: INK,
          fontFamily: "Inter",
          position: "relative",
        },
        children: [
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
                inset: 0,
                background: `linear-gradient(180deg, transparent 0%, ${SURFACE} 92%)`,
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "JetBrains Mono",
                fontSize: 18,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: INK_DIM,
              },
              children: [
                { type: "span", props: { children: input.kicker } },
                { type: "span", props: { children: siteName } },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "relative",
                display: "flex",
                flexDirection: "column",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      fontFamily: displayFamily,
                      fontSize: variant === "ro" ? 84 : 92,
                      fontWeight: variant === "ro" ? 400 : 700,
                      lineHeight: variant === "ro" ? 1.02 : 0.92,
                      letterSpacing: variant === "ro" ? "-0.02em" : "-0.04em",
                      textTransform: variant === "ro" ? "none" : "uppercase",
                      maxWidth: 1000,
                    },
                    children: input.title,
                  },
                },
                input.meta
                  ? {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          marginTop: 24,
                          fontFamily: "JetBrains Mono",
                          fontSize: 18,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: INK_DIM,
                        },
                        children: input.meta,
                      },
                    }
                  : null,
                {
                  type: "div",
                  props: {
                    style: {
                      marginTop: 24,
                      width: 96,
                      height: 4,
                      background: input.accent,
                    },
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
