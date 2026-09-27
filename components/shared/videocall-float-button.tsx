'use client';

import { Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRoomStore } from '@/stores/roomStore';
import { vibrate } from '@/utils/pwa';

/**
 * VideocallFloatingButton
 * Floating action button that appears when there's an active videocall room
 * Shows in bottom-right corner with orange background
 * Redirects to /videocall/[roomId] when clicked
 */
export function VideocallFloatingButton() {
    const router = useRouter();
    const { theme } = useTheme();
    const { activeRoom, subscribeToRooms, unsubscribeFromRooms, hasActiveRoom } = useRoomStore();

    useEffect(() => {
        // Subscribe to rooms when component mounts
        const setupRealtime = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                await subscribeToRooms(user.id);
            }
        };

        setupRealtime();

        // Cleanup on unmount
        return () => {
            unsubscribeFromRooms();
        };
    }, [subscribeToRooms, unsubscribeFromRooms]);

    // Don't render if no active room
    if (!hasActiveRoom() || !activeRoom) {
        return null;
    }

    const handleJoinCall = () => {
        // Haptic feedback
        vibrate([10, 50, 10]);

        // Navigate to videocall page
        router.push(`/videocall/${activeRoom.id}`);
    };

    // Icon color adapts to theme
    const iconColor = theme === 'dark' ? 'text-white' : 'text-black';

    return (
        <Button
            onClick={handleJoinCall}
            className={`fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full bg-orange-500 shadow-lg transition-all hover:bg-orange-600 hover:scale-110 active:scale-95 ${iconColor}`}
            size="icon"
            aria-label="Unirse a videollamada"
            title="Tienes una videollamada activa"
        >
            <Video className="h-6 w-6" />
            {/* Pulse animation */}
            <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping"></span>
        </Button>
    );
}
