import { test, expect } from '@playwright/test';

/**
 * Ejemplo de test E2E siguiendo el patrón Given-When-Then
 * Testea el flujo completo del usuario en la aplicación
 */

test.describe('Example E2E Test', () => {
    test('should navigate to home page successfully', async ({ page }) => {
        // GIVEN: El usuario está en la página de inicio
        await page.goto('/');

        // WHEN: La página carga completamente
        await page.waitForLoadState('networkidle');

        // THEN: El título de la página es visible
        await expect(page).toHaveTitle(/SocialClubs/);
    });

    test('should have accessible navigation', async ({ page }) => {
        // GIVEN: El usuario está en la página de inicio
        await page.goto('/');

        // WHEN: El usuario busca el botón de navegación
        const nav = page.getByRole('navigation');

        // THEN: La navegación es accesible y visible
        await expect(nav).toBeVisible();
    });
});

/**
 * Para ejecutar estos tests:
 * 
 * pnpm test:e2e              # Headless
 * pnpm test:e2e:ui           # Con interfaz visual
 * pnpm test:e2e:debug        # Modo debug
 * 
 * Este es solo un ejemplo. Elimínalo cuando agregues tus propios tests.
 */
