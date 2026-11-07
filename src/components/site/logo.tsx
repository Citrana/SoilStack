import { cn } from "@/lib/utils";

/** SoilStack wordmark: a leaf over soil layers. */
export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="9" className={tone === "dark" ? "fill-white/10" : "fill-forest"} />
        <path d="M16 6c5 2 7 6 6 11-4 0-7-2-8-6 0-2 .5-3.5 2-5Z" className="fill-[#8bc34a]" />
        <path d="M16 6c-1.5 1.5-2 3-2 5" stroke="#4e8b3a" strokeWidth="1.2" fill="none" />
        <rect x="7" y="20" width="18" height="2.4" rx="1.2" className="fill-[#c8a27a]" />
        <rect x="9" y="24" width="14" height="2.4" rx="1.2" className="fill-[#7a5a3a]" />
      </svg>
      <span>SoilStack</span>
    </span>
  );
}
