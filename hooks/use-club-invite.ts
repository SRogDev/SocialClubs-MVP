'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Hook para capturar y gestionar el código de invitación a un club desde la URL
 * Basado en el patrón de useReferral de transference.md
 *
 * Flujo:
 * 1. Captura parámetro ?invite=CLUB_LINK de la URL
 * 2. Almacena en sessionStorage con key 'club_invite_code'
 * 3. Limpia la URL para evitar compartir accidentalmente
 * 4. Provee el código para usarlo en sign-up/login
 */
export function useClubInvite() {
    const searchParams = useSearchParams();
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [hasInviteCode, setHasInviteCode] = useState(false);

    useEffect(() => {
        // Solo ejecutar en cliente
        if (typeof window === 'undefined') return;

        // Intentar obtener de sessionStorage primero
        const storedCode = sessionStorage.getItem('club_invite_code');
        if (storedCode) {
            setInviteCode(storedCode);
            setHasInviteCode(true);
            return;
        }

        // Capturar de URL si existe
        const codeFromUrl = searchParams?.get('invite');
        if (codeFromUrl) {
            // Guardar en sessionStorage
            sessionStorage.setItem('club_invite_code', codeFromUrl);
            setInviteCode(codeFromUrl);
            setHasInviteCode(true);

            // Limpiar URL (seguridad - evitar compartir links con códigos)
            const url = new URL(window.location.href);
            url.searchParams.delete('invite');
            window.history.replaceState({}, '', url.toString());
        }
    }, [searchParams]);

    /**
     * Limpia el código de invitación del estado y sessionStorage
     * Útil después de procesar la invitación exitosamente
     */
    const clearInviteCode = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('club_invite_code');
        }
        setInviteCode(null);
        setHasInviteCode(false);
    };

    /**
     * Obtiene el código actual de invitación
     * Intenta primero desde estado, luego desde sessionStorage
     */
    const getInviteCode = (): string | null => {
        if (inviteCode) return inviteCode;
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('club_invite_code');
        }
        return null;
    };

    return {
        inviteCode: getInviteCode(),
        hasInviteCode,
        clearInviteCode,
    };
}