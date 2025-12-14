import React, { useEffect, useState } from 'react';

interface WidgetCountdownProps {
    title: string;
    targetTime: Date | string | number;
    className?: string;
}

function getTimeLeft(target: Date): { days: number; hours: number; minutes: number; seconds: number } {
    const now = new Date();
    const diff = Math.max(0, target.getTime() - now.getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds };
}

export const WidgetCountdown: React.FC<WidgetCountdownProps> = ({ title, targetTime, className }) => {
    const target = new Date(targetTime);
    const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(target));

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(getTimeLeft(target));
        }, 1000);
        return () => clearInterval(interval);
    }, [targetTime]);

    return (
        <div
            className={`rounded-xl border border-dashed border-primary bg-muted/60 p-6 flex flex-col items-center gap-2 shadow-md ${className || ''}`}
            aria-label="Countdown Widget"
        >
            <div className="text-lg font-semibold text-primary text-center mb-2">{title}</div>
            <div className="flex gap-3 text-2xl font-mono text-accent-foreground">
                <span>{String(timeLeft.days).padStart(2, '0')}<span className="text-xs ml-1">d</span></span>
                <span>:</span>
                <span>{String(timeLeft.hours).padStart(2, '0')}<span className="text-xs ml-1">h</span></span>
                <span>:</span>
                <span>{String(timeLeft.minutes).padStart(2, '0')}<span className="text-xs ml-1">m</span></span>
                <span>:</span>
                <span>{String(timeLeft.seconds).padStart(2, '0')}<span className="text-xs ml-1">s</span></span>
            </div>
        </div>
    );
};
