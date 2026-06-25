"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/active-org";
import { createMobileOtp, consumeMobileOtp } from "@/lib/auth/tokens";
import { sendVerificationSms } from "@/lib/sms";
import {
  profileSchema,
  changePasswordSchema,
  mobileSchema,
  mobileCodeSchema,
} from "@/schemas/settings";

export interface ProfileFormState {
  error?: string;
  success?: string;
}

/** Update editable profile fields. Revalidates the layout so the sidebar name refreshes. */
export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    numberOfPropertiesManaged: formData.get("numberOfPropertiesManaged"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName ? parsed.data.lastName : null,
      numberOfPropertiesManaged: parsed.data.numberOfPropertiesManaged,
    },
  });
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  return { success: "Profile updated." };
}

export async function changePasswordAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const sessionUser = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
  });
  if (!user.passwordHash) {
    return { error: "Set a password from your invite link first." };
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { error: "Your current password is incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) },
  });
  return { success: "Password updated." };
}

/** Save a mobile number and send a 6-digit verification code. */
export async function startMobileVerificationAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = mobileSchema.safeParse({ mobile: formData.get("mobile") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid number." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { mobile: parsed.data.mobile, mobileVerified: false },
  });
  const code = await createMobileOtp(user.id);
  await sendVerificationSms(parsed.data.mobile, code);
  revalidatePath("/settings");
  return { success: "We've sent a 6-digit code to your phone." };
}

export async function confirmMobileVerificationAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = mobileCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter the code." };
  }
  const ok = await consumeMobileOtp(user.id, parsed.data.code);
  if (!ok) return { error: "That code is incorrect or has expired." };

  await prisma.user.update({
    where: { id: user.id },
    data: { mobileVerified: true },
  });
  revalidatePath("/settings");
  return { success: "Mobile number verified." };
}
