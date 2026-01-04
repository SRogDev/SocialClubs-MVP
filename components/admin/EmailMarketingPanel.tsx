'use client'

import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { sendMarketingEmailAction } from '@/app/actions/adminActions'
import { useState } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

/**
 * Panel de email marketing
 * Client Component para manejo de formulario
 */
export function EmailMarketingPanel() {
    const { toast } = useToast()
    const [emailContent, setEmailContent] = useState('')
    const [isSending, setIsSending] = useState(false)

    const handleSendEmail = async () => {
        if (!emailContent.trim()) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'El contenido del email no puede estar vacío',
            })
            return
        }

        setIsSending(true)
        try {
            const result = await sendMarketingEmailAction(emailContent, 'Marketing Update')

            if (result.success) {
                toast({
                    title: 'Emails enviados',
                    description: result.message || 'Emails enviados exitosamente',
                })
                setEmailContent('')
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'No se pudieron enviar los emails',
                })
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Ocurrió un error al enviar los emails',
            })
        } finally {
            setIsSending(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Email Marketing Masivo</CardTitle>
                <CardDescription>
                    Envía un email a todos los usuarios activos de la plataforma
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email-content">Contenido del Email</Label>
                    <Textarea
                        id="email-content"
                        placeholder="Escribe el contenido del email aquí..."
                        value={emailContent}
                        onChange={(e) => setEmailContent(e.target.value)}
                        rows={8}
                        className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                        El email se enviará a todos los usuarios con cuentas activas
                    </p>
                </div>

                <Button
                    onClick={handleSendEmail}
                    disabled={isSending || !emailContent.trim()}
                    className="w-full"
                >
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? 'Enviando...' : 'Enviar Email a Todos'}
                </Button>
            </CardContent>
        </Card>
    )
}
