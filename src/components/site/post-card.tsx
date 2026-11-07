import { useFormatter, useTranslations } from "next-intl";
import type { PostCard as PostCardData } from "../../../convex/lib/posts";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { FieldPattern, SectionImage } from "./sections/section-image";
import { t } from "./sections/text";

/** A blog post as a card: cover, date, reading time, title, summary. */
export function PostCard({ post, locale }: { post: PostCardData; locale: Locale }) {
  const tb = useTranslations("Blog");
  const format = useFormatter();
  return (
    <Link
      href={{ pathname: "/blog/[slug]", params: { slug: post.slug } }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-leaf"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {post.cover ? (
          <SectionImage
            image={post.cover}
            locale={locale}
            sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <FieldPattern />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs text-muted-foreground">
          <time dateTime={new Date(post.publishedAt).toISOString()}>{format.dateTime(post.publishedAt, { dateStyle: "medium" })}</time>
          {" · "}
          {tb("readingTime", { minutes: post.readingMinutes[locale] })}
        </p>
        <h3 className="text-lg font-medium text-balance">{t(post.title, locale)}</h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{t(post.excerpt, locale)}</p>
      </div>
    </Link>
  );
}
