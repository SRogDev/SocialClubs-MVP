'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ConnectButtonProps {
    hasAccount: boolean;
    isActive: boolean;
}

/**
 * ConnectButton Component
 * 
 * Botón inteligente que redirige al creator a:
 * - Onboarding de Stripe Connect (si no tiene cuenta)
 * - Express Dashboard de Stripe (si tiene cuenta activa)
 */
export function ConnectButton({ hasAccount, isActive }: ConnectButtonProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleConnect = async () => {
        setLoading(true);
        try {
            let response;

            if (!hasAccount || !isActive) {
                // Crear onboarding
                response = await fetch('/api/stripe/connect/onboarding', {
                    method: 'POST',
                });
            } else {
                // Abrir dashboard
                response = await fetch('/api/stripe/connect/dashboard');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error desconocido');
            }

            // Redirigir a Stripe
            window.location.href = data.url;
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'No se pudo conectar con Stripe',
                variant: 'destructive',
            });
            setLoading(false);
        }
    };

    const getButtonText = () => {
        if (!hasAccount) return 'Conectar con Stripe';
        if (!isActive) return 'Completar configuración';
        return 'Abrir Dashboard Stripe';
    };

    const getButtonVariant = () => {
        if (!hasAccount || !isActive) return 'default';
        return 'outline';
    };

    return (
        <Button
            onClick={handleConnect}
            disabled={loading}
            variant={getButtonVariant()}
            className="w-full sm:w-auto"
        >
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                </>
            ) : (
                <>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {getButtonText()}
                </>
            )}
        </Button>
    );
}
