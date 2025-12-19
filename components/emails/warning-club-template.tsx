import {
    Body,
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

interface WarningClubEmailProps {
    clubName: string
    creatorName: string
    warningReason?: string
}

export default function WarningClubEmail({
    clubName = 'Tu Club',
    creatorName = 'Usuario',
    warningReason = 'reportes de usuarios sobre contenido que podría violar nuestras políticas',
}: WarningClubEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Advertencia importante sobre tu club {clubName}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header con logo */}
                    <Section style={header}>
                        <Heading style={h1}>⚠️ Advertencia Importante</Heading>
                    </Section>

                    {/* Contenido principal */}
                    <Section style={content}>
                        <Text style={greeting}>Hola {creatorName},</Text>

                        <Text style={paragraph}>
                            Te escribimos en relación a tu club <strong style={strong}>{clubName}</strong> para informarte sobre una situación que requiere tu atención inmediata.
                        </Text>

                        <Section style={warningBox}>
                            <Text style={warningText}>
                                ⚠️ <strong>Advertencia Oficial</strong>
                            </Text>
                            <Text style={warningDescription}>
                                Hemos detectado {warningReason}. Esta es una advertencia formal antes de tomar medidas adicionales.
                            </Text>
                        </Section>

                        <Hr style={divider} />

                        <Text style={paragraph}>
                            <strong>¿Por qué estás recibiendo esta advertencia?</strong>
                        </Text>
                        <Text style={paragraph}>
                            Nuestro equipo ha identificado actividades o contenido en tu club que podrían estar violando nuestros{' '}
                            <Link href="https://socialclubs.com/terms-of-use" style={link}>
                                Términos de Servicio
                            </Link>{' '}
                            o{' '}
                            <Link href="https://socialclubs.com/privacy-policy" style={link}>
                                Políticas de Comunidad
                            </Link>
                            .
                        </Text>

                        <Hr style={divider} />

                        <Text style={paragraph}>
                            <strong>Acciones recomendadas:</strong>
                        </Text>
                        <Section style={actionBox}>
                            <Text style={actionItem}>
                                ✓ Revisa el contenido reciente de tu club
                            </Text>
                            <Text style={actionItem}>
                                ✓ Elimina cualquier contenido que pueda violar nuestras políticas
                            </Text>
                            <Text style={actionItem}>
                                ✓ Comunica las reglas claramente a tus miembros
                            </Text>
                            <Text style={actionItem}>
                                ✓ Modera activamente las publicaciones y comentarios
                            </Text>
                        </Section>

                        <Hr style={divider} />

                        <Text style={paragraph}>
                            <strong>¿Qué sucede si no tomas acción?</strong>
                        </Text>
                        <Text style={cautionText}>
                            Si continúan llegando reportes o detectamos más violaciones, tu club podría ser suspendido temporalmente o permanentemente sin previo aviso adicional.
                        </Text>

                        <Hr style={divider} />

                        <Text style={paragraph}>
                            Entendemos que gestionar una comunidad puede ser desafiante. Estamos aquí para ayudarte a crear un espacio seguro y positivo para todos.
                        </Text>

                        <Text style={paragraph}>
                            Si tienes preguntas o necesitas orientación sobre nuestras políticas, no dudes en contactarnos:
                        </Text>

                        <Section style={contactBox}>
                            <Text style={contactText}>
                                📧 Email:{' '}
                                <Link href="mailto:support@socialclubs.com" style={link}>
                                    support@socialclubs.com
                                </Link>
                            </Text>
                            <Text style={contactText}>
                                📚 Centro de Ayuda:{' '}
                                <Link href="https://socialclubs.com/help" style={link}>
                                    socialclubs.com/help
                                </Link>
                            </Text>
                        </Section>

                        <Text style={paragraph}>
                            Apreciamos tu comprensión y cooperación para mantener SocialClubs como un lugar seguro y acogedor para todos.
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
    borderBottom: '2px solid #F59E0B', // Amber warning color
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

const warningBox = {
    backgroundColor: '#FFFBEB', // Light amber background
    border: '2px solid #FCD34D', // Amber border
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
}

const warningText = {
    color: '#92400E', // Dark amber
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '8px',
}

const warningDescription = {
    color: '#78350F',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0',
}

const actionBox = {
    backgroundColor: '#F0FDF4', // Light green background
    borderLeft: '4px solid #10B981', // Green accent
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
}

const actionItem = {
    color: '#065F46',
    fontSize: '14px',
    lineHeight: '24px',
    margin: '6px 0',
}

const cautionText = {
    color: '#DC2626', // Red text
    fontSize: '15px',
    lineHeight: '22px',
    fontWeight: '500',
    backgroundColor: '#FEF2F2',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
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
