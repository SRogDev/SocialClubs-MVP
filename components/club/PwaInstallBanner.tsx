"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Download, X, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isPWA, promptInstall, setupInstallPrompt, vibrate, VibrationPatterns } from "@/utils/pwa"

interface PwaInstallBannerProps {
    /** Show the banner (e.g. right after a user joins a club) */
    show: boolean
    clubColor?: string
}

/**
 * A subtle bottom banner that invites the user to install the PWA after
 * a meaningful moment (e.g. joining their first club).
 *
 * • Skipped entirely when already running as a standalone PWA.
 * • Respects the browser's native `beforeinstallprompt` — won't show
 *   on desktop browsers that don't support PWA install.
 * • Dismissed state persisted in localStorage to avoid repeat nagging.
 */
export function PwaInstallBanner({ show, clubColor = "#f97316" }: PwaInstallBannerProps) {
    const [visible, setVisible] = useState(false)
    const [canInstall, setCanInstall] = useState(false)

    useEffect(() => {
        // Never show if already installed or user previously dismissed
        if (isPWA()) return
        if (typeof window !== "undefined" && localStorage.getItem("pwa_banner_dismissed")) return

        // Listen for the deferred prompt
        setupInstallPrompt()

        // Give the browser a tick to fire beforeinstallprompt before deciding
        const timer = setTimeout(() => {
            // If `show` is true and there's a deferred prompt available, display.
            // We use promptInstall's truthiness as a proxy (it returns false if no prompt).
            setCanInstall(true)
            if (show) setVisible(true)
        }, 600)

        return () => clearTimeout(timer)
    }, [show])

    // Also react when `show` flips true after mount
    useEffect(() => {
        if (show && canInstall) setVisible(true)
    }, [show, canInstall])

    const handleInstall = async () => {
        vibrate(Array.from(VibrationPatterns.click))
        const accepted = await promptInstall()
        if (accepted) {
            vibrate(Array.from(VibrationPatterns.success))
        }
        setVisible(false)
        localStorage.setItem("pwa_banner_dismissed", "1")
    }

    const handleDismiss = () => {
        vibrate(Array.from(VibrationPatterns.click))
        setVisible(false)
        localStorage.setItem("pwa_banner_dismissed", "1")
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="pwa-banner"
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 30 }}
                    className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none"
                >
                    <div
                        className="pointer-events-auto mx-auto max-w-sm rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl p-4"
                        style={{ borderColor: `${clubColor}33` }}
                    >
                        <button
                            onClick={handleDismiss}
                            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                            aria-label="Cerrar"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex items-start gap-3">
                            <div
                                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                style={{ background: `${clubColor}18` }}
                            >
                                <Smartphone size={20} style={{ color: clubColor }} />
                            </div>
                            <div className="flex-1 pr-4">
                                <p className="text-sm font-semibold leading-snug">
                                    Mejor experiencia en la app
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Instala SocialClubs para recibir notificaciones y acceder más rápido.
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 gap-1.5 text-white font-semibold"
                                style={{ background: `linear-gradient(135deg, ${clubColor} 0%, ${clubColor}cc 100%)` }}
                                onClick={handleInstall}
                            >
                                <Download size={14} />
                                Instalar app
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground"
                                onClick={handleDismiss}
                            >
                                Ahora no
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
