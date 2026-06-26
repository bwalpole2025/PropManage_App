import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie policy — PropManage",
};

export default function CookiePolicyPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Cookie policy</h1>
      <p>
        PropManage is built privacy-first. We use the smallest possible set of
        cookies and set no optional or third-party tracking cookies unless you
        explicitly choose “Accept all”.
      </p>

      <h2>Strictly necessary cookies</h2>
      <p>
        These are always on because the app cannot function without them. They
        store no marketing or profiling data.
      </p>
      <ul>
        <li>
          <strong>Session</strong> — keeps you securely signed in
          (<code>authjs.session-token</code>).
        </li>
        <li>
          <strong>Active account</strong> — remembers which account you are
          viewing (<code>pm_active_entity</code>).
        </li>
        <li>
          <strong>Layout</strong> — remembers whether the sidebar is collapsed.
        </li>
        <li>
          <strong>Cookie choice</strong> — records the preference you set below
          (<code>pm_cookie_consent</code>) so we don’t ask again.
        </li>
      </ul>

      <h2>Optional cookies</h2>
      <p>
        We currently set none. If we add product analytics in future, they will
        be enabled only after you choose “Accept all”, and you can change your
        mind at any time from <strong>Settings → Privacy</strong>.
      </p>

      <h2>Managing your choice</h2>
      <p>
        You can re-open the cookie banner and change your preference from
        <strong> Settings → Privacy → Manage cookie preferences</strong>, or by
        clearing cookies in your browser.
      </p>
    </>
  );
}
