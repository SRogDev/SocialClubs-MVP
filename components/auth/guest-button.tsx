'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { signInAsGuest } from '@/app/actions/guestActions';
import { Button } from '@/components/ui/button';


export function GuestButton() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleGuestSignIn = async () => {
        setIsLoading(true);

        try {
            const result = await signInAsGuest();

            if (result.success) {
                // Verificar si hay un invite code pendiente
                const inviteCode = typeof window !== 'undefined'
                    ? sessionStorage.getItem('club_invite_code')
                    : null;

                if (inviteCode) {
                    // Redirigir a la página de join con el código
                    router.push(`/clubs/join/${inviteCode}`);
                } else {
                    // Redirigir a explore
                    router.push('/explore');
                }
            } else {
                // Error
                alert(result.error || 'Failed to create guest account');
            }
        } catch (error) {
            console.error('Error in guest sign in:', error);
            alert('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGuestSignIn}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating guest account...
                </>
            ) : (
                'Continue as Guest'
            )}
        </Button>
    );
}