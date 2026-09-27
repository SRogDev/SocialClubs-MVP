import { Ban } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'

import { AppealButton } from '@/components/admin/AppealButton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/server'


interface ClubBannedPageProps {
    params: Promise<{ id: string }>
}

/**
 * Página de Club Baneado (Server Component)
 * Muestra mensaje de baneo y opción de apelación al creator
 */
export default async function ClubBannedPage({ params }: ClubBannedPageProps) {
    const { id } = await params
    const supabase = await createClient()

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/auth/login')
    }

    // Obtener información del club
    const { data: club, error } = await supabase
        .from('clubs')
        .select('id, name, description, status, created_by')
        .eq('id', id)
        .single()

    if (error || !club) {
        notFound()
    }

    // Verificar que el club esté baneado
    if (club.status !== 'banned') {
        redirect(`/clubs/${id}`)
    }

    // Verificar que el usuario sea el creator
    const isCreator = club.created_by === user.id
    if (!isCreator) {
        redirect('/home-clubs')
    }

    return (
        <div className="container max-w-3xl py-10">
            {/* Alert de baneo */}
            <Alert variant="destructive" className="mb-6">
                <Ban className="h-5 w-5" />
                <AlertTitle className="text-xl font-bold">CLUB BANEADO</AlertTitle>
                <AlertDescription className="mt-2 text-base">
                    Tu club <strong>"{club.name}"</strong> ha sido baneado por violar las políticas de la
                    plataforma.
                </AlertDescription>
            </Alert>

            {/* Información */}
            <div className="space-y-6 rounded-lg border p-6">
                <div>
                    <h2 className="text-2xl font-bold mb-2">¿Por qué fue baneado mi club?</h2>
                    <p className="text-muted-foreground">
                        Tu club recibió múltiples reportes que indican violaciones a nuestras{' '}
                        <a href="/terms-of-use" className="underline hover:text-primary">
                            Condiciones de Uso
                        </a>
                        . Los reportes pueden incluir:
                    </p>
                    <ul className="list-disc list-inside mt-3 space-y-1 text-muted-foreground">
                        <li>Contenido sexual inapropiado</li>
                        <li>Violencia extrema o contenido gráfico</li>
                        <li>Estafas o actividades fraudulentas</li>
                        <li>Spam o contenido no deseado</li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-2">¿Qué puedo hacer?</h3>
                    <p className="text-muted-foreground mb-4">
                        Si crees que este baneo fue un error o tienes información adicional que quieras
                        compartir, puedes apelar esta decisión. Nuestro equipo revisará tu caso en un plazo de
                        3-5 días hábiles.
                    </p>
                    <AppealButton clubId={club.id} clubName={club.name} />
                </div>

                <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                        <strong>Nota:</strong> Durante el periodo de revisión, tu club permanecerá inaccesible
                        para otros usuarios. Si la apelación es aceptada, se restaurará el acceso
                        inmediatamente.
                    </p>
                </div>
            </div>

            {/* Descripción del club (para referencia del creator) */}
            <div className="mt-6 rounded-lg border p-6 bg-muted/50">
                <h3 className="text-lg font-semibold mb-2">Información del Club</h3>
                <p className="text-sm text-muted-foreground mb-1">
                    <strong>Nombre:</strong> {club.name}
                </p>
                {club.description && (
                    <p className="text-sm text-muted-foreground">
                        <strong>Descripción:</strong> {club.description}
                    </p>
                )}
            </div>
        </div>
    )
}
