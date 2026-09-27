import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { rateLimit, RATE_LIMITS, addRateLimitHeaders } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { updateAppointmentSlotSchema } from '@/schemas/appointmentSchema';
import { updateAppointmentSlot, deleteAppointmentSlot } from '@/services/appointmentService';

/**
 * PATCH /api/appointments/[id]
 * Update an appointment slot
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION);
    if (rateLimitResult) return rateLimitResult;

    try {
        const appointmentId = parseInt(params.id);
        if (isNaN(appointmentId)) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
        }

        // Authentication
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse body
        const body = await request.json();

        // Validation
        const validationResult = updateAppointmentSlotSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validationResult.error.errors },
                { status: 400 }
            );
        }

        // Update appointment
        const appointment = await updateAppointmentSlot(appointmentId, validationResult.data, user.id);

        const response = NextResponse.json({ success: true, data: appointment });
        return addRateLimitHeaders(response, request);
    } catch (error: any) {
        console.error('Error in PATCH /api/appointments/[id]:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: error.message.includes('permiso') ? 403 : 500 }
        );
    }
}

/**
 * DELETE /api/appointments/[id]
 * Delete an appointment slot (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.MUTATION);
    if (rateLimitResult) return rateLimitResult;

    try {
        const appointmentId = parseInt(params.id);
        if (isNaN(appointmentId)) {
            return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
        }

        // Authentication
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete appointment
        await deleteAppointmentSlot(appointmentId, user.id);

        const response = NextResponse.json({ success: true, message: 'Cita eliminada' });
        return addRateLimitHeaders(response, request);
    } catch (error: any) {
        console.error('Error in DELETE /api/appointments/[id]:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: error.message.includes('permiso') ? 403 : 500 }
        );
    }
}
