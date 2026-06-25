import { test, expect } from "@playwright/test";

test.describe("auth smoke", () => {
  test("unauthenticated /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Welcome back" }),
    ).toBeVisible();
  });

  test("seeded landlord logs in and the protected dashboard renders", async ({
    page,
  }) => {
    await page.goto("/login");

    // The login form is pre-filled; set values explicitly for robustness.
    await page.fill('input[name="email"]', "landlord@example.com");
    await page.fill('input[name="password"]', "Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Protected route renders the Overview.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Overview" }),
    ).toBeVisible();

    // Onboarding checklist (server-rendered) + a widget from the grid.
    // Checklist title is dynamic: "...N steps away from saying goodbye to your
    // spreadsheet" or, once set up, "You've said goodbye to your spreadsheet".
    await expect(
      page.getByText(/goodbye to (your spreadsheet|spreadsheets)/i),
    ).toBeVisible();
    await expect(page.getByText("Profit & Loss")).toBeVisible();
  });
});
