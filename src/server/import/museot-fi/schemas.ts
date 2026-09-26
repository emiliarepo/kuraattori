import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const listingItemSchema = z.object({
  sourceId: z.string().regex(/^\d+$/),
  title: z.string().min(1),
  excerpt: z.string(),
  museumName: z.string().min(1),
  city: z.string().min(1),
  imageUrl: z.string().url().optional(),
  startDate: isoDate,
  endDate: isoDate.optional(),
});

export const detailSchema = z.object({
  title: z.string().min(1),
  museumSourceId: z.string().regex(/^\d+$/),
  museumName: z.string().min(1),
  city: z.string().optional(),
  description: z.string().optional(),
  startDate: isoDate,
  endDate: isoDate.optional(),
  imageUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  museumCardEligible: z.boolean(),
  categorySourceIds: z.array(z.string()),
});
