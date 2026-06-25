import Link from "next/link";
import { Building2, CheckCircle2, XCircle } from "lucide-react";
import { verifyEmailAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { ok } = await verifyEmailAction(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          {ok ? (
            <>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" /> Email verified
              </CardTitle>
              <CardDescription>
                Thanks — your email address is now confirmed.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-danger" /> Link invalid
              </CardTitle>
              <CardDescription>
                This verification link is invalid or has expired. You can request
                a new one from Settings → Security.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          <Link href={ok ? "/dashboard" : "/login"}>
            <Button className="w-full">
              {ok ? "Go to dashboard" : "Go to sign in"}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
