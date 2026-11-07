import { expect, test } from "vitest";
import { fitWithin, formatBytes, webpFilename } from "./image";

test("fitWithin scales the longest side down and never upscales", () => {
  expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
  expect(fitWithin(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  expect(fitWithin(5000, 5000, 2000)).toEqual({ width: 2000, height: 2000 });
  expect(fitWithin(10000, 3, 2000)).toEqual({ width: 2000, height: 1 });
});

test("webpFilename makes a safe .webp name", () => {
  expect(webpFilename("Photo Champ Été 12.JPG")).toBe("photo-champ-ete-12.webp");
  expect(webpFilename(".png")).toBe("image.webp");
});

test("formatBytes", () => {
  expect(formatBytes(512, "en")).toBe("512 B");
  expect(formatBytes(1536, "en")).toBe("1.5 KB");
  expect(formatBytes(2.5 * 1024 * 1024, "fr")).toBe("2,5 MB");
});
