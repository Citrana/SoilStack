import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { PostCard } from "../post-card";
import { SectionHeading, SectionShell, t } from "./text";

type LatestPosts = Extract<PublicSection, { type: "latestPosts" }>;

export function LatestPostsSection({ section, locale }: { section: LatestPosts; locale: Locale }) {
  const tb = useTranslations("Blog");
  if (section.posts.length === 0) return null;
  return (
    <SectionShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading title={t(section.title, locale)} intro={t(section.intro, locale)} />
        <Link href="/blog" className="mb-10 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-leaf">
          {tb("allPosts")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.posts.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} locale={locale} />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
