import { z } from "zod";
import { DepositScheme, RentFrequency, TenancyStatus } from "@/lib/enums";

// Edit-tenancy dialog. Money/dates arrive as form strings; the action coerces
// them and treats empty as "leave unchanged".
export const tenancyUpdateSchema = z.object({
  tenantName: z.string().optional(),
  tenantEmail: z.string().optional(),
  rent: z.string().optional(),
  rentFrequency: z.nativeEnum(RentFrequency).optional(),
  rentDueDay: z.string().optional(),
  deposit: z.string().optional(),
  depositScheme: z.nativeEnum(DepositScheme).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.nativeEnum(TenancyStatus).optional(),
});
export type TenancyUpdateInput = z.infer<typeof tenancyUpdateSchema>;
