/**
 * Helpers y utilidades compartidas para tests E2E
 */

import type { Page } from '@playwright/test';

/**
 * Espera a que la navegación se complete
 */
export async function waitForNavigation(page: Page): Promise<void> {
    await page.waitForLoadState('networkidle');
}

/**
 * Login helper para tests E2E
 */
export async function login(
    page: Page,
    email: string = 'test@example.com',
    password: string = 'TestPassword123!'
): Promise<void> {
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /login/i }).click();
    await waitForNavigation(page);
}

/**
 * Logout helper para tests E2E
 */
export async function logout(page: Page): Promise<void> {
    await page.getByRole('button', { name: /logout/i }).click();
    await waitForNavigation(page);
}

/**
 * Toma un screenshot con un nombre descriptivo
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
    await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Verifica que un elemento esté visible con retry
 */
export async function expectVisible(page: Page, selector: string): Promise<void> {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });
}
