import type { AdPlatform } from "../ad-generation/types";

export const CALENDAR_ITEM_STATUSES = ["draft", "approved"] as const;
export type CalendarItemStatus = (typeof CALENDAR_ITEM_STATUSES)[number];

export interface CalendarItem {
  id: string;
  brandBrainId: string;
  date: string;
  platforms: AdPlatform[];
  content: string;
  status: CalendarItemStatus;
  createdAt: string;
  updatedAt: string;
}
