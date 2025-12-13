/**
 * Ejemplo de test unitario siguiendo el patrón Given-When-Then
 * y testeando comportamiento sobre implementación
 */

describe('Example Unit Test', () => {
    it('should serve as a template for writing tests', () => {
        // GIVEN: Un valor inicial
        const initialValue = 5;

        // WHEN: Se realiza una operación
        const result = initialValue * 2;

        // THEN: El resultado es el esperado
        expect(result).toBe(10);
    });
});

/**
 * Para ejecutar este test:
 * pnpm test
 * 
 * Este es solo un ejemplo. Elimínalo cuando agregues tus propios tests.
 */
