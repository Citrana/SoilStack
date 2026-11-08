import type { Loc } from "./i18n";

/**
 * The permission catalog - the single source of truth for every permission
 * key. Seeded idempotently into the `permissions` table by `rbac:seedRbac`.
 * Add new keys here; never check a key that isn't listed.
 *
 * `description` is an English fallback only - the UI translates keys via
 * `Permissions.<key>` in messages/*.json.
 */
export const PERMISSIONS = [
  { key: "pages.edit", module: "pages", description: "Edit page drafts" },
  { key: "pages.publish", module: "pages", description: "Publish pages" },

  { key: "blog.write", module: "blog", description: "Write and edit own blog drafts" },
  { key: "blog.edit_all", module: "blog", description: "Edit every blog post" },
  { key: "blog.publish", module: "blog", description: "Publish blog posts" },

  { key: "products.manage", module: "products", description: "Create and edit products and categories" },
  { key: "products.publish", module: "products", description: "Publish products" },

  { key: "projects.manage", module: "projects", description: "Create, edit and publish projects" },

  { key: "media.upload", module: "media", description: "Upload images" },
  { key: "media.delete", module: "media", description: "Delete images" },

  { key: "settings.manage", module: "settings", description: "Edit site settings (contact, socials, footer)" },

  { key: "users.manage", module: "admin", description: "Manage user accounts" },
  { key: "roles.manage", module: "admin", description: "Manage roles and permissions" },
  { key: "audit.view", module: "admin", description: "View the audit log" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
export type PermissionModule = (typeof PERMISSIONS)[number]["module"];

export const PERMISSION_KEYS: readonly PermissionKey[] = PERMISSIONS.map(
  (p) => p.key,
);

export const PERMISSION_MODULES: readonly PermissionModule[] = [
  ...new Set(PERMISSIONS.map((p) => p.module)),
];

export function isPermissionKey(key: string): key is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(key);
}

/** The locked system role: always holds every permission. */
export const SUPER_ADMIN_ROLE_KEY = "super_admin";

export const SUPER_ADMIN_ROLE = {
  key: SUPER_ADMIN_ROLE_KEY,
  name: { fr: "Super administrateur", en: "Super Admin" },
  description: {
    fr: "Accès complet, y compris la gestion des utilisateurs et des rôles.",
    en: "Full access, including user and role management.",
  },
} as const satisfies { key: string; name: Loc; description: Loc };

type RoleSeed = {
  key: string;
  name: Loc;
  description: Loc;
  permissions: readonly PermissionKey[];
};

type SeedStep = {
  key: string;
  /** Roles created by this step (skipped if a role with the key exists). */
  createRoles?: readonly RoleSeed[];
  /** Grants added to roles that already exist. */
  grants?: ReadonlyArray<readonly [roleKey: string, PermissionKey]>;
  /** Grants taken away from existing roles (applied after grants). */
  revokes?: ReadonlyArray<readonly [roleKey: string, PermissionKey]>;
};

/**
 * One-shot changes to roles. `rbac:seedRbac` applies each step once and
 * records its key in `appliedSeedSteps`, so a role an admin later edits or
 * deletes stays that way after re-seeding. Never edit or reorder an applied
 * step - add a new one.
 */
export const SEED_STEPS: readonly SeedStep[] = [
  {
    // Suggested starter roles - ordinary roles the Super Admin can edit or
    // delete like any other.
    key: "2026-11-starter-roles",
    createRoles: [
      {
        key: "content_editor",
        name: { fr: "Éditeur de contenu", en: "Content Editor" },
        description: {
          fr: "Modifie et publie les pages du site.",
          en: "Edits and publishes the site's pages.",
        },
        permissions: ["pages.edit", "pages.publish", "media.upload"],
      },
      {
        key: "blog_writer",
        name: { fr: "Rédacteur du blog", en: "Blog Writer" },
        description: {
          fr: "Rédige des articles de blog (brouillons).",
          en: "Writes blog posts (drafts).",
        },
        permissions: ["blog.write", "media.upload"],
      },
      {
        key: "product_manager",
        name: { fr: "Gestionnaire des produits", en: "Product Manager" },
        description: {
          fr: "Gère et publie le catalogue de produits.",
          en: "Manages and publishes the product catalogue.",
        },
        permissions: ["products.manage", "products.publish", "media.upload"],
      },
    ],
  },
  {
    // Projects arrive: the Content Editor, who runs the company pages,
    // also manages the projects shown on them.
    key: "2026-11-projects-content-editor",
    grants: [["content_editor", "projects.manage"]],
  },
];
