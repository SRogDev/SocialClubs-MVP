# Tests

Esta carpeta contiene todos los tests del proyecto organizados por tipo.

## 📁 Estructura

```
tests/
├── unit/              # Tests unitarios (funciones, utilidades, componentes aislados)
├── integration/       # Tests de integración (flujos multi-componente)
├── e2e/              # Tests end-to-end (Playwright)
└── __mocks__/        # Mocks compartidos
```

## 🧪 Principios de Testing

### Test-Driven Development (TDD)

Seguimos el ciclo **Red-Green-Refactor**:

1. **Red**: Escribir un test que falla
2. **Green**: Escribir el código mínimo para que pase
3. **Refactor**: Mejorar el código manteniendo los tests en verde

### Patrón Given-When-Then

Todos los tests siguen esta estructura:

```typescript
describe('Feature', () => {
  it('should do something when condition is met', () => {
    // GIVEN: Estado inicial y precondiciones
    const initialState = setupTest();
    
    // WHEN: Acción que se ejecuta
    const result = performAction(initialState);
    
    // THEN: Verificación del resultado esperado
    expect(result).toBe(expectedValue);
  });
});
```

### Testear Comportamiento, NO Implementación

❌ **Mal** (testa implementación):

```typescript
it('should call useState hook', () => {
  const { result } = renderHook(() => useCounter());
  expect(useState).toHaveBeenCalled(); // ❌
});
```

✅ **Bien** (testa comportamiento):

```typescript
it('should increment counter when button is clicked', () => {
  render(<Counter />);
  fireEvent.click(screen.getByRole('button', { name: /increment/i }));
  expect(screen.getByText(/count: 1/i)).toBeInTheDocument(); // ✅
});
```

## 🚀 Comandos

```bash
# Tests unitarios e integración
pnpm test                # Todos
pnpm test:watch          # Modo watch
pnpm test:coverage       # Con cobertura

# Tests E2E
pnpm test:e2e            # Headless
pnpm test:e2e:ui         # Con interfaz
pnpm test:e2e:debug      # Modo debug
```

## 📝 Nomenclatura

- **Archivos**: `*.test.ts` o `*.test.tsx`
- **Describe blocks**: Nombre del componente/función
- **It blocks**: "should [comportamiento esperado] when [condición]"

Ejemplo:

```typescript
describe('LoginForm', () => {
  it('should show error when email is invalid', () => {
    // ...
  });
  
  it('should submit successfully when credentials are valid', () => {
    // ...
  });
});
```
