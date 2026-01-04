import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
    Hr,
} from '@react-email/components'

interface WithdrawEmailProps {
    creatorName: string
    amount: string
    currency?: string
    withdrawMethod: string
    transactionId: string
    withdrawDate: string
    processingTime?: string
    accountDestination?: string
    dashboardUrl?: string
}

export default function WithdrawEmail({
    creatorName = 'Creador',
    amount = '250.00',
    currency = 'USD',
    withdrawMethod = 'Transferencia bancaria',
    transactionId,
    withdrawDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }),
    processingTime = '3-5 días hábiles',
    accountDestination = '****1234',
    dashboardUrl = 'https://socialclubs.com/dashboard/earnings',
}: WithdrawEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Retiro en proceso - ${amount} {currency}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header con logo */}
                    <Section style={header}>
                        <Heading style={h1}>💰 Retiro en Proceso</Heading>
                    </Section>

                    {/* Contenido principal */}
                    <Section style={content}>
                        <Text style={greeting}>Hola {creatorName},</Text>

                        <Text style={paragraph}>
                            Tu solicitud de retiro ha sido procesada exitosamente. Los fondos están en camino a tu cuenta.
                        </Text>

                        <Section style={processingBox}>
                            <Text style={processingIcon}>⏳</Text>
                            <Text style={processingText}>
                                Procesando retiro
                            </Text>
                            <Text style={processingSubtext}>
                                Tiempo estimado: {processingTime}
                            </Text>
                        </Section>

                        <Hr style={divider} />

                        {/* Detalles del retiro */}
                        <Text style={sectionTitle}>Detalles del retiro</Text>

                        <Section style={detailsBox}>
                            <Text style={detailRow}>
                                <span style={detailLabel}>Monto:</span>
                                <span style={detailValueHighlight}>{currency} ${amount}</span>
                            </Text>
                            <Text style={detailRow}>
                                <span style={detailLabel}>Método:</span>
                                <span style={detailValue}>{withdrawMethod}</span>
                            </Text>
                            <Text style={detailRow}>
                                <span style={detailLabel}>Destino:</span>
                                <span style={detailValue}>{accountDestination}</span>
                            </Text>
                            <Text style={detailRow}>
                                <span style={detailLabel}>Fecha solicitud:</span>
                                <span style={detailValue}>{withdrawDate}</span>
                            </Text>
                            <Text style={detailRow}>
                                <span style={detailLabel}>ID Transacción:</span>
                                <span style={detailValue}>{transactionId}</span>
                            </Text>
                        </Section>

                        <Hr style={divider} />

                        <Text style={paragraph}>
                            <strong>¿Qué sigue?</strong>
                        </Text>
                        <Section style={timelineBox}>
                            <Text style={timelineItem}>
                                <span style={timelineNumber}>1</span>
                                <span style={timelineText}>
                                    <strong>Procesando (ahora):</strong> Validando la transacción y preparando la transferencia.
                                </span>
                            </Text>
                            <Text style={timelineItem}>
                                <span style={timelineNumber}>2</span>
                                <span style={timelineText}>
                                    <strong>En tránsito (1-2 días):</strong> Los fondos han sido enviados a tu cuenta.
                                </span>
                            </Text>
                            <Text style={timelineItem}>
                                <span style={timelineNumber}>3</span>
                                <span style={timelineText}>
                                    <strong>Completado ({processingTime}):</strong> Los fondos estarán disponibles en tu cuenta.
                                </span>
                            </Text>
                        </Section>

                        <Hr style={divider} />

                        {/* Información importante */}
                        <Section style={infoBox}>
                            <Text style={infoTitle}>ℹ️ Información importante</Text>
                            <Text style={infoItem}>
                                • Recibirás un correo de confirmación cuando el retiro esté completo
                            </Text>
                            <Text style={infoItem}>
                                • Los tiempos pueden variar según tu institución financiera
                            </Text>
                            <Text style={infoItem}>
                                • Puedes hacer seguimiento desde tu panel de ganancias
                            </Text>
                            <Text style={infoItem}>
                                • No se realizarán cargos adicionales por este retiro
                            </Text>
                        </Section>

                        <Hr style={divider} />

                        {/* Botón al dashboard */}
                        <Section style={buttonContainer}>
                            <Button style={button} href={dashboardUrl}>
                                Ver Panel de Ganancias
                            </Button>
                        </Section>

                        <Text style={footnote}>
                            O copia y pega este enlace en tu navegador:
                        </Text>
                        <Text style={urlText}>{dashboardUrl}</Text>

                        <Hr style={divider} />

                        <Text style={paragraph}>
                            <strong>¿Necesitas ayuda?</strong>
                        </Text>
                        <Text style={paragraph}>
                            Si tienes preguntas sobre tu retiro o no recibes los fondos en el tiempo estimado, contáctanos:
                        </Text>

                        <Section style={contactBox}>
                            <Text style={contactText}>
                                📧 Email:{' '}
                                <Link href="mailto:earnings@socialclubs.com" style={link}>
                                    earnings@socialclubs.com
                                </Link>
                            </Text>
                            <Text style={contactText}>
                                📚 Centro de Ayuda:{' '}
                                <Link href="https://socialclubs.com/help/withdrawals" style={link}>
                                    socialclubs.com/help/withdrawals
                                </Link>
                            </Text>
                        </Section>

                        <Text style={paragraph}>
                            Gracias por crear contenido valioso para nuestra comunidad. ¡Seguimos creciendo juntos!
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            © 2025 SocialClubs. Todos los derechos reservados.
                        </Text>
                        <Text style={footerText}>
                            <Link href="https://socialclubs.com/terms-of-use" style={footerLink}>
                                Términos de Uso
                            </Link>
                            {' · '}
                            <Link href="https://socialclubs.com/privacy-policy" style={footerLink}>
                                Política de Privacidad
                            </Link>
                            {' · '}
                            <Link href="https://socialclubs.com/creator-terms" style={footerLink}>
                                Términos para Creadores
                            </Link>
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

// Estilos aplicando el design system de SocialClubs
const main = {
    backgroundColor: '#FAF6F2', // Warm background
    fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const container = {
    backgroundColor: '#FFFFFF',
    margin: '0 auto',
    padding: '20px 0',
    maxWidth: '600px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
}

const header = {
    padding: '32px 40px 24px',
    borderBottom: '2px solid #EC6F3D', // Primary orange
}

const h1 = {
    color: '#1A1612', // Warm brown text
    fontSize: '28px',
    fontWeight: '700',
    margin: '0',
    textAlign: 'center' as const,
}

const content = {
    padding: '24px 40px 40px',
}

const greeting = {
    color: '#1A1612',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
}

const paragraph = {
    color: '#4A4541', // Muted warm text
    fontSize: '16px',
    lineHeight: '24px',
    marginBottom: '16px',
}

const processingBox = {
    backgroundColor: '#FFFBEB', // Light amber background
    border: '2px solid #FCD34D', // Amber border
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    textAlign: 'center' as const,
}

const processingIcon = {
    fontSize: '48px',
    margin: '0 0 12px 0',
}

const processingText = {
    color: '#92400E', // Dark amber
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 8px 0',
}

const processingSubtext = {
    color: '#78350F',
    fontSize: '14px',
    margin: '0',
}

const sectionTitle = {
    color: '#1A1612',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
}

const detailsBox = {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
}

const detailRow = {
    color: '#4A4541',
    fontSize: '15px',
    lineHeight: '28px',
    margin: '8px 0',
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
}

const detailLabel = {
    fontWeight: '500',
    color: '#78716C',
}

const detailValue = {
    fontWeight: '600',
    color: '#1A1612',
}

const detailValueHighlight = {
    fontWeight: '700',
    color: '#EC6F3D',
    fontSize: '18px',
}

const timelineBox = {
    backgroundColor: '#F0FDF4', // Light green background
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
}

const timelineItem = {
    display: 'flex' as const,
    alignItems: 'flex-start' as const,
    margin: '16px 0',
    fontSize: '14px',
    lineHeight: '20px',
}

const timelineNumber = {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '14px',
    marginRight: '12px',
    flexShrink: 0,
}

const timelineText = {
    color: '#065F46',
    flex: 1,
}

const infoBox = {
    backgroundColor: '#EFF6FF', // Light blue background
    border: '1px solid #BFDBFE',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
}

const infoTitle = {
    color: '#1E40AF',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
}

const infoItem = {
    color: '#1E3A8A',
    fontSize: '14px',
    lineHeight: '24px',
    margin: '6px 0',
}

const contactBox = {
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
}

const contactText = {
    color: '#4A4541',
    fontSize: '14px',
    lineHeight: '24px',
    margin: '4px 0',
}

const divider = {
    borderColor: '#E7E5E4',
    margin: '24px 0',
}

const buttonContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
}

const button = {
    backgroundColor: '#EC6F3D', // Primary orange
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 32px',
    lineHeight: '24px',
}

const footnote = {
    color: '#78716C',
    fontSize: '13px',
    textAlign: 'center' as const,
    marginTop: '8px',
}

const urlText = {
    color: '#EC6F3D',
    fontSize: '13px',
    textAlign: 'center' as const,
    wordBreak: 'break-all' as const,
    marginTop: '4px',
}

const link = {
    color: '#EC6F3D',
    textDecoration: 'underline',
}

const footer = {
    padding: '24px 40px',
    borderTop: '1px solid #E7E5E4',
}

const footerText = {
    color: '#78716C',
    fontSize: '13px',
    textAlign: 'center' as const,
    margin: '8px 0',
}

const footerLink = {
    color: '#78716C',
    textDecoration: 'underline',
}
