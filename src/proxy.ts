import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Locale detection + redirects (`/` -> `/fr`), Next.js 16's proxy convention.
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
