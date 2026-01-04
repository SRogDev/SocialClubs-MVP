# Sistema de Referrals y Guest Authentication - Guía de Transferencia

> Documentación completa para implementar el sistema de referidos y autenticación de invitados en otros proyectos.

---

## 📋 Tabla de Contenidos

1. [Sistema de Referrals](#sistema-de-referrals)
2. [Sistema de Guest/Invitación](#sistema-de-guestinvitación)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Dependencias Necesarias](#dependencias-necesarias)
5. [Implementación Paso a Paso](#implementación-paso-a-paso)

---

## 🔗 Sistema de Referrals

### Descripción General

El sistema de referrals permite a los usuarios compartir un código único de referido a través de una URL. Cuando un nuevo usuario se registra usando ese código, el sistema crea una relación entre el referidor y el referido.

### Arquitectura

```
URL con parámetro ?ref=CODIGO
    ↓
Hook useReferral() captura el código
    ↓
Almacena en sessionStorage
    ↓
Limpia la URL (seguridad)
    ↓
Código disponible para el registro
```

### Componentes del Sistema

#### 1. Hook: `use-referral.ts`

**Propósito**: Capturar y gestionar códigos de referido desde URL parameters.

**Código Completo**:

```typescript
'use client';

import { useState, useEffect } from 'react';

const REFERRAL_STORAGE_KEY = 'referral_code';

interface UseReferralReturn {
    referralCode: string | null;
    clearReferralCode: () => void;
    hasReferralCode: boolean;
}

/**
 * Hook para manejar códigos de referido desde parámetros URL
 * 
 * Captura el parámetro 'ref' de la URL, lo almacena en sessionStorage
 * y limpia la URL para evitar compartir el código por accidente
 */
export function useReferral(): UseReferralReturn {
    const [referralCode, setReferralCode] = useState<string | null>(null);

    useEffect(() => {
        try {
            // Verificar que estamos en el cliente
            if (typeof window === 'undefined') {
                console.warn('[useReferral] Hook called on server-side, skipping');
                return;
            }

            // Capturar código de la URL
            const urlParams = new URLSearchParams(window.location.search);
            const refCode = urlParams.get('ref');

            if (refCode) {
                // Validar que el código no esté vacío
                const trimmedCode = refCode.trim();

                if (trimmedCode) {
                    console.log('[useReferral] Código de referido capturado:', trimmedCode);

                    // Guardar en sessionStorage como backup
                    try {
                        sessionStorage.setItem(REFERRAL_STORAGE_KEY, trimmedCode);
                        setReferralCode(trimmedCode);

                        // Limpiar URL para evitar compartir el código
                        const cleanUrl = window.location.pathname + window.location.hash;
                        window.history.replaceState({}, '', cleanUrl);

                        console.log('[useReferral] Código guardado y URL limpia');
                    } catch (storageError) {
                        console.error('[useReferral] Error al guardar en sessionStorage:', storageError);
                        // Aún así, usar el código aunque no se pueda guardar
                        setReferralCode(trimmedCode);
                    }
                } else {
                    console.warn('[useReferral] Código de referido vacío, ignorando');
                }
            } else {
                // Si no hay código en URL, revisar si hay uno guardado
                try {
                    const storedCode = sessionStorage.getItem(REFERRAL_STORAGE_KEY);

                    if (storedCode) {
                        console.log('[useReferral] Código de referido recuperado del storage:', storedCode);
                        setReferralCode(storedCode);
                    } else {
                        console.log('[useReferral] No se encontró código de referido');
                    }
                } catch (storageError) {
                    console.error('[useReferral] Error al leer sessionStorage:', storageError);
                }
            }
        } catch (error) {
            console.error('[useReferral] Error inesperado:', error);
        }
    }, []);

    /**
     * Limpia el código de referido del estado y sessionStorage
     * Útil después de procesar el registro exitosamente
     */
    const clearReferralCode = () => {
        try {
            sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
            setReferralCode(null);
            console.log('[useReferral] Código de referido limpiado');
        } catch (error) {
            console.error('[useReferral] Error al limpiar código de referido:', error);
            // Limpiar el estado aunque falle el storage
            setReferralCode(null);
        }
    };

    return {
        referralCode,
        clearReferralCode,
        hasReferralCode: referralCode !== null,
    };
}
```

**Características Clave**:

- ✅ Captura automática del parámetro `?ref=CODIGO` de la URL
- ✅ Almacenamiento persistente en `sessionStorage`
- ✅ Limpieza automática de URL (seguridad)
- ✅ Manejo de errores robusto
- ✅ SSR-safe (verifica `typeof window`)

#### 2. Servicio: `get-user-referrer-code.ts`

**Propósito**: Obtener el código de referido único de un usuario para generar links.

**Código Completo**:

```typescript
/**
 * Get user's referrer code
 * Used for generating referral links
 */

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export async function getUserReferrerCode(userId: string): Promise<string | null> {
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
        .from('users')
        .select('referrer_code')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching referrer code:', error);
        return null;
    }

    return data?.referrer_code || null;
}
```

#### 3. Componente UI: `referral-system.tsx`

**Propósito**: Interfaz para mostrar estadísticas de referidos y generar enlaces.

**Código Completo** (parcial, principales características):

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getUserReferrerCode } from '@/services/users/get-user-referrer-code';

const REFERRER_CODE_CACHE_KEY = 'tones_referrer_code_cache';

interface ReferrerCodeCache {
  userId: string;
  referrerCode: string;
  timestamp: number;
}

interface ReferralSystemProps {
  userId: string;
  totalReferrals: number;
  totalEarnings: number;
}

export function ReferralSystem({ userId, totalReferrals, totalEarnings }: ReferralSystemProps) {
  const [copied, setCopied] = useState(false);
  const [referrerCode, setReferrerCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Load referrer code with localStorage cache
  useEffect(() => {
    async function loadReferrerCode() {
      try {
        // Try to get from cache first
        const cached = localStorage.getItem(REFERRER_CODE_CACHE_KEY);

        if (cached) {
          const cacheData: ReferrerCodeCache = JSON.parse(cached);

          // If cached userId matches current userId, use cached code
          if (cacheData.userId === userId) {
            setReferrerCode(cacheData.referrerCode);
            return;
          }
        }

        // If no cache or different user, fetch from database
        const code = await getUserReferrerCode(userId);

        if (code) {
          setReferrerCode(code);

          // Save to cache
          const cacheData: ReferrerCodeCache = {
            userId,
            referrerCode: code,
            timestamp: Date.now(),
          };
          localStorage.setItem(REFERRER_CODE_CACHE_KEY, JSON.stringify(cacheData));
        }
      } catch (error) {
        console.error('Error loading referrer code:', error);
      }
    }

    loadReferrerCode();
  }, [userId]);

  const referralLink = referrerCode 
    ? `https://tones.agency?ref=${referrerCode}` 
    : 'Loading...';

  const copyToClipboard = async () => {
    if (!referrerCode) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Referral link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  // ... UI rendering with stats and copy button
}
```

**Características**:

- ✅ Cache en `localStorage` para rendimiento
- ✅ Copia al portapapeles
- ✅ Muestra estadísticas de referidos
- ✅ Validación de caché por `userId`

---

## 👤 Sistema de Guest/Invitación

### Descripción General

Sistema que permite a usuarios acceder a la plataforma sin registro completo, creando cuentas temporales con datos ficticios para exploración.

### Flujo del Sistema

```
Usuario hace click en "Continue as Guest"
    ↓
1. signInAsGuest() - Crea cuenta temporal
    ↓
2. upsertGuestProfile() - Genera perfil falso
    ↓
3. Redirección a /discover
```

### Componentes del Sistema

#### 1. Servicio: `guestService.ts`

**Propósito**: Lógica core para crear usuarios invitados.

**Código Completo**:

```typescript
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { translateAuthError } from './translate-error';

export interface GuestSignInResponse {
  success: boolean;
  error?: string;
  user?: any;
}

export interface GuestProfileResponse {
  success: boolean;
  error?: string;
}

/**
 * Generates a random guest email
 */
function generateGuestEmail(): string {
  const randomId = Math.random().toString(36).substring(2, 15);
  return `guest_${randomId}@temp.com`;
}

/**
 * Generates a random password
 */
function generateRandomPassword(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Generates fake creative data for guest users
 */
function generateFakeCreativeData() {
  const passions = [
    'Digital Artist specializing in concept art and illustrations',
    'Music Producer creating electronic and ambient soundscapes',
    'Video Editor with expertise in cinematic storytelling',
    'Graphic Designer focused on branding and visual identity',
    'Photographer capturing urban landscapes and street art',
    '3D Artist creating immersive virtual environments',
    'Animator bringing characters to life through motion graphics',
    'Writer crafting compelling narratives and creative content',
  ];

  const locations = [
    'New York, NY',
    'Los Angeles, CA',
    'London, UK',
    'Berlin, Germany',
    'Tokyo, Japan',
    'Sydney, Australia',
    'Toronto, Canada',
    'Amsterdam, Netherlands',
  ];

  const tags = [
    ['digital art', 'illustration', 'concept art'],
    ['music production', 'electronic', 'ambient'],
    ['video editing', 'cinematic', 'storytelling'],
    ['graphic design', 'branding', 'identity'],
    ['photography', 'urban', 'street art'],
    ['3d modeling', 'virtual reality', 'environments'],
    ['animation', 'motion graphics', 'character design'],
    ['creative writing', 'narrative', 'content creation'],
  ];

  const youtubeUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=oHg5SJYRHA0',
    'https://www.youtube.com/watch?v=9bZkp7q19f0',
    'https://www.youtube.com/watch?v=J---aiyznGQ',
    'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  ];

  const randomIndex = Math.floor(Math.random() * passions.length);

  return {
    passion: passions[randomIndex],
    location: locations[randomIndex],
    tags: tags[randomIndex],
    video: youtubeUrls[Math.floor(Math.random() * youtubeUrls.length)],
    bio: `Creative professional passionate about bringing ideas to life through innovative design and artistic expression.`,
  };
}

/**
 * Signs in as a guest user by creating a temporary account
 * @returns Promise with guest sign in result
 */
export async function signInAsGuest(): Promise<GuestSignInResponse> {
  try {
    const email = generateGuestEmail();
    const password = generateRandomPassword();

    console.log('🔄 signInAsGuest: Creating guest account for email:', email);

    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: `Guest_${email.split('_')[1].split('@')[0]}`,
          display_name: `Guest User`,
        },
      },
    });

    if (error) {
      console.error('❌ signInAsGuest: Sign up error:', error);
      return {
        success: false,
        error: translateAuthError(error),
      };
    }

    console.log('✅ signInAsGuest: Guest account created successfully');
    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    console.error('💥 signInAsGuest: Unexpected error during guest sign in:', error);
    return {
      success: false,
      error: 'Error inesperado durante el registro de invitado',
    };
  }
}

/**
 * Creates complete guest profile data
 * @param userId - The user ID to create profile for
 * @returns Promise with guest profile creation result
 */
export async function upsertGuestProfile(userId: string): Promise<GuestProfileResponse> {
  try {
    console.log('🔄 upsertGuestProfile: Creating guest profile for userId:', userId);

    const fakeData = generateFakeCreativeData();
    const supabase = getSupabaseBrowserClient();

    // First, update users table
    const { error: userError } = await supabase.from('users').upsert({
      id: userId,
      profile_completed: true,
      role: 'creative',
      bio: fakeData.bio,
      location: fakeData.location,
    });

    if (userError) {
      console.error('❌ upsertGuestProfile: Error updating users table:', userError);
      return {
        success: false,
        error: 'Error al actualizar datos de usuario',
      };
    }

    // Then, insert creative_data
    const { error: creativeError } = await supabase.from('creative_data').upsert({
      user_id: userId,
      passion: fakeData.passion,
      tags: fakeData.tags,
      video: fakeData.video,
    });

    if (creativeError) {
      console.error('❌ upsertGuestProfile: Error inserting creative_data:', creativeError);
      return {
        success: false,
        error: 'Error al crear datos creativos',
      };
    }

    console.log('✅ upsertGuestProfile: Guest profile created successfully');
    return {
      success: true,
    };
  } catch (error) {
    console.error('💥 upsertGuestProfile: Unexpected error during guest profile creation:', error);
    return {
      success: false,
      error: 'Error inesperado al crear perfil de invitado',
    };
  }
}
```

**Características Clave**:

- ✅ Generación de emails únicos temporales
- ✅ Passwords aleatorios seguros
- ✅ Datos ficticios realistas
- ✅ Manejo de errores completo
- ✅ Logging detallado

#### 2. Componente UI: `guest-button.tsx`

**Propósito**: Botón para iniciar el flujo de guest authentication.

**Código Completo**:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/hooks/use-toast';
import { signInAsGuest, upsertGuestProfile } from '@/services/auth';
import { analytics } from '@/lib/analytics';
import * as Sentry from '@sentry/nextjs';

interface GuestButtonProps {
  mode?: 'login' | 'register';
  disabled?: boolean;
  className?: string;
}

export function GuestButton({
  mode = 'login',
  disabled = false,
  className = '',
}: GuestButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleGuestAuth = async () => {
    setIsGuestLoading(true);
    try {
      console.log('🔄 GuestButton: Starting guest authentication');

      // Step 1: Create guest account
      const signInResult = await signInAsGuest();

      if (!signInResult.success) {
        console.error('❌ GuestButton: Guest sign in failed:', signInResult.error);
        toast({
          title: 'Guest access failed',
          description: signInResult.error || 'Unable to create guest account.',
          variant: 'destructive',
        });
        Sentry.captureException(new Error(signInResult.error), {
          tags: {
            section: 'auth',
            action: 'guest_signin_failed',
          },
        });
        return;
      }

      const user = signInResult.user;
      if (!user?.id) {
        console.error('❌ GuestButton: No user ID returned from sign in');
        toast({
          title: 'Guest access failed',
          description: 'Invalid user data received.',
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ GuestButton: Guest account created, user ID:', user.id);

      // Step 2: Create guest profile
      const profileResult = await upsertGuestProfile(user.id);

      if (!profileResult.success) {
        console.error('❌ GuestButton: Guest profile creation failed:', profileResult.error);
        toast({
          title: 'Guest profile creation failed',
          description: profileResult.error || 'Unable to create guest profile.',
          variant: 'destructive',
        });
        Sentry.captureException(new Error(profileResult.error), {
          tags: {
            section: 'auth',
            action: 'guest_profile_failed',
          },
          extra: {
            userId: user.id,
          },
        });
        return;
      }

      console.log('✅ GuestButton: Guest profile created successfully');

      // Track guest login event
      analytics.userLogin(user.id, user.email);
      analytics.identify(user.id, {
        email: user.email,
        role: 'guest',
      });

      // Initialize OneSignal with user ID
      if (typeof window !== 'undefined' && window.OneSignal) {
        try {
          await window.OneSignal.login(user.id);
          console.log('OneSignal user logged in:', user.id);
        } catch (error) {
          console.error('OneSignal login error:', error);
          // Don't block login if OneSignal fails
        }
      }

      toast({
        title: 'Welcome as guest!',
        description: 'You have successfully accessed as a guest user.',
      });

      // Redirect to home
      router.push('/discover');
    } catch (error) {
      console.error('💥 GuestButton: Unexpected error during guest authentication:', error);
      toast({
        title: 'Guest access failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
      Sentry.captureException(error, {
        tags: {
          section: 'auth',
          action: 'guest_auth_unexpected_error',
        },
      });
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <Button
      type='button'
      variant='outline'
      onClick={handleGuestAuth}
      disabled={disabled || isGuestLoading}
      className={`w-full ${className}`}
    >
      {isGuestLoading ? (
        <LoadingButton />
      ) : (
        <>
          <User className='mr-2 h-4 w-4' />
          Continue as Guest
        </>
      )}
    </Button>
  );
}
```

**Características**:

- ✅ Estados de carga
- ✅ Manejo de errores con toast
- ✅ Integración con analytics
- ✅ Integración con Sentry
- ✅ Integración con OneSignal
- ✅ Redirección automática

---

## 🗄️ Estructura de Base de Datos

### Tabla: `users`

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  username text,
  avatar text,
  profile_completed boolean DEFAULT false,
  role text DEFAULT 'creative'::text 
    CHECK (role = ANY (ARRAY['organiser'::text, 'creative'::text, 'admin'::text])),
  referrer_code text UNIQUE, -- Código único de referido
  bio text,
  location text
);

-- Índice único para referrer_code
ALTER TABLE public.users 
  ADD CONSTRAINT users_referrer_code_key UNIQUE (referrer_code);
```

### Tabla: `referrals`

```sql
CREATE TABLE IF NOT EXISTS public.referrals (
  id bigint NOT NULL PRIMARY KEY DEFAULT nextval('public.referrals_id_seq'::regclass),
  referrer_id uuid REFERENCES public.users(id), -- Usuario que refiere
  referred_id uuid REFERENCES public.users(id) UNIQUE, -- Usuario referido
  status text DEFAULT 'pending'::text, -- Estado: pending, completed, expired
  created_at timestamptz DEFAULT now(),
  reward_amount integer -- Monto de recompensa en centavos
);

-- Foreign keys
ALTER TABLE public.referrals 
  ADD CONSTRAINT referrals_referrer_id_fkey 
  FOREIGN KEY (referrer_id) REFERENCES public.users(id);

ALTER TABLE public.referrals 
  ADD CONSTRAINT referrals_referred_id_fkey 
  FOREIGN KEY (referred_id) REFERENCES public.users(id);

-- Constraint único: cada usuario solo puede ser referido una vez
ALTER TABLE public.referrals 
  ADD CONSTRAINT referrals_referred_id_key UNIQUE (referred_id);
```

### Tabla: `creative_data` (para guests)

```sql
CREATE TABLE IF NOT EXISTS public.creative_data (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES public.users(id),
  video text,
  created_at timestamptz DEFAULT now(),
  tags jsonb,
  passion text,
  portfolio text
);

ALTER TABLE public.creative_data 
  ADD CONSTRAINT creative_data_user_id_key UNIQUE (user_id);
```

---

## 📦 Dependencias Necesarias

### NPM Packages

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x.x",
    "react": "^18.x.x",
    "next": "^14.x.x",
    "lucide-react": "^0.x.x",
    "js-cookie": "^3.x.x"
  },
  "devDependencies": {
    "@types/js-cookie": "^3.x.x",
    "typescript": "^5.x.x"
  }
}
```

### Instalación

```bash
npm install @supabase/supabase-js lucide-react js-cookie
npm install -D @types/js-cookie
```

---

## 🚀 Implementación Paso a Paso

### Paso 1: Configurar Base de Datos

1. **Crear tablas en Supabase**:

```sql
-- 1. Asegurar que la tabla users tiene referrer_code
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referrer_code text UNIQUE;

-- 2. Crear tabla de referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  referrer_id uuid REFERENCES public.users(id),
  referred_id uuid REFERENCES public.users(id) UNIQUE,
  status text DEFAULT 'pending'::text,
  created_at timestamptz DEFAULT now(),
  reward_amount integer
);

-- 3. Crear tabla creative_data si no existe
CREATE TABLE IF NOT EXISTS public.creative_data (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES public.users(id),
  video text,
  created_at timestamptz DEFAULT now(),
  tags jsonb,
  passion text,
  portfolio text
);
```

1. **Generar códigos de referido únicos**:

Opción A: Usar una función de base de datos para auto-generar:

```sql
-- Función para generar códigos aleatorios
CREATE OR REPLACE FUNCTION generate_referrer_code()
RETURNS text AS $$
BEGIN
  RETURN upper(substring(md5(random()::text) from 1 for 8));
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-generar al crear usuario
CREATE OR REPLACE FUNCTION set_referrer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referrer_code IS NULL THEN
    NEW.referrer_code := generate_referrer_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_referrer_code_trigger
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION set_referrer_code();
```

Opción B: Generar desde la aplicación durante el registro.

### Paso 2: Configurar Supabase Client

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Paso 3: Implementar Hook de Referrals

1. Crear archivo `hooks/use-referral.ts` con el código proporcionado arriba.

2. Exportarlo en `hooks/index.ts`:

```typescript
export { useReferral } from './use-referral';
```

### Paso 4: Implementar Servicio de Guest

1. Crear carpeta `services/auth/`

2. Crear `services/auth/guestService.ts` con el código completo.

3. Crear `services/auth/translate-error.ts`:

```typescript
import { AuthError } from '@supabase/supabase-js';

export function translateAuthError(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Credenciales inválidas';
    case 'User already registered':
      return 'Este email ya está registrado';
    case 'Email not confirmed':
      return 'Por favor confirma tu email';
    default:
      return error.message;
  }
}
```

1. Exportar en `services/auth/index.ts`:

```typescript
export { signInAsGuest, upsertGuestProfile } from './guestService';
export type { GuestSignInResponse, GuestProfileResponse } from './guestService';
```

### Paso 5: Crear Componentes UI

1. **GuestButton**: Usar el código completo proporcionado.

2. **ReferralSystem**: Usar el código completo proporcionado.

### Paso 6: Integrar en Formularios de Auth

En tu componente de registro:

```tsx
'use client';

import { useReferral } from '@/hooks/use-referral';
import { GuestButton } from '@/components/auth/guest-button';

export function RegisterForm() {
  const { referralCode, clearReferralCode } = useReferral();

  const handleSubmit = async (data) => {
    // Tu lógica de registro
    const result = await signUp({
      email: data.email,
      password: data.password,
      username: data.username,
    });

    if (result.success && referralCode) {
      // Crear relación de referral
      await createReferral({
        referrerCode: referralCode,
        referredUserId: result.user.id,
      });

      clearReferralCode();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos del formulario */}
      
      {referralCode && (
        <p className="text-sm text-green-600">
          ✓ Referido por: {referralCode}
        </p>
      )}

      <Button type="submit">Sign Up</Button>
      
      <div className="divider">Or</div>
      
      <GuestButton mode="register" />
    </form>
  );
}
```

### Paso 7: Crear Server Action para Referrals

```typescript
// app/actions/referrals.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';

export async function createReferral({
  referrerCode,
  referredUserId,
}: {
  referrerCode: string;
  referredUserId: string;
}) {
  const supabase = await createServerClient();

  // 1. Buscar el referrer por su código
  const { data: referrer, error: referrerError } = await supabase
    .from('users')
    .select('id')
    .eq('referrer_code', referrerCode)
    .single();

  if (referrerError || !referrer) {
    console.error('Referrer not found:', referrerError);
    return { success: false, error: 'Referrer not found' };
  }

  // 2. Crear la relación de referral
  const { error: insertError } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrer.id,
      referred_id: referredUserId,
      status: 'pending',
      reward_amount: 0, // Inicialmente 0, se actualiza cuando haya transacciones
    });

  if (insertError) {
    console.error('Error creating referral:', insertError);
    return { success: false, error: insertError.message };
  }

  return { success: true };
}

export async function getUserReferralStats(userId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId);

  if (error) {
    console.error('Error fetching referral stats:', error);
    return { totalReferrals: 0, totalEarnings: 0 };
  }

  const totalReferrals = data.length;
  const totalEarnings = data.reduce((sum, ref) => sum + (ref.reward_amount || 0), 0) / 100;

  return { totalReferrals, totalEarnings };
}
```

### Paso 8: Mostrar Sistema de Referrals

En tu página de perfil o earnings:

```tsx
import { getUserReferralStats } from '@/app/actions/referrals';
import { ReferralSystem } from '@/components/referral-system';

export default async function EarningsPage({ params }) {
  const userId = params.id;
  const { totalReferrals, totalEarnings } = await getUserReferralStats(userId);

  return (
    <div>
      <h1>Your Earnings</h1>
      
      <ReferralSystem
        userId={userId}
        totalReferrals={totalReferrals}
        totalEarnings={totalEarnings}
      />
    </div>
  );
}
```

---

## 🔐 Seguridad y Mejores Prácticas

### Referrals

1. **Validación de códigos**:

```typescript
// Validar que el código existe y está activo
const isValidCode = await validateReferrerCode(code);
```

1. **Prevenir auto-referidos**:

```sql
-- Constraint en base de datos
ALTER TABLE public.referrals 
  ADD CONSTRAINT no_self_referral 
  CHECK (referrer_id != referred_id);
```

1. **Límite de usos por código**:

```typescript
// Opcional: limitar número de referidos por usuario
const referralCount = await getReferralCount(referrerId);
if (referralCount >= MAX_REFERRALS) {
  throw new Error('Referral limit reached');
}
```

### Guest Users

1. **Limpiar guests antiguos**:

```sql
-- Función para eliminar guests después de 30 días
CREATE OR REPLACE FUNCTION cleanup_old_guests()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users
  WHERE email LIKE 'guest_%@temp.com'
  AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

1. **Marcar usuarios como guests**:

```typescript
// Agregar campo en users table
ALTER TABLE public.users ADD COLUMN is_guest boolean DEFAULT false;

// Actualizar durante creación
await supabase.from('users').upsert({
  id: userId,
  is_guest: true,
  // ... otros campos
});
```

1. **Limitar acciones de guests**:

```typescript
// Middleware o server action
if (user.is_guest) {
  throw new Error('Guest users cannot perform this action');
}
```

---

## 🧪 Testing

### Test para useReferral Hook

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReferral } from '@/hooks/use-referral';

describe('useReferral', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    sessionStorage.clear();
  });

  it('should capture referral code from URL', async () => {
    window.history.replaceState({}, '', '/?ref=ABC123');

    const { result } = renderHook(() => useReferral());

    await waitFor(() => {
      expect(result.current.referralCode).toBe('ABC123');
      expect(result.current.hasReferralCode).toBe(true);
    });
  });

  it('should clean URL after capturing code', async () => {
    window.history.replaceState({}, '', '/?ref=ABC123');

    renderHook(() => useReferral());

    await waitFor(() => {
      expect(window.location.search).toBe('');
    });
  });

  it('should persist code in sessionStorage', async () => {
    window.history.replaceState({}, '', '/?ref=ABC123');

    renderHook(() => useReferral());

    await waitFor(() => {
      expect(sessionStorage.getItem('referral_code')).toBe('ABC123');
    });
  });
});
```

### Test para Guest Service

```typescript
import { signInAsGuest, upsertGuestProfile } from '@/services/auth/guestService';

describe('Guest Service', () => {
  it('should create guest account with unique email', async () => {
    const result = await signInAsGuest();

    expect(result.success).toBe(true);
    expect(result.user?.email).toMatch(/^guest_.*@temp\.com$/);
  });

  it('should create guest profile with fake data', async () => {
    const mockUserId = 'test-user-id';

    const result = await upsertGuestProfile(mockUserId);

    expect(result.success).toBe(true);
  });
});
```

---

## 📊 Métricas y Analytics

### Eventos a trackear

1. **Referrals**:
   - `referral_link_copied` - Usuario copia su link
   - `referral_link_clicked` - Alguien hace click en un link
   - `referral_signup_completed` - Referido completa registro
   - `referral_reward_earned` - Referrer recibe recompensa

2. **Guest**:
   - `guest_signin_started` - Usuario inicia guest flow
   - `guest_signin_completed` - Guest exitosamente creado
   - `guest_converted_to_full` - Guest se convierte a usuario completo

### Implementación con Analytics

```typescript
import { analytics } from '@/lib/analytics';

// En ReferralSystem
const copyToClipboard = async () => {
  await navigator.clipboard.writeText(referralLink);
  
  analytics.track('referral_link_copied', {
    userId: userId,
    referralCode: referrerCode,
  });
};

// En GuestButton
const handleGuestAuth = async () => {
  analytics.track('guest_signin_started');
  
  const result = await signInAsGuest();
  
  if (result.success) {
    analytics.track('guest_signin_completed', {
      guestId: result.user.id,
    });
  }
};
```

---

## 🎯 Conclusión

Este sistema proporciona:

✅ **Sistema de Referrals completo** con:

- Captura automática de códigos desde URL
- Persistencia en sessionStorage
- Limpieza de URL por seguridad
- Generación de links compartibles
- UI con estadísticas

✅ **Sistema de Guest Authentication** con:

- Creación de cuentas temporales
- Generación de datos ficticios
- Integración con analytics
- Manejo robusto de errores

### Próximos Pasos Recomendados

1. Implementar recompensas automáticas para referrers
2. Agregar notificaciones cuando alguien usa tu código
3. Dashboard de referidos con detalles
4. Sistema de conversión de guest a usuario full
5. Rate limiting para prevenir abuso de guests

---

## 📚 Referencias

- Supabase Auth: <https://supabase.com/docs/guides/auth>
- Next.js App Router: <https://nextjs.org/docs/app>
- sessionStorage API: <https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage>

---

**Última actualización**: Diciembre 2025
**Versión**: 1.0.0
