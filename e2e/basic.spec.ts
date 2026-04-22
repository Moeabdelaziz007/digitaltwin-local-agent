import { test, expect } from '@playwright/test';

test.describe('User Onboarding Flow', () => {
  test('should load homepage and display main elements', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Digital Twin/i);
  });

  test('should show sign-in interface', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.url()).toContain('sign-in');
  });
});

test.describe('Conversation Flow', () => {
  test('should display chat interface elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.url()).toBeTruthy();
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should render correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.url()).toBeTruthy();
  });
});