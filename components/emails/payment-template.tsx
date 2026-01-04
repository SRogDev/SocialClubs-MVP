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

interface PaymentEmailProps {
    userName: string
    clubName: string
    amount: string
    currency?: string
    transactionId: string
    paymentDate: string
    subscriptionPeriod?: string
    invoiceUrl?: string
}

export default function PaymentEmail({
    userName = 'Usuario',
    clubName = 'Club Premium',
    amount = '9.99',
    currency = 'USD',
    transactionId,
    paymentDate = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }),
    subscriptionPeriod = 'mensual',
    invoiceUrl = `https://socialclubs.com/invoices/${transactionId}`,
}: PaymentEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Confirmación de pago - {clubName}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header con logo */}
                    <Section style={header}>
                        <Heading style={h1}>✓ Pago Confirmado</Heading>
                    </Section>

                    {/* Contenido principal */}
                    <Section style={content}>
                        <Text style={greeting}>Hola {userName},</Text>

                        <Text style={paragraph}>
                            Hemos recibido tu pago con éxito. Gracias por apoyar a <strong style={strong}>{clubName}</strong> y formar parte de nuestra comunidad.
                        </Text>

                        <Section style={successBox}>
                            <Text style={successIcon}>💳</Text>
                            <Text style={successText}>
                                Pago procesado exitosamente
                            </Text>
                        </Section>

                        <Hr style={divider} />

                        {/* Detalles del pago */}
                        <Text style={sectionTitle}>Detalles de la transacción</Text>

                        <Section style={detailsBox}>
                            <Text style={detailRow}>
                                <span style={detailLabel}>Club:</span>
                                <span style={detailValue}>{clubName}</span>
                            </Text>
                            <Text style={detailRow}>
                                <span style={detailLabel}>Monto:</span>
                                <span style={detailValue}>{currency} ${amount}</span>
                            </Text>
                            <Text style={detailRow}>
                                <span style={detailLabel}>Período:</span>
                                <span style={detailValue}>{subscriptionPeriod}</span>
                            </Text>
                            <Text style={detailRow}>
                                <span style={detailLabel}>Fecha:</span>
                                <span style={detailValue}>{paymentDate}</span>
                            </Text>
                            <Text style={detailRow}>
                                <span style={detailLabel}>ID Transacción:</span>
                                <span style={detailValue}>{transactionId}</span>
                            </Text>
                        </Section>

                        <Hr style={divider} />

                        <Text style={paragraph}>
                            <strong>¿Qué incluye tu suscripción?</strong>
                        </Text>
                        <Section style={benefitsBox}>
                            <Text style={benefitItem}>
                                ✓ Acceso completo al contenido exclusivo del club
                            </Text>
                            <Text style={benefitItem}>
                                ✓ Participación en chats y discusiones privadas
                            </Text>
                            <Text style={benefitItem}>
                                ✓ Acceso a eventos y sesiones en vivo
                            </Text>
                            <Text style={benefitItem}>
                                ✓ Soporte directo del creador
                            </Text>
                        </Section>

                        <Hr style={divider} />

                        {/* Botón de factura */}
                        <Section style={buttonContainer}>
                            <Button style={button} href={invoiceUrl}>
                                Ver Factura Completa
                            </Button>
                        </Section>

                        <Text style={footnote}>
                            O copia y pega este enlace en tu navegador:
                        </Text>
                        <Text style={urlText}>{invoiceUrl}</Text>

                        <Hr style={divider} />

                        <Text style={infoText}>
                            <strong>Renovación automática:</strong> Tu suscripción se renovará automáticamente al final del período. Puedes cancelarla en cualquier momento desde tu perfil sin cargos adicionales.
                        </Text>

                        <Text style={paragraph}>
                            Si tienes alguna pregunta sobre este pago, puedes contactarnos en{' '}
                            <Link href="mailto:billing@socialclubs.com" style={link}>
                                billing@socialclubs.com
                            </Link>
                        </Text>

                        <Text style={paragraph}>
                            ¡Disfruta de tu membresía!
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
                            <Link href="https://socialclubs.com/billing" style={footerLink}>
                                Gestionar Suscripciones
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
    borderBottom: '2px solid #10B981', // Green for success
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

const strong = {
    color: '#1A1612',
    fontWeight: '600',
}

const successBox = {
    backgroundColor: '#F0FDF4', // Light green background
    border: '2px solid #86EFAC', // Green border
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    textAlign: 'center' as const,
}

const successIcon = {
    fontSize: '48px',
    margin: '0 0 12px 0',
}

const successText = {
    color: '#065F46', // Dark green
    fontSize: '18px',
    fontWeight: '600',
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

const benefitsBox = {
    backgroundColor: '#FFFBEB', // Light amber background
    borderLeft: '4px solid #EC6F3D', // Orange accent
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
}

const benefitItem = {
    color: '#4A4541',
    fontSize: '14px',
    lineHeight: '24px',
    margin: '6px 0',
}

const infoText = {
    color: '#4A4541',
    fontSize: '14px',
    lineHeight: '20px',
    backgroundColor: '#F8FAFC',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
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
