import { readFile } from "node:fs/promises";
import { join } from "node:path";

let roLogoDataUrl: string | undefined;

export const loadRoLogoDataUrl = async (): Promise<string> => {
  if (roLogoDataUrl) return roLogoDataUrl;
  const svg = await readFile(
    join(process.cwd(), "public/logo-pe-creasta.svg"),
    "utf8",
  );
  roLogoDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return roLogoDataUrl;
};
