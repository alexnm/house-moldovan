/** CustomEvent name: elevation profile → hike map pin. */
export const HIKE_PROFILE_SCRUB_EVENT = "hike-profile-scrub";

export type HikeProfileScrubDetail =
  | { active: true; d: number; lng: number; lat: number }
  | { active: false };
