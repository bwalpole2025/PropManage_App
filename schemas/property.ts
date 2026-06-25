import { z } from "zod";
import { PropertyType } from "@/lib/enums";

// Single source of truth: consumed by BOTH the tRPC `.input()` and the RHF
// `zodResolver`. `z.coerce.number()` lets the same schema accept the FormData
// string ("3") from the server-action page and the numeric value from RHF.
export const propertyCreateSchema = z.object({
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(1, "Postcode is required"),
  propertyType: z.nativeEnum(PropertyType).default(PropertyType.FLAT),
  bedrooms: z.coerce.number().int().min(0).max(50).optional(),
});

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
