"use client";

import { ConvexError } from "convex/values";
import { useTranslations } from "next-intl";
import { ERROR_CODES, type ErrorCode } from "../../convex/lib/errors";

function errorCode(error: unknown): ErrorCode | null {
  if (!(error instanceof ConvexError)) return null;
  const code = (error.data as { code?: unknown } | null)?.code;
  return typeof code === "string" && (ERROR_CODES as readonly string[]).includes(code)
    ? (code as ErrorCode)
    : null;
}

/**
 * Turns an error thrown by a Convex function into a translated message,
 * from its `code` (convex/lib/errors.ts). Unknown errors get a generic one.
 */
export function useErrorMessage() {
  const t = useTranslations("Errors");
  return (error: unknown): string => {
    const code = errorCode(error);
    return code ? t(code) : t("generic");
  };
}
