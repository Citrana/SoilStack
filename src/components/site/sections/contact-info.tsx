import { Mail, MapPin, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { SectionHeading, SectionShell, t } from "./text";

type ContactInfo = Extract<PublicSection, { type: "contactInfo" }>;

/** wa.me wants digits only. */
export function whatsappUrl(number: string) {
  return `https://wa.me/${number.replace(/[^0-9]/g, "")}`;
}

export function ContactInfoSection({ section, locale }: { section: ContactInfo; locale: Locale }) {
  const tc = useTranslations("Site.contact");
  const { contact } = section;
  const address = t(contact.address, locale);
  const cards: Array<{ icon: LucideIcon; label: string; value: string; href?: string; external?: boolean }> = [];
  if (contact.phone) cards.push({ icon: Phone, label: tc("phone"), value: contact.phone, href: `tel:${contact.phone.replace(/\s/g, "")}` });
  if (contact.whatsapp)
    cards.push({ icon: MessageCircle, label: tc("whatsapp"), value: contact.whatsapp, href: whatsappUrl(contact.whatsapp), external: true });
  if (contact.email) cards.push({ icon: Mail, label: tc("email"), value: contact.email, href: `mailto:${contact.email}` });
  if (address) cards.push({ icon: MapPin, label: tc("address"), value: address, href: contact.mapUrl || undefined, external: true });

  return (
    <SectionShell>
      <SectionHeading title={t(section.title, locale)} intro={t(section.intro, locale)} />
      {cards.length === 0 ? (
        <p className="rounded-2xl border bg-card p-6 text-muted-foreground">{tc("soon")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cards.map(({ icon: Icon, label, value, href, external }) => {
            const body = (
              <>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lime-tint text-forest">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-muted-foreground">{label}</span>
                  <span className="block font-medium break-words">{value}</span>
                </span>
              </>
            );
            const className = "flex min-h-20 items-center gap-4 rounded-2xl border bg-card p-4";
            return (
              <li key={label}>
                {href ? (
                  <a
                    href={href}
                    className={`${className} transition-colors hover:border-leaf`}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {body}
                  </a>
                ) : (
                  <div className={className}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}
