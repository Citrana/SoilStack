import { expect, test } from "vitest";
import { diff, snapshot } from "./audit";

test("diff keeps only changed fields and ignores object key order", () => {
  expect(diff({ alt: { en: "Corn", fr: "Maïs" } }, { alt: { fr: "Maïs", en: "Corn" } })).toBeNull();
  expect(diff({ a: 1, b: { fr: "x", en: "y" } }, { a: 1, b: { fr: "x", en: "z" } })).toEqual({
    before: { b: { fr: "x", en: "y" } },
    after: { b: { fr: "x", en: "z" } },
  });
  expect(diff({ a: undefined }, { a: null })).toBeNull();
});

test("snapshot drops system fields and stores missing values as null", () => {
  expect(snapshot({ _id: "1", name: "x", note: undefined })).toEqual({ name: "x", note: null });
});
