import { expect, test } from "@playwright/test";

test("home wizard renders and accepts demo idea", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Turn messy ideas/i })).toBeVisible();

  const interviewResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/interview") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Use demo idea/i }).click();
  await interviewResponse;

  await expect(page.getByText(/Critical question/i)).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: /Who is the primary user/i }),
  ).toBeVisible();
});
