import { NotificationCenter } from '@/components/notifications/NotificationCenter'

export const metadata = {
    title: 'Notificaciones | SocialClubs',
    description: 'Tus notificaciones de actividad en clubs, mensajes y más.',
}

/**
 * Página de notificaciones in-app.
 * Server Component wrapper → Client component NotificationCenter.
 */
export default function NotificationsPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-2xl">
                <NotificationCenter />
            </div>
        </div>
    )
}
