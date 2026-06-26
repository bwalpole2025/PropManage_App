import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy — PropManage",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Privacy policy</h1>
      <p>
        This summary explains what personal data PropManage holds, why, and the
        controls you have. It is written to reflect UK GDPR principles. It is a
        product summary, not legal advice.
      </p>

      <h2>What we hold</h2>
      <ul>
        <li>Your account and contact details (name, email, optional mobile).</li>
        <li>
          Property, tenancy and tenant records you enter, including financial
          transactions and compliance documents.
        </li>
        <li>
          Provider connection metadata for bank feeds and HMRC. We store only
          encrypted, opaque access tokens — never your bank or Government Gateway
          passwords.
        </li>
      </ul>

      <h2>How it is protected</h2>
      <ul>
        <li>
          Every record is isolated to your account (tenant isolation), and access
          within an account is governed by roles (owner, manager, accountant,
          assistant, viewer).
        </li>
        <li>Provider tokens are encrypted at rest (AES-256-GCM).</li>
        <li>
          Financial changes and external submissions are recorded in an
          append-only activity log.
        </li>
      </ul>

      <h2>Your rights</h2>
      <ul>
        <li>
          <strong>Access &amp; portability</strong> — export a complete copy of
          your account data as JSON from{" "}
          <strong>Settings → Privacy → Export my data</strong>.
        </li>
        <li>
          <strong>Erasure</strong> — permanently delete your account and all its
          data from <strong>Settings → Privacy → Delete account</strong>.
        </li>
        <li>
          <strong>Marketing</strong> — opt in or out of product/marketing emails
          at any time; operational emails (e.g. arrears alerts) are controlled
          separately under Notifications.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        See our <Link href="/cookies" className="text-primary underline">cookie policy</Link>.
        We are privacy-first: only strictly-necessary cookies are set unless you
        accept optional ones.
      </p>
    </>
  );
}
