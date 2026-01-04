'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DailyIframe from '@daily-co/daily-js';
import { X, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { vibrate } from '@/utils/pwa';

interface DailyVideoContainerProps {
    roomUrl: string;
    roomId: number;
    userId: string;
    userName: string;
}

export function DailyVideoContainer({ roomUrl, roomId, userId, userName }: DailyVideoContainerProps) {
    const router = useRouter();
    const callFrameRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        // Create Daily.co call frame
        const callFrame = DailyIframe.createFrame(containerRef.current, {
            iframeStyle: {
                width: '100%',
                height: '100%',
                border: 'none',
            },
            showLeaveButton: false, // We'll use custom button
            showFullscreenButton: true,
        });

        callFrameRef.current = callFrame;

        // Event listeners
        callFrame
            .on('loaded', () => {
                console.log('[Daily] Frame loaded');
                setIsLoading(false);
            })
            .on('joined-meeting', (event: any) => {
                console.log('[Daily] Joined meeting', event);
                vibrate([10, 50, 10]);
            })
            .on('left-meeting', () => {
                console.log('[Daily] Left meeting');
                handleLeaveCall();
            })
            .on('error', (event: any) => {
                console.error('[Daily] Error:', event);
                setError('Error en la videollamada');
            })
            .on('participant-joined', (event: any) => {
                console.log('[Daily] Participant joined:', event);
            })
            .on('participant-left', (event: any) => {
                console.log('[Daily] Participant left:', event);
            });

        // Join the room
        callFrame
            .join({
                url: roomUrl,
                userName: userName,
            })
            .catch((err: any) => {
                console.error('[Daily] Error joining:', err);
                setError('No se pudo unir a la videollamada');
                setIsLoading(false);
            });

        // Cleanup
        return () => {
            if (callFrameRef.current) {
                callFrameRef.current.destroy();
            }
        };
    }, [roomUrl, userName]);

    const handleLeaveCall = async () => {
        vibrate([10, 50, 10]);

        if (callFrameRef.current) {
            await callFrameRef.current.leave();
            callFrameRef.current.destroy();
        }

        // Navigate back to home or club
        router.push('/');
    };

    const toggleMic = () => {
        if (!callFrameRef.current) return;

        callFrameRef.current.setLocalAudio(!isMicOn);
        setIsMicOn(!isMicOn);
        vibrate(10);
    };

    const toggleCamera = () => {
        if (!callFrameRef.current) return;

        callFrameRef.current.setLocalVideo(!isCameraOn);
        setIsCameraOn(!isCameraOn);
        vibrate(10);
    };

    const toggleScreenShare = async () => {
        if (!callFrameRef.current) return;

        try {
            if (isScreenSharing) {
                await callFrameRef.current.stopScreenShare();
                setIsScreenSharing(false);
            } else {
                await callFrameRef.current.startScreenShare();
                setIsScreenSharing(true);
            }
            vibrate(10);
        } catch (err) {
            console.error('[Daily] Error toggling screen share:', err);
        }
    };

    if (error) {
        return (
            <div className="flex h-full items-center justify-center bg-black">
                <div className="text-center text-white">
                    <h2 className="text-2xl font-bold mb-4">Error</h2>
                    <p>{error}</p>
                    <Button onClick={handleLeaveCall} className="mt-4" variant="outline">
                        Volver
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full bg-black">
            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90">
                    <div className="text-center text-white">
                        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                        <p className="text-lg">Conectando a videollamada...</p>
                    </div>
                </div>
            )}

            {/* Daily.co iframe container */}
            <div ref={containerRef} className="h-full w-full" />

            {/* Custom controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center justify-center gap-4">
                    {/* Microphone toggle */}
                    <Button
                        onClick={toggleMic}
                        size="icon"
                        variant={isMicOn ? 'default' : 'destructive'}
                        className="h-12 w-12 rounded-full"
                        title={isMicOn ? 'Silenciar micrófono' : 'Activar micrófono'}
                    >
                        {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                    </Button>

                    {/* Camera toggle */}
                    <Button
                        onClick={toggleCamera}
                        size="icon"
                        variant={isCameraOn ? 'default' : 'destructive'}
                        className="h-12 w-12 rounded-full"
                        title={isCameraOn ? 'Apagar cámara' : 'Encender cámara'}
                    >
                        {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                    </Button>

                    {/* Screen share toggle */}
                    <Button
                        onClick={toggleScreenShare}
                        size="icon"
                        variant={isScreenSharing ? 'secondary' : 'default'}
                        className="h-12 w-12 rounded-full"
                        title={isScreenSharing ? 'Detener compartir pantalla' : 'Compartir pantalla'}
                    >
                        {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
                    </Button>

                    {/* Leave call button */}
                    <Button
                        onClick={handleLeaveCall}
                        size="icon"
                        variant="destructive"
                        className="h-12 w-12 rounded-full"
                        title="Salir de la videollamada"
                    >
                        <Phone className="h-6 w-6 rotate-135" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
