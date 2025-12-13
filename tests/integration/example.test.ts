/**
 * Ejemplo de test de integración siguiendo el patrón Given-When-Then
 * Testea la interacción entre múltiples componentes
 */

describe('Example Integration Test', () => {
    it('should demonstrate integration testing patterns', () => {
        // GIVEN: Múltiples componentes configurados
        const component1 = { value: 5 };
        const component2 = { multiplier: 2 };

        // WHEN: Los componentes interactúan
        const result = component1.value * component2.multiplier;

        // THEN: La integración produce el resultado esperado
        expect(result).toBe(10);
    });
});

/**
 * Para ejecutar este test:
 * pnpm test
 * 
 * Este es solo un ejemplo. Elimínalo cuando agregues tus propios tests.
 */
