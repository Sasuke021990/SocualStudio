import { z } from "zod";
import { adPlatformSchema } from "../ad-generation/schemas";

export const calendarItemStatusSchema = z.enum(["draft", "approved"]);

export const createCalendarItemSchema = z.object({
  brandBrainId: z.string().min(1, "brandBrainId is required"),
  date: z.string().min(1, "date is required").regex(/^\d{4}-\d{2}-\d{2}$/, "date must be an ISO date (YYYY-MM-DD)"),
  platforms: z.array(adPlatformSchema).min(1, "at least one platform is required"),
  content: z.string().min(1, "content is required"),
});

export const updateCalendarItemStatusSchema = z.object({
  status: calendarItemStatusSchema,
});
