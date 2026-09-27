"use client";
import { Image } from "@imagekit/next";
import { useEffect, useState } from "react";

import { toast } from "@/components/ui/use-toast";

interface WelcomeClubMessageProps {
    clubId: string;
    clubName: string;
    clubColor: string;
    clubIconUrl: string;
    welcomeMessage: string;
}

export default function WelcomeClubMessage({
    clubId,
    clubName,
    clubColor,
    clubIconUrl,
    welcomeMessage,
}: WelcomeClubMessageProps) {
    const [shown, setShown] = useState(false);

    useEffect(() => {
        // Only show once per club per user (localStorage)
        const key = `welcome_shown_${clubId}`;
        if (!localStorage.getItem(key)) {
            toast.custom(
                <div
                    className="flex items-center gap-4 px-6 py-4 rounded-xl shadow-lg animate-fade-in"
                    style={{
                        background: `linear-gradient(90deg, ${clubColor}33 0%, ${clubColor}99 100%)`,
                        boxShadow: `0 0 24px 4px ${clubColor}55`,
                        filter: "brightness(1.15)",
                    }}
                >
                    <Image
                        src={clubIconUrl}
                        alt={clubName}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full border-2 border-white shadow object-cover"
                        style={{ background: clubColor }}
                    />
                    <div>
                        <div className="font-bold text-lg" style={{ color: clubColor }}>{clubName}</div>
                        <div className="text-base text-foreground/90 font-serif">{welcomeMessage}</div>
                    </div>
                </div>,
                { duration: 7000 }
            );
            localStorage.setItem(key, "1");
            setShown(true);
        }
    }, [clubId, clubName, clubColor, clubIconUrl, welcomeMessage]);

    return null;
}
