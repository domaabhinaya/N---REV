/**
 * cuisine.ts
 *
 * AUTHORITATIVE, permanent cuisine-resolution rule for N-REV.
 *
 * - `Indian` is the permanent default cuisine. Whenever the user has not chosen
 *   a cuisine, or the value is null / undefined / empty string / whitespace /
 *   otherwise invalid, it permanently resolves to `Indian`.
 * - A VALID user-selected cuisine (e.g. `Asian`, `North Indian`, ...) is never
 *   silently replaced with `Indian`.
 *
 * This is backend-enforced: every recovery-plan and food-recommendation path
 * must resolve the cuisine through `resolveCuisine()` (directly, or indirectly
 * via the plan generators in `meal-planner.ts`). That way even an older frontend
 * that sends no cuisine still yields an Indian-cuisine plan.
 */

/** The permanent default cuisine. */
export const DEFAULT_CUISINE = "Indian" as const;

/**
 * Canonical supported cuisines. This is the application's supported set:
 * the documented cuisines (Indian, South Indian, North Indian, Asian, Western,
 * Global) plus the legacy values the planner already recognises
 * (Mediterranean, Mexican), so a previously-valid selection is never dropped.
 */
export const SUPPORTED_CUISINES = [
  "Indian",
  "North Indian",
  "South Indian",
  "Asian",
  "Western",
  "Global",
  "Mediterranean",
  "Mexican",
] as const;

export type SupportedCuisine = (typeof SUPPORTED_CUISINES)[number];

/**
 * Normalise any cuisine value to a lowercase, separator-normalised key so that
 * "IndiaN", "asian", "North_Indian", "  ASIAN  " all compare cleanly.
 */
export function normalizeCuisine(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CANONICAL_BY_NORMALIZED: Record<string, SupportedCuisine> = Object.fromEntries(
  SUPPORTED_CUISINES.map((cuisine) => [normalizeCuisine(cuisine), cuisine]),
);

/**
 * The single authoritative resolver: returns the validated selected cuisine, or
 * DEFAULT_CUISINE ("Indian") when no valid cuisine is supplied.
 */
export function resolveCuisine(value: unknown): SupportedCuisine {
  if (typeof value !== "string") return DEFAULT_CUISINE;
  const canonical = CANONICAL_BY_NORMALIZED[normalizeCuisine(value)];
  return canonical ?? DEFAULT_CUISINE;
}

/** True when the value is a recognised supported cuisine (validation helper). */
export function isSupportedCuisine(value: unknown): boolean {
  return (
    typeof value === "string" && CANONICAL_BY_NORMALIZED[normalizeCuisine(value)] !== undefined
  );
}

/**
 * Human/LLM-facing statement embedding the RESOLVED cuisine. Feed this to any AI
 * generator so it clearly follows the resolved cuisine and never picks unrelated
 * foods for that cuisine.
 */
export function cuisineStatement(cuisine: SupportedCuisine): string {
  return `Resolved cuisine: ${cuisine}. All food recommendations must follow this cuisine.`;
}