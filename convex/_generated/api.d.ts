/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as healthCheck from "../healthCheck.js";
import type * as http from "../http.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_defaultContent from "../lib/defaultContent.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_i18n from "../lib/i18n.js";
import type * as lib_media from "../lib/media.js";
import type * as lib_pages from "../lib/pages.js";
import type * as lib_password from "../lib/password.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_rbac from "../lib/rbac.js";
import type * as lib_sections from "../lib/sections.js";
import type * as lib_settings from "../lib/settings.js";
import type * as media from "../media.js";
import type * as pages from "../pages.js";
import type * as rbac from "../rbac.js";
import type * as revalidate from "../revalidate.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  healthCheck: typeof healthCheck;
  http: typeof http;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/defaultContent": typeof lib_defaultContent;
  "lib/errors": typeof lib_errors;
  "lib/i18n": typeof lib_i18n;
  "lib/media": typeof lib_media;
  "lib/pages": typeof lib_pages;
  "lib/password": typeof lib_password;
  "lib/permissions": typeof lib_permissions;
  "lib/rbac": typeof lib_rbac;
  "lib/sections": typeof lib_sections;
  "lib/settings": typeof lib_settings;
  media: typeof media;
  pages: typeof pages;
  rbac: typeof rbac;
  revalidate: typeof revalidate;
  seed: typeof seed;
  settings: typeof settings;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
