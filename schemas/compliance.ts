import { z } from "zod";
import {
  HazardCategory,
  HazardSeverity,
  HazardStatus,
  PetRequestStatus,
  PrsdStatus,
  RegistrationStatus,
  RightToRentStatus,
} from "@/lib/enums";

// Dates arrive from forms as "YYYY-MM-DD" strings; actions coerce to Date.
const dateString = z.string().min(1, "Date is required");

export const hazardCreateSchema = z.object({
  propertyId: z.string().min(1),
  tenancyId: z.string().optional(),
  category: z.nativeEnum(HazardCategory),
  severity: z.nativeEnum(HazardSeverity),
  reportedDate: dateString,
  reportedBy: z.string().optional(),
  description: z.string().min(3, "Please describe the hazard"),
});
export type HazardCreateInput = z.infer<typeof hazardCreateSchema>;

export const hazardStatusSchema = z.object({
  hazardId: z.string().min(1),
  status: z.nativeEnum(HazardStatus),
  note: z.string().optional(),
});

export const petCreateSchema = z.object({
  tenancyId: z.string().min(1),
  petDescription: z.string().min(2, "Describe the pet"),
  requestedDate: dateString,
});

export const petDecideSchema = z.object({
  petRequestId: z.string().min(1),
  status: z.nativeEnum(PetRequestStatus),
  decisionReason: z.string().optional(),
});

export const rentIncreaseSchema = z.object({
  tenancyId: z.string().min(1),
  noticeServedDate: dateString,
  effectiveDate: dateString,
  proposedRent: z.string().min(1, "Enter the proposed rent"),
});

export const registrationSchema = z.object({
  ombudsmanScheme: z.string().optional(),
  ombudsmanRef: z.string().optional(),
  ombudsmanRenewalDate: z.string().optional(),
  status: z.nativeEnum(RegistrationStatus),
});

export const prsdUpdateSchema = z.object({
  propertyId: z.string().min(1),
  prsdId: z.string().optional(),
  prsdStatus: z.nativeEnum(PrsdStatus),
  prsdRegisteredDate: z.string().optional(),
});

export const rightToRentSchema = z.object({
  tenantId: z.string().min(1),
  rightToRentStatus: z.nativeEnum(RightToRentStatus),
  rightToRentExpiry: z.string().optional(),
});
