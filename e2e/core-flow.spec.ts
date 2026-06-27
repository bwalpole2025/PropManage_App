import { test, expect } from "@playwright/test";

// The acceptance-critical happy path:
//   add a property → track a transaction → view the dashboard → generate a report.
// Runs against the seeded landlord on the production build (see playwright.config).
test.describe("core happy path", () => {
  test("add property → track transaction → dashboard → report", async ({
    page,
  }) => {
    const stamp = Date.now();
    const address = `E2E Test House ${stamp}`;
    const description = `E2E Rent ${stamp}`;

    // Pre-accept the (essential-only) cookie choice so the consent banner never
    // overlays form controls during the run.
    await page.context().addCookies([
      {
        name: "pm_cookie_consent",
        value: encodeURIComponent(JSON.stringify({ choice: "essential", v: 1 })),
        domain: "localhost",
        path: "/",
      },
    ]);

    // --- Sign in (seeded landlord, closed-beta route) --------------------
    await page.goto("/beta-access");
    await page.fill('input[name="email"]', "landlord@example.com");
    await page.fill('input[name="password"]', "Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // --- 1. Add a property ----------------------------------------------
    await page.goto("/properties/new");
    await page.getByLabel("Address line 1").fill(address);
    await page.getByLabel("City").fill("Manchester");
    await page.getByLabel("Postcode").fill("M1 1AA");
    await page.getByRole("button", { name: /save property/i }).click();

    // Success navigates to the new property's detail page (away from /new).
    await page.waitForURL((url) => !url.pathname.endsWith("/new"), {
      timeout: 15_000,
    });
    // The new property shows up in the portfolio list.
    await page.goto("/properties");
    await expect(page.getByText(address)).toBeVisible({ timeout: 10_000 });

    // --- 2. Track a transaction -----------------------------------------
    // Target the form inputs by id — "Date" as an accessible name also matches
    // sidebar nav controls, so ids keep the selectors unambiguous.
    await page.goto("/transactions/new");
    await page.locator("#category").selectOption("RENT_INCOME");
    await page.locator("#amount").fill("1250.00");
    await page.locator("#date").fill("2026-06-26");
    await page.locator("#description").fill(description);
    await page.getByRole("button", { name: /save transaction/i }).click();

    // createTransactionAction redirects back to the ledger.
    await expect(page).toHaveURL(/\/transactions(\?|$)/, { timeout: 15_000 });

    // --- 3. View the dashboard ------------------------------------------
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Overview" }),
    ).toBeVisible();
    await expect(page.getByText("Profit & Loss")).toBeVisible();

    // --- 4. Generate a report -------------------------------------------
    // The transactions CSV export is a report that must contain the txn we just
    // added — proving the data flowed all the way through. Reuses the browser's
    // authenticated session cookies.
    const res = await page.request.get("/api/transactions/export");
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["content-type"]).toContain("csv");
    const csv = await res.text();
    expect(csv).toContain(description);
  });
});
