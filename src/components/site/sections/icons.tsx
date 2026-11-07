import {
  BarChart3,
  Cpu,
  Droplets,
  Globe,
  Leaf,
  MapPin,
  ShieldCheck,
  Sprout,
  Sun,
  Tractor,
  Users,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { SectionIcon } from "../../../../convex/lib/sections";

/** The icons editors can choose for features (convex/lib/sections.ts). */
export const SECTION_ICON_COMPONENTS: Record<SectionIcon, LucideIcon> = {
  Sprout,
  Leaf,
  Tractor,
  Droplets,
  Sun,
  Wheat,
  MapPin,
  ShieldCheck,
  BarChart3,
  Users,
  Globe,
  Cpu,
};
