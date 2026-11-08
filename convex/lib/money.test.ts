import { expect, test } from "vitest";
import { centsToInput, formatUsd, MAX_PRICE_CENTS, parseUsdToCents } from "./money";

test("parseUsdToCents accepts common ways of writing a price", () => {
  expect(parseUsdToCents("12")).toBe(1200);
  expect(parseUsdToCents("12.5")).toBe(1250);
  expect(parseUsdToCents("12,50")).toBe(1250);
  expect(parseUsdToCents("1 200,00")).toBe(120000);
  expect(parseUsdToCents("$ 35")).toBe(3500);
  expect(parseUsdToCents("0")).toBe(0);
});

test("parseUsdToCents refuses negative, malformed, over-precise and huge prices", () => {
  for (const bad of ["-1", "abc", "12.345", "1,200.00", "", "1.2.3,4.5", String(MAX_PRICE_CENTS)]) {
    expect(() => parseUsdToCents(bad), bad).toThrow(/INVALID_INPUT/);
  }
});

test("formatUsd and centsToInput", () => {
  expect(formatUsd(1250, "en")).toBe("$12.50");
  expect(formatUsd(120000, "en")).toBe("$1,200");
  expect(formatUsd(1250, "fr")).toMatch(/^12,50\s?\$US$/);
  expect(centsToInput(1250)).toBe("12.50");
  expect(centsToInput(1200)).toBe("12");
  expect(centsToInput(undefined)).toBe("");
});
