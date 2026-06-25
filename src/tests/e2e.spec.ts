import { test, expect } from '@playwright/test';

test('homepage loads and shows LocalMind', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=LocalMind').first()).toBeVisible();
});

test('can type in the chat input', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('textarea');
  await input.fill('Hello world');
  await expect(input).toHaveValue('Hello world');
});
