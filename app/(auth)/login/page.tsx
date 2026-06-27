import { redirect } from "next/navigation";

// During the closed beta the login lives at the hidden /beta-access route.
// /login is kept only as a back-compatible alias (NextAuth, logout, reset links)
// and simply forwards there.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  redirect(reset ? "/beta-access?reset=1" : "/beta-access");
}
