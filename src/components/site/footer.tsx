import { getTranslations } from "next-intl/server";
import { SOCIAL_KEYS } from "../../../convex/lib/settings";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { PublicSettings } from "@/lib/content";
import { Logo } from "./logo";
import { SITE_NAV } from "./nav-items";
import { whatsappUrl } from "./sections/contact-info";
import { t as pick } from "./sections/text";

const SOCIAL_LABELS = { facebook: "Facebook", linkedin: "LinkedIn", x: "X", instagram: "Instagram", youtube: "YouTube" } as const;

export async function Footer({ settings, locale }: { settings: PublicSettings; locale: Locale }) {
  const t = await getTranslations("Site");
  const socials = SOCIAL_KEYS.flatMap((key) => (settings.socials[key] ? [{ key, url: settings.socials[key]! }] : []));
  const address = pick(settings.address, locale);
  const hasContact = Boolean(settings.phone || settings.whatsapp || settings.email || address || socials.length);
  return (
    <footer className="mt-8 bg-ink px-4 pt-14 pb-8 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-white/70">{pick(settings.tagline, locale)}</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium">{t("footer.pages")}</h2>
          <ul className="flex flex-col gap-1 text-sm text-white/70">
            {[...SITE_NAV, { key: "contact", href: "/contact" } as const].map(({ key, href }) => (
              <li key={key}>
                <Link href={href} className="inline-flex min-h-9 items-center hover:text-white">
                  {t(`nav.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {hasContact ? (
        <div>
          <h2 className="mb-3 text-sm font-medium">{t("footer.contact")}</h2>
          <ul className="flex flex-col gap-1 text-sm text-white/70">
            {settings.phone ? (
              <li>
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="inline-flex min-h-9 items-center hover:text-white">
                  {settings.phone}
                </a>
              </li>
            ) : null}
            {settings.whatsapp ? (
              <li>
                <a href={whatsappUrl(settings.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center hover:text-white">
                  WhatsApp
                </a>
              </li>
            ) : null}
            {settings.email ? (
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex min-h-9 items-center break-all hover:text-white">
                  {settings.email}
                </a>
              </li>
            ) : null}
            {address ? <li className="py-2">{address}</li> : null}
          </ul>
          {socials.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {socials.map(({ key, url }) => (
                <li key={key}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-full border border-white/15 px-3 hover:bg-white/10">
                    {SOCIAL_LABELS[key]}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        ) : null}
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:justify-between">
        <p>{pick(settings.footerText, locale) || t("footer.rights")}</p>
        <Link href="/admin" className="hover:text-white">
          {t("footer.admin")}
        </Link>
      </div>
    </footer>
  );
}
