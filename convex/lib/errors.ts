import { ConvexError } from "convex/values";

/**
 * Every error a Convex function throws on purpose has a stable `code`.
 * The admin UI translates codes through `Errors.<code>` in
 * messages/{fr,en}.json; `message` is an English fallback for logs/tests.
 * Add a code here and to both message files together.
 */
export const ERROR_CODES = [
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "INVALID_INPUT",
  "EMAIL_TAKEN",
  "PASSWORD_TOO_SHORT",
  "OWN_ACCOUNT",
  "LAST_SUPER_ADMIN",
  "ROLE_LOCKED",
  "ROLE_IN_USE",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type AppErrorData = { code: ErrorCode; message: string };

export function appError(code: ErrorCode, message: string) {
  return new ConvexError<AppErrorData>({ code, message });
}
