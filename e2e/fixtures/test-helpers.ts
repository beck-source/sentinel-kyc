import { Page, expect } from '@playwright/test';

/**
 * Shared test helpers for E2E tests.
 * Add common utilities here that can be reused across sprint tests.
 */

/**
 * Wait for the app to be fully loaded.
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for the main app container to be visible
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to a specific page and wait for it to load.
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForAppReady(page);
}

/**
 * Clear all data by hitting a reset endpoint (if available).
 */
export async function resetTestData(page: Page): Promise<void> {
  // Implement if your API has a reset endpoint for testing
  // await page.request.post('http://localhost:8000/api/test/reset');
}

/**
 * Verify an API response directly.
 */
export async function verifyApiResponse(
  page: Page,
  endpoint: string,
  expectedStatus: number = 200
): Promise<unknown> {
  const response = await page.request.get(`http://localhost:8000${endpoint}`);
  expect(response.status()).toBe(expectedStatus);
  return response.json();
}

/**
 * Wait for a toast notification to appear.
 */
export async function waitForToast(page: Page, text: string): Promise<void> {
  await expect(page.locator(`text=${text}`)).toBeVisible({ timeout: 5000 });
}

/**
 * Take a screenshot with a descriptive name.
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `./screenshots/${name}.png`, fullPage: true });
}
