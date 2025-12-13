/**
 * Utilidades para funcionalidades PWA
 */

/**
 * Registra el Service Worker para habilitar PWA
 */
export const registerServiceWorker = async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registrado:', registration);
        } catch (error) {
            console.error('Error al registrar Service Worker:', error);
        }
    }
};

/**
 * Vibra el dispositivo con un patrón específico
 * @param pattern - Patrón de vibración (número o array de números en ms)
 * @returns true si la vibración es soportada y ejecutada
 */
export const vibrate = (pattern: number | number[] = 200): boolean => {
    if ('vibrate' in navigator) {
        return navigator.vibrate(pattern);
    }
    return false;
};

/**
 * Patrones de vibración predefinidos
 */
export const VibrationPatterns = {
    // Vibración corta (éxito, confirmación)
    success: [100],
    // Vibración de error (dos pulsos)
    error: [100, 50, 100],
    // Vibración de notificación (tres pulsos)
    notification: [50, 100, 50, 100, 50],
    // Vibración de advertencia (pulso largo)
    warning: [300],
    // Vibración de click (muy corta)
    click: [10],
} as const;

/**
 * Verifica si la app está instalada como PWA
 */
export const isPWA = (): boolean => {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
    );
};

/**
 * BeforeInstallPromptEvent interface for PWA install prompt
 */
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[]
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed'
        platform: string
    }>
    prompt(): Promise<void>
}

/**
 * Prompt para instalar la PWA
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const setupInstallPrompt = () => {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
    });
};

export const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;

    return outcome === 'accepted';
};
