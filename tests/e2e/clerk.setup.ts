import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

setup("initialize Clerk testing", async () => {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!publishableKey?.startsWith("pk_test_") || !secretKey?.startsWith("sk_test_")) {
    throw new Error("Editor tests require Clerk development-instance keys.");
  }

  process.env.CLERK_PUBLISHABLE_KEY = publishableKey;
  await clerkSetup();
});
