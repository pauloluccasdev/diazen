import { expect, type Page } from "@playwright/test";
export async function openManualMealRecorder(page: Page) {
  const recorder = page.locator(".manual-meal-recorder");
  await expect(recorder).toBeAttached();
  if ((await recorder.getAttribute("open")) === null) {
    const action = page.locator(".food-desktop-add");
    if ((await page.evaluate(() => innerWidth)) >= 1024) {
      await expect(action).toBeVisible();
      await action.click();
    } else await recorder.locator(":scope > summary").click();
  }
  await expect(recorder).toHaveAttribute("open", "");
  return recorder;
}
