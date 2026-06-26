import { z } from "zod";

// Documents area. Dates/ids arrive as FormData strings; the action/service does
// the Date coercion and ownership checks. `category` is a built-in
// DocumentCategory key OR a DocumentCustomCategory id (validated server-side).
export const documentUploadSchema = z.object({
  category: z.string().min(1, "Choose a category"),
  propertyId: z.string().optional(),
  tenancyId: z.string().optional(),
  issuedDate: z.string().optional(),
  expiryDate: z.string().optional(),
  reference: z.string().max(200).optional(),
});
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

export const customCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60, "Keep it under 60 characters"),
});
export type CustomCategoryInput = z.infer<typeof customCategorySchema>;
