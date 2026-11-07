import { expect, test } from "vitest";
import { parseRevalidateRequest, safeEqual } from "./revalidate-request";

test("parseRevalidateRequest checks the secret and only accepts known tags", () => {
  const ok = (body: unknown) => parseRevalidateRequest("Bearer s3cret", body, "s3cret");
  expect(ok({ tags: ["page:home", "settings", "page:home"] })).toEqual({ ok: true, tags: ["page:home", "settings"] });
  expect(ok({ tags: ["page:nope"] })).toEqual({ ok: false, status: 400 });
  expect(ok({ tags: [] })).toEqual({ ok: false, status: 400 });
  expect(ok(null)).toEqual({ ok: false, status: 400 });
  expect(parseRevalidateRequest("Bearer wrong", { tags: ["settings"] }, "s3cret")).toEqual({ ok: false, status: 401 });
  expect(parseRevalidateRequest(null, { tags: ["settings"] }, "s3cret")).toEqual({ ok: false, status: 401 });
  expect(parseRevalidateRequest("Bearer x", { tags: ["settings"] }, undefined)).toEqual({ ok: false, status: 503 });
});

test("safeEqual", () => {
  expect(safeEqual("abc", "abc")).toBe(true);
  expect(safeEqual("abc", "abd")).toBe(false);
  expect(safeEqual("abc", "abcd")).toBe(false);
});
