import { jsonLdString } from "@/lib/seo";

/** Structured data for search engines (schema.org), safely escaped. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
