import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test("redirects signed-out visitors and leaves auth forms public", async ({ page }) => {
  await setupClerkTestingToken({ page });

  await page.goto("/");
  await expect(page).toHaveURL("/sign-in");

  await page.goto("/editor");

  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  await expect(page.getByRole("navigation", { name: "Editor" })).toHaveCount(0);

  await page.goto("/editor/missing-room");
  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);

  await page.goto("/sign-in-private.json");
  await expect(page).toHaveURL(/\/sign-in\?/);

  for (const [path, component] of [
    ["/sign-in", "SignIn"],
    ["/sign-up", "SignUp"],
  ]) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(path);

    const form = page.locator(`[data-clerk-component="${component}"]`);
    const brandPanel = page.getByRole("complementary");
    await expect(form).toBeVisible();
    await expect(brandPanel).toBeVisible();

    await page.setViewportSize({ width: 320, height: 640 });
    await expect(brandPanel).toBeHidden();
    await expect(form).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  }
});

test("editor home and sidebar manage persisted projects", async ({ page, context }) => {
  const emailAddress = process.env.E2E_CLERK_USER_EMAIL;

  if (!emailAddress) {
    throw new Error("Set E2E_CLERK_USER_EMAIL to an existing Clerk development test user.");
  }

  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress });
  await page.goto("/");
  await expect(page).toHaveURL("/editor");

  const navbar = page.getByRole("navigation", { name: "Editor" });
  const toggle = navbar.getByRole("button", { name: /project sidebar/i });
  const home = page.getByRole("main", { name: "Editor home" });
  const sidebar = page.getByRole("complementary", { name: "Projects" });
  const createDialog = page.getByRole("dialog", { name: "Create Project" });

  let createdRoomId = "";

  await test.step("create a project from the home and preview its room ID", async () => {
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(home.getByRole("heading", {
      name: "Create a project or open an existing one",
    })).toBeVisible();
    const newProject = home.getByRole("button", { name: "New Project" });
    await newProject.click();
    const projectName = createDialog.getByRole("textbox", { name: "Project name" });
    const create = createDialog.getByRole("button", { name: "Create Project" });
    await expect(create).toBeDisabled();
    await projectName.fill("Architecture");
    await expect(createDialog.locator("code")).toHaveText(/^architecture-[a-f0-9]{12}$/);
    await projectName.fill("Architecture & Events");
    await expect(createDialog.locator("code")).toHaveText(/^architecture-events-[a-f0-9]{12}$/);
    createdRoomId = (await createDialog.locator("code").textContent())!;
    await create.click();
    await expect(page).toHaveURL(`/editor/${createdRoomId}`);
    await expect(navbar.getByRole("heading", { name: "Architecture & Events" })).toBeVisible();
    await expect(page.getByRole("main", { name: "Architecture canvas" })).toBeVisible();
    await navbar.getByRole("button", { name: "Share project" }).click();
    const shareDialog = page.getByRole("dialog", { name: "Share project" });
    await expect(shareDialog).toBeVisible();
    const collaboratorEmail = `sharing-${Date.now()}@example.com`;
    await shareDialog.getByRole("textbox", { name: "Invite by email" }).fill(collaboratorEmail);
    await shareDialog.getByRole("button", { name: "Invite", exact: true }).click();
    const remove = shareDialog.getByRole("button", { name: `Remove ${collaboratorEmail}` });
    await expect(remove).toBeVisible();
    await remove.click();
    await expect(remove).toHaveCount(0);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await shareDialog.getByRole("button", { name: "Copy project link" }).click();
    await expect(shareDialog.getByRole("button", { name: "Copied!" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${new URL(page.url()).origin}/editor/${createdRoomId}`);
    await expect(shareDialog.getByRole("button", { name: "Copy project link" })).toBeVisible();
    await shareDialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(navbar.getByRole("button", { name: "Share project" })).toBeFocused();
    await navbar.getByRole("button", { name: "Open AI sidebar" }).click();
    await expect(page.getByRole("complementary", { name: "AI assistant" })).toBeVisible();
    await navbar.getByRole("button", { name: "Close AI sidebar" }).click();
    await expect(page.getByRole("complementary", { name: "AI assistant" })).toBeHidden();
    await toggle.click();
    await expect(sidebar.getByRole("link", { name: "Architecture & Events", exact: true })).toHaveAttribute("aria-current", "page");
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/editor/missing-room");
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
    await page.getByRole("link", { name: "Back to editor" }).click();
    await expect(page).toHaveURL("/editor");
    await page.goto("/editor");
  });

  await test.step("rename and delete an owned project", async () => {
    const homeBounds = await home.boundingBox();
    expect(homeBounds).not.toBeNull();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(sidebar).toBeInViewport({ ratio: 1 });
    expect(await home.boundingBox()).toEqual(homeBounds);
    await expect(sidebar.getByRole("link", { name: "Architecture & Events", exact: true })).toHaveAttribute("href", `/editor/${createdRoomId}`);

    await sidebar.getByRole("button", { name: "Rename Architecture & Events" }).click();
    const renameDialog = page.getByRole("dialog", { name: "Rename Project" });
    const projectName = renameDialog.getByRole("textbox", { name: "Project name" });
    await expect(renameDialog).toHaveAccessibleDescription(/Architecture & Events/);
    await expect(projectName).toHaveValue("Architecture & Events");
    await expect(projectName).toBeFocused();
    await projectName.fill("Event Architecture");
    await projectName.press("Enter");
    await expect(renameDialog).toBeHidden();
    await expect(sidebar.getByText("Event Architecture", { exact: true })).toBeVisible();

    const deleteProject = sidebar.getByRole("button", { name: "Delete Event Architecture" });
    const deleteDialog = page.getByRole("dialog", { name: "Delete Project" });
    await deleteProject.click();
    await expect(deleteDialog.getByRole("textbox")).toHaveCount(0);
    await deleteDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(deleteProject).toBeFocused();
    await deleteProject.click();
    const confirm = deleteDialog.getByRole("button", { name: "Delete Project" });
    await expect(confirm).toHaveAttribute("data-variant", "destructive");
    await confirm.click();
    await expect(deleteDialog).toBeHidden();
    await expect(deleteProject).toHaveCount(0);
  });

  await test.step("shared projects hide actions and sidebar creation opens the dialog", async () => {
    await sidebar.getByRole("tab", { name: "Shared", exact: true }).click();
    const shared = sidebar.getByRole("tabpanel", { name: "Shared" });
    await expect(shared.getByRole("button")).toHaveCount(0);
    await sidebar.getByRole("button", { name: "New Project" }).click();
    await expect(createDialog).toBeVisible();
    await expect(createDialog.getByRole("textbox", { name: "Project name" })).toBeEmpty();
    await createDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(createDialog).toBeHidden();

    await sidebar.getByRole("button", { name: "Close projects" }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  await test.step("mobile layout", async () => {
    await page.setViewportSize({ width: 320, height: 640 });
    const homeBounds = await home.boundingBox();
    expect(homeBounds).not.toBeNull();

    await toggle.click();
    await expect(sidebar).toBeInViewport({ ratio: 1 });
    expect(await home.boundingBox()).toEqual(homeBounds);

    await page.getByRole("button", { name: "Dismiss project sidebar" })
      .click({ position: { x: 5, y: 5 } });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  await test.step("Clerk account menu and sign-out", async () => {
    await navbar.getByRole("button", { name: /user menu/i }).click();
    await expect(page.getByRole("button", { name: "Manage account" })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL("/sign-in");
  });
});
