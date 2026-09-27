'use client';

import { Cookie } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';

const COOKIE_ACCEPTED_KEY = 'cookiesAccepted';
const AUTO_DISMISS_TIME = 10000; // 10 seconds

export function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Check if user has already accepted cookies
        const hasAccepted = localStorage.getItem(COOKIE_ACCEPTED_KEY);

        if (!hasAccepted) {
            setIsVisible(true);

            // Auto-dismiss after timeout
            const timer = setTimeout(() => {
                handleAccept();
            }, AUTO_DISMISS_TIME);

            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        setIsExiting(true);
        localStorage.setItem(COOKIE_ACCEPTED_KEY, 'true');

        // Wait for exit animation before hiding
        setTimeout(() => {
            setIsVisible(false);
        }, 300);
    };

    if (!isVisible) return null;

    return (
        <div
            className={`fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-50 transition-all duration-300 ${isExiting
                    ? 'translate-y-full opacity-0'
                    : 'translate-y-0 opacity-100'
                }`}
        >
            <div className="bg-background border border-border rounded-lg shadow-lg p-4 flex items-start gap-3">
                <Cookie className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />

                <div className="flex-1">
                    <p className="text-sm text-foreground">
                        Usamos cookies para analíticas y para el funcionamiento de la app.
                    </p>
                </div>

                <Button
                    onClick={handleAccept}
                    size="sm"
                    variant="default"
                    className="flex-shrink-0"
                >
                    OK
                </Button>
            </div>
        </div>
    );
}
