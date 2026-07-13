import { expect, test } from "@playwright/test";

test("web navigation uses real URLs and browser history", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Đăng tin" }).first().click();
  await expect(page).toHaveURL(/\/create$/);
  await expect(page.getByText("Cần đăng nhập để đăng tin")).toBeVisible();

  await page.getByRole("button", { name: "Cộng đồng" }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/create$/);
});

test("seed account can log in and restore the web session", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run authenticated browser smoke.");

  await page.goto("/account");
  const form = page.locator("section.auth-card form");
  await form.getByLabel("Email").fill(email!);
  await form.getByLabel("Mật khẩu").fill(password!);
  await form.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mở menu tài khoản" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Mở menu tài khoản" })).toBeVisible();
});
