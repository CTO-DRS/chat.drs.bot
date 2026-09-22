import { expect, test } from "@playwright/test";

/**
 * Auto dark mode — the theme selector offers Light / Dark / System (auto).
 * "System" makes the UI follow the OS `prefers-color-scheme` live, without
 * needing a reload, which is what these tests verify.
 */
test.describe("Theme Selection", () => {
  test("fresh visit follows system dark preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("fresh visit follows system light preference", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("user can force light from the theme submenu", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByTestId("user-nav-button").click();
    await page.getByTestId("user-nav-item-theme").hover();
    await page.getByTestId("theme-item-light").click();

    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("user can force dark from the theme submenu", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await page.getByTestId("user-nav-button").click();
    await page.getByTestId("user-nav-item-theme").hover();
    await page.getByTestId("theme-item-dark").click();

    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("system option tracks live OS preference changes", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    await page.getByTestId("user-nav-button").click();
    await page.getByTestId("user-nav-item-theme").hover();
    await page.getByTestId("theme-item-system").click();

    await expect(page.locator("html")).toHaveClass(/dark/);

    // Simulate the OS switching to light mode — UI must follow without reload.
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    // And back to dark.
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
