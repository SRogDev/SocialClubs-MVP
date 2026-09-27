'use client';

import { ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

import { ConnectButton } from './ConnectButton';

interface ConnectDashboardButtonProps {
    hasAccount: boolean;
    isActive: boolean;
    showSuccess?: boolean;
}

/**
 * ConnectDashboardButton Component (Client)
 * 
 * Wrapper del ConnectButton con manejo de estado de onboarding exitoso.
 * Muestra mensaje de éxito temporal cuando el usuario completa onboarding.
 */
export function ConnectDashboardButton({
    hasAccount,
    isActive,
    showSuccess,
}: ConnectDashboardButtonProps) {
    const { toast } = useToast();

    // Mostrar toast de éxito si viene desde onboarding
    if (showSuccess) {
        toast({
            title: '✅ Cuenta conectada',
            description: 'Tu cuenta de Stripe se configuró exitosamente',
        });
    }

    return <ConnectButton hasAccount={hasAccount} isActive={isActive} />;
}
