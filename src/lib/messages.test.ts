import { expect, test } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { ERROR_CODES } from "../../convex/lib/errors";
import { PERMISSION_KEYS, PERMISSION_MODULES } from "../../convex/lib/permissions";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix.slice(0, -1)];
  return Object.entries(value).flatMap(([key, child]) => keyPaths(child, `${prefix}${key}.`));
}

test("fr.json and en.json have exactly the same keys (CLAUDE.md, i18n)", () => {
  expect(keyPaths(fr).sort()).toEqual(keyPaths(en).sort());
});

test("every permission, permission module and error code is translated", () => {
  const keys = new Set(keyPaths(fr));
  for (const key of PERMISSION_KEYS) expect(keys, key).toContain(`Permissions.${key}`);
  for (const name of PERMISSION_MODULES) expect(keys, name).toContain(`PermissionModules.${name}`);
  for (const code of ERROR_CODES) expect(keys, code).toContain(`Errors.${code}`);
});

test("public client components only use the namespaces sent to visitors", async () => {
  const { PUBLIC_CLIENT_NAMESPACES } = await import("../i18n/public-messages");
  // Client components rendered on public pages, and the namespaces they use.
  const sources = import.meta.glob(["../components/locale-switcher.tsx", "../components/site/**/*.tsx"], {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  for (const [path, source] of Object.entries(sources)) {
    if (!source.startsWith('"use client"')) continue;
    for (const [, ns] of source.matchAll(/useTranslations\("([A-Za-z]+)/g)) {
      expect(PUBLIC_CLIENT_NAMESPACES, `${path} uses "${ns}"`).toContain(ns);
    }
  }
});
