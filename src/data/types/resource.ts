import type { Quality } from "./quality.ts";

export interface Resource {
  id: string;
  name: string;
  category: string;
  applicableQualities: Record<Quality, boolean>;
}
