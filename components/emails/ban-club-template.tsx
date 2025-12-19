import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
    Hr,
} from '@react-email/components'

interface BanClubEmailProps {
    clubName: string
    creatorName: string
    clubId: string
    appealUrl?: string
}

export default function BanClubEmail({
    clubName = 'Tu Club',
    creatorName = 'Usuario',
    clubId,
    appealUrl = `https://socialclubs.com/clubs/${clubId}/banned`,
}: BanClubEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>Tu club {clubName} ha sido suspendido</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header con logo */}
                    <Section style={header}>
                        <Heading style={h1}>🚫 Club Suspendido</Heading>
                    </Section>

                    {/* Contenido principal */}
                    <Section style={content}>
                        <Text style={greeting}>Hola {creatorName},</Text>

                        <Text style={paragraph}>
                            Lamentamos informarte que tu club <strong style={strong}>{clubName}</strong> ha sido suspendido temporalmente.
                        </Text>

                        <Section style={alertBox}>
                            <Text style={alertText}>
                                📋 <strong>Razón de la suspensión:</strong>
                            </Text>
                            <Text style={alertDescription}>
                                Hemos recibido múltiples reportes de usuarios que indican que el contenido o las actividades de tu club violan nuestros{' '}
                                <Link href="https://socialclubs.com/terms-of-use" style={link}>
                                    Términos de Servicio
                                </Link>{' '}
                                y{' '}
                                <Link href="https://socialclubs.com/privacy-policy" style={link}>
                                    Políticas de Comunidad
                                </Link>
                                .
                            </Text>
                        </Section>

                        <Hr style={divider} />

                        <Text style={paragraph}>
                            <strong>¿Qué significa esto?</strong>
                        </Text>
                        <Text style={paragraph}>
                            • Tu club ya no es visible para otros usuarios<br />
                            • No puedes publicar nuevo contenido<br />
                            • Los miembros no pueden acceder al contenido del club<br />
                            • Las suscripciones activas han sido pausadas
                        </Text>

                        <Hr style={divider} />

                        <Text style={paragraph}>
                            <strong>¿Qué puedes hacer?</strong>
                        </Text>
                        <Text style={paragraph}>
                            Si crees que esta suspensión fue un error o deseas explicar tu situación, puedes iniciar un proceso de apelación. Nuestro equipo revisará tu caso en un plazo de 3-5 días hábiles.
                        </Text>

                        {/* Botón de apelación */}
                        <Section style={buttonContainer}>
                            <Button style={button} href={appealUrl}>
                                Apelar Suspensión
                            </Button>
                        </Section>

                        <Text style={footnote}>
                            O copia y pega este enlace en tu navegador:
                        </Text>
                        <Text style={urlText}>{appealUrl}</Text>

                        <Hr style={divider} />

                        <Text style={paragraph}>
                            Si tienes preguntas, puedes responder a este correo o contactarnos en{' '}
                            <Link href="mailto:support@socialclubs.com" style={link}>
                                support@socialclubs.com
                            </Link>
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
    borderBottom: '2px solid #EC6F3D', // Primary warm orange
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

const alertBox = {
    backgroundColor: '#FEF2F2', // Light red background
    border: '2px solid #FCA5A5', // Red border
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
}

const alertText = {
    color: '#991B1B', // Dark red
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '8px',
}

const alertDescription = {
    color: '#7F1D1D',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0',
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
