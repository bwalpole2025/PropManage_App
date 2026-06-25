import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your landlord account.
        </p>
      </div>

      {reset ? (
        <p className="mb-4 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          Password updated — sign in with your new password.
        </p>
      ) : null}

      <LoginForm />

      <div className="mt-3 text-right">
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        New to PropManage?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>

      {process.env.NODE_ENV !== "production" ? (
        <div className="mt-6 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo logins</p>
          <p className="mt-1">Landlord — landlord@example.com</p>
          <p>Accountant — accountant@example.com</p>
          <p>Password — Password123!</p>
        </div>
      ) : null}
    </div>
  );
}
