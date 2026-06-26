import { revalidatePath } from "next/cache";

/** Revalidate everything a tenancy change touches (lists, dashboard, calendar). */
export function revalidateTenancy(propertyId?: string) {
  revalidatePath("/tenancies");
  revalidatePath("/dashboard");
  revalidatePath("/properties");
  if (propertyId) revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/files/calendar");
}
