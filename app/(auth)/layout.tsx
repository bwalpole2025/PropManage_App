import Link from "next/link";
import { Building2 } from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/active-org";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Already signed in? Skip the auth screens.
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Building2 className="h-6 w-6" />
          PropManage
        </Link>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">
            Replace the landlord spreadsheet.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/80">
            Track rent and expenses automatically, catch arrears early, keep
            compliance certificates current, and stay ready for Making Tax
            Digital — all in one place.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-primary-foreground/80">
            <li>• Real-time bank feeds with missing-rent alerts</li>
            <li>• SA105-aligned tax estimates</li>
            <li>• Expiry reminders at 30 / 14 / 7 / 1 days</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Estimates shown in the app are not tax advice.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">PropManage</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
