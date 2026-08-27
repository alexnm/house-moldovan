// Decodes a CDP Page.captureScreenshot JSON response into a PNG next to it.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const LOG_DIR = "/Users/alex/.cursor/browser-logs";
const out = process.argv[2] ?? "shot.png";

const latest = readdirSync(LOG_DIR)
  .filter((f) => f.includes("Page.captureScreenshot"))
  .sort()
  .at(-1);

if (!latest) throw new Error("no capture response found");

const raw = JSON.parse(readFileSync(join(LOG_DIR, latest), "utf8"));
const data = raw.data ?? raw.result?.data ?? raw.result?.result?.data;
if (!data) throw new Error(`no data field in ${latest}: ${Object.keys(raw)}`);

const target = join(import.meta.dirname, out);
writeFileSync(target, Buffer.from(data, "base64"));
console.log(target);
