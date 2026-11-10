import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test("redirects signed-out visitors to sign-in", async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto("/editor");

  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  await expect(page.getByRole("navigation", { name: "Editor" })).toHaveCount(0);
});

test("projects sidebar opens over the editor canvas", async ({ page }) => {
  const emailAddress = process.env.E2E_CLERK_USER_EMAIL;

  if (!emailAddress) {
    throw new Error("Set E2E_CLERK_USER_EMAIL to an existing Clerk development test user.");
  }

  await setupClerkTestingToken({ page });
  await page.goto("/");
  await clerk.signIn({ page, emailAddress });
  await page.goto("/editor");

  const navbar = page.getByRole("navigation", { name: "Editor" });
  const toggle = navbar.getByRole("button", { name: /project sidebar/i });
  const canvas = page.getByRole("main", { name: "Editor canvas" });
  const sidebar = page.getByRole("complementary", { name: "Projects" });

  await test.step("desktop layout and project tabs", async () => {
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(canvas).toBeVisible();
    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).not.toBeNull();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(sidebar).toBeInViewport({ ratio: 1 });
    expect(await canvas.boundingBox()).toEqual(canvasBounds);
    await expect(sidebar.getByText("No projects yet.", { exact: true })).toBeVisible();

    await sidebar.getByRole("tab", { name: "Shared", exact: true }).click();
    await expect(sidebar.getByText("No shared projects yet.")).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "New Project" })).toBeDisabled();

    await sidebar.getByRole("button", { name: "Close projects" }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(await canvas.boundingBox()).toEqual(canvasBounds);
  });

  await test.step("mobile layout", async () => {
    await page.setViewportSize({ width: 320, height: 640 });
    const canvasBounds = await canvas.boundingBox();
    expect(canvasBounds).not.toBeNull();

    await toggle.click();
    await expect(sidebar).toBeInViewport({ ratio: 1 });
    expect(await canvas.boundingBox()).toEqual(canvasBounds);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
