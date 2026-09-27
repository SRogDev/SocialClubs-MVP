/**
 * API Route: ImageKit Upload Auth
 * GET /api/upload-auth
 *
 * Generates short-lived upload credentials for client-side ImageKit uploads.
 * Must be authenticated — only logged-in users can upload.
 */
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'

import { generateUploadAuthParams } from '@/lib/imagekit'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    const limited = await rateLimit(request, RATE_LIMITS.MUTATION)
    if (limited) return limited

    try {
        // Verify user is authenticated
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        // Generate upload auth params (short-lived, max 1h)
        const { token, expire, signature } = generateUploadAuthParams()

        return NextResponse.json({
            token,
            expire,
            signature,
            publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
        })
    } catch (error) {
        console.error('Error generating ImageKit auth params:', error)
        return NextResponse.json(
            { error: 'Error al generar credenciales de subida' },
            { status: 500 }
        )
    }
}
