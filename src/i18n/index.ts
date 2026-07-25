import { en } from "./en";
import { ro } from "./ro";

export const STRINGS = { en, ro } as const;
export type Locale = keyof typeof STRINGS;

export const t = <L extends Locale>(locale: L): (typeof STRINGS)[L] =>
  STRINGS[locale];

export const localeOf = (pathname: string): Locale =>
  pathname.startsWith("/ro") ? "ro" : "en";

export const localeRoot = (locale: Locale): string =>
  locale === "ro" ? "/ro" : "";
