import Image from "next/image";
import type { PublicImage } from "../../../../convex/lib/media";
import type { Locale } from "@/i18n/routing";
import { t } from "./text";

/** A content image filling its (relative, sized) parent. */
export function SectionImage({
  image,
  locale,
  sizes,
  preload = false,
  className = "object-cover",
}: {
  image: PublicImage;
  locale: Locale;
  sizes: string;
  preload?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={image.url}
      alt={t(image.alt, locale)}
      fill
      sizes={sizes}
      placeholder="blur"
      blurDataURL={image.blurDataUrl}
      preload={preload}
      className={className}
    />
  );
}

/** Crop-rows pattern shown where no photo was chosen yet. */
export function FieldPattern({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 bg-forest ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 50% 0%, rgb(78 139 58 / 0.55), transparent 60%), repeating-linear-gradient(100deg, rgb(255 255 255 / 0.06) 0 14px, transparent 14px 34px)",
      }}
    />
  );
}
