import { MessageCircle, Clock, Mail } from 'lucide-react'

import { CrispChat } from '@/components/club-panel/CrispChat'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SupportPageProps {
    params: Promise<{ id: string }>
}

/**
 * Página de Soporte del Club (Server Component)
 * Muestra el chat de Crisp para contactar con soporte
 */
export default async function SupportPage({ params }: SupportPageProps) {
    const { id } = await params

    // Reemplaza con tu CRISP_WEBSITE_ID real desde las variables de entorno
    const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || 'YOUR_CRISP_ID'

    return (
        <div className="container max-w-4xl py-8">
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Soporte</h1>
                    <p className="text-muted-foreground mt-2">
                        Contacta con nuestro equipo de soporte para resolver tus dudas
                    </p>
                </div>

                {/* Card principal de chat */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-primary" />
                            <CardTitle>Chat en Vivo</CardTitle>
                        </div>
                        <CardDescription>
                            Haz clic en el widget de chat en la esquina inferior derecha para hablar con soporte
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Cómo funciona */}
                        <div>
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" />
                                ¿Cómo funciona?
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary font-semibold">1.</span>
                                    <span>Haz clic en el ícono de chat en la esquina inferior derecha</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary font-semibold">2.</span>
                                    <span>Escribe tu mensaje o pregunta</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary font-semibold">3.</span>
                                    <span>Nuestro equipo te responderá lo antes posible</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary font-semibold">4.</span>
                                    <span>Todo el historial queda guardado para futuras consultas</span>
                                </li>
                            </ul>
                        </div>

                        {/* Horario */}
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Horario de Atención
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-1">
                                <p>Lunes a Viernes: 9:00 AM - 6:00 PM</p>
                                <p>Sábados: 10:00 AM - 2:00 PM</p>
                                <p>Domingos: Cerrado</p>
                                <p className="text-xs mt-2 italic">
                                    Fuera del horario de atención, responderemos tu mensaje al día siguiente hábil
                                </p>
                            </div>
                        </div>

                        {/* Otras formas de contacto */}
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Otras Formas de Contacto
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p>
                                    <strong>Email:</strong>{' '}
                                    <a
                                        href="mailto:support@socialclubs.com"
                                        className="text-primary underline hover:text-primary/80"
                                    >
                                        support@socialclubs.com
                                    </a>
                                </p>
                                <p className="text-xs italic">Tiempo de respuesta: 24-48 horas hábiles</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Info adicional */}
                <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                            <strong>Tip:</strong> Antes de contactar con soporte, puedes revisar nuestra{' '}
                            <a href="/help" className="text-primary underline hover:text-primary/80">
                                base de conocimientos
                            </a>{' '}
                            donde encontrarás respuestas a las preguntas más frecuentes.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Componente Crisp - se renderiza en el cliente */}
            <CrispChat websiteId={CRISP_WEBSITE_ID} />
        </div>
    )
}
