// Smoke test to verify the application loads correctly
const { test, expect } = require('@playwright/test');

test.describe('Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if the main elements are present
    await expect(page.locator('h1')).toContainText('DB Schema Designer');
    await expect(page.locator('#diagram')).toBeVisible();
    await expect(page.locator('#sidebar')).toBeVisible();

    // Check if the form elements are present
    await expect(page.locator('#nt-name')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Add Table');
  });

  test('should have working JavaScript', async ({ page }) => {
    await page.goto('/');

    // Check if the UI functions are available
    const uiAvailable = await page.evaluate(() => {
      return typeof window.UI !== 'undefined' &&
             typeof window.Diagram !== 'undefined';
    });

    expect(uiAvailable).toBe(true);
  });
});
