import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getClubCreatorEmail } from '@/services/adminService'
import WarningClubEmail from '@/components/emails/warning-club-template'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * POST /api/resend/warning-club
 * Envía email de advertencia al creador del club
 * Solo accesible por admins
 */
export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION)
        if (rateLimitResult) return rateLimitResult

        // Verificar autenticación y rol de admin
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        // Verificar que el usuario es admin
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userError || userData?.role !== 'admin') {
            return NextResponse.json(
                { error: 'No tienes permisos de administrador' },
                { status: 403 }
            )
        }

        // Obtener datos del request
        const body = await request.json()
        const { clubId, warningReason } = body

        if (!clubId) {
            return NextResponse.json(
                { error: 'clubId es requerido' },
                { status: 400 }
            )
        }

        // Obtener información del creator del club
        const creatorInfo = await getClubCreatorEmail(clubId)

        if (!creatorInfo) {
            return NextResponse.json(
                { error: 'No se pudo obtener información del creador del club' },
                { status: 404 }
            )
        }

        // Renderizar el email template
        const emailHtml = await render(
            WarningClubEmail({
                clubName: creatorInfo.clubName,
                creatorName: creatorInfo.name,
                warningReason,
            })
        )

        // Enviar email con Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'SocialClubs <notifications@socialclubs.com>',
            to: creatorInfo.email,
            subject: `⚠️ Advertencia importante sobre tu club "${creatorInfo.clubName}"`,
            html: emailHtml,
        })

        if (emailError) {
            console.error('Error sending warning email:', emailError)
            return NextResponse.json(
                { error: 'Error al enviar el email' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            emailId: emailData?.id,
            message: 'Email de advertencia enviado exitosamente',
        })
    } catch (error) {
        console.error('Error in warning-club email route:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
