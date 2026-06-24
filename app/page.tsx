import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/active-org";

export default async function HomePage() {
  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/login");
}
