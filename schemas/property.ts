import { z } from "zod";
import { PropertyType, RentFrequency } from "@/lib/enums";

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

// Edit-information dialog. Money/dates arrive as form strings; the action does
// the pence/Date/boolean coercion so empty fields mean "leave unchanged".
export const propertyUpdateSchema = z.object({
  currentValue: z.string().optional(),
  purchasePrice: z.string().optional(),
  purchaseDate: z.string().optional(),
  rentalIncome: z.string().optional(),
  rentalIncomeFrequency: z.nativeEnum(RentFrequency).optional(),
  isFHL: z.enum(["true", "false"]).optional(),
  furnished: z.enum(["true", "false"]).optional(),
  epcRating: z.enum(["", "A", "B", "C", "D", "E", "F", "G"]).optional(),
  epcScore: z.string().optional(),
  epcExpiryDate: z.string().optional(),
  portfolioId: z.string().optional(),
});
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;

// Street-view camera position persisted as JSON on the property. The optional
// numeric fields use `z.preprocess` to map a blank form value ("") to undefined
// BEFORE coercion — otherwise `z.coerce.number("")` yields 0 and a blank Zoom
// would be persisted as 0 (a world-level map) instead of being omitted.
const optionalCoerced = (schema: z.ZodTypeAny) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

export const cameraPositionSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  heading: optionalCoerced(z.coerce.number().min(0).max(360)),
  pitch: optionalCoerced(z.coerce.number().min(-90).max(90)),
  zoom: optionalCoerced(z.coerce.number().min(0).max(22)),
});
export type CameraPositionInput = z.infer<typeof cameraPositionSchema>;
