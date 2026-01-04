'use client'

import { ClubAdminCard } from './ClubAdminCard'
import { ReportTypeBadge } from './ReportTypeBadge'
import { Button } from '@/components/ui/button'
import { warnCreatorAction, banClubAction } from '@/app/actions/adminActions'
import { AlertCircle, Ban } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { ClubWithReports } from '@/services/adminService'

interface ClubModerationCardProps {
    club: ClubWithReports
}

/**
 * Card de moderación que extiende ClubAdminCard
 * Muestra badges de reportes y botones de acción
 */
export function ClubModerationCard({ club }: ClubModerationCardProps) {
    const { toast } = useToast()
    const [isWarning, setIsWarning] = useState(false)
    const [isBanning, setIsBanning] = useState(false)

    const handleWarn = async () => {
        setIsWarning(true)
        try {
            const result = await warnCreatorAction(club.id, 'Múltiples reportes recibidos')

            if (result.success) {
                toast({
                    title: 'Advertencia enviada',
                    description: `Se ha enviado un email de advertencia al creator de "${club.name}"`,
                })
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'No se pudo enviar la advertencia',
                })
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Ocurrió un error al enviar la advertencia',
            })
        } finally {
            setIsWarning(false)
        }
    }

    const handleBan = async () => {
        setIsBanning(true)
        try {
            const result = await banClubAction(club.id)

            if (result.success) {
                toast({
                    title: 'Club baneado',
                    description: `"${club.name}" ha sido baneado y se notificó al creator`,
                })
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'No se pudo banear el club',
                })
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Ocurrió un error al banear el club',
            })
        } finally {
            setIsBanning(false)
        }
    }

    return (
        <div className="space-y-3">
            {/* Club Card */}
            <ClubAdminCard club={club} />

            {/* Report Types */}
            <div className="flex flex-wrap gap-2">
                {club.reports.sexual_content > 0 && (
                    <ReportTypeBadge type="sexual_content" count={club.reports.sexual_content} />
                )}
                {club.reports.extreme_violence > 0 && (
                    <ReportTypeBadge type="extreme_violence" count={club.reports.extreme_violence} />
                )}
                {club.reports.scam > 0 && (
                    <ReportTypeBadge type="scam" count={club.reports.scam} />
                )}
                {club.reports.spam > 0 && (
                    <ReportTypeBadge type="spam" count={club.reports.spam} />
                )}
            </div>

            {/* Action Buttons */}
            {club.status === 'active' && (
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleWarn}
                        disabled={isWarning}
                        className="flex-1"
                    >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        {isWarning ? 'Enviando...' : 'Advertir'}
                    </Button>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                size="sm"
                                disabled={isBanning}
                                className="flex-1"
                            >
                                <Ban className="mr-2 h-4 w-4" />
                                {isBanning ? 'Baneando...' : 'Banear'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Banear "{club.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción baneará el club permanentemente y notificará al creator por email.
                                    El creator podrá apelar desde la página del club.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleBan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Confirmar Baneo
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}

            {club.status === 'banned' && (
                <div className="rounded-md bg-destructive/10 p-2 text-center text-sm font-medium text-destructive">
                    Club ya baneado
                </div>
            )}
        </div>
    )
}
