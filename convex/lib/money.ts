import { appError } from "./errors";

/**
 * Money (CLAUDE.md, "Money"): product prices are USD, stored as integer
 * cents; a missing price means "Price on request". Parse and format only
 * here - shared by the server and the admin's price input.
 */
export const MAX_PRICE_CENTS = 100_000_000; // $1,000,000.00

/**
 * "12" | "12.5" | "12,50" | "1 200,50" -> cents. Spaces are the only
 * thousands separator and "." or "," the decimal one, so "12.345" is
 * refused instead of being guessed.
 */
export function parseUsdToCents(input: string): number {
  const raw = input.replace(/[\s\u00a0\u202f$]/g, "").replace(/US$/i, "");
  const match = raw.match(/^(\d+)(?:[.,](\d{1,2}))?$/);
  if (!match) {
    throw appError("INVALID_INPUT", "Enter a price like 12.50 (spaces for thousands).");
  }
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > MAX_PRICE_CENTS) {
    throw appError("INVALID_INPUT", "The price is too high.");
  }
  return cents;
}

export function isValidPriceCents(cents: number) {
  return Number.isInteger(cents) && cents >= 0 && cents <= MAX_PRICE_CENTS;
}

/** 1250 -> "12,50 $US" (fr) / "$12.50" (en). */
export function formatUsd(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CD" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Cents back to an input value: 1250 -> "12.50". */
export function centsToInput(cents: number | undefined): string {
  if (cents === undefined) return "";
  return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}
