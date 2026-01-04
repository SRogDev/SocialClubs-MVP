import { createClient } from '@/lib/supabase/server';
import type { VideocallRoom, Booking } from '@/types/appointment';

// ====================================
// DAILY.CO API CLIENT
// ====================================

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_DOMAIN = process.env.NEXT_PUBLIC_DAILY_DOMAIN || 'your-domain.daily.co';
const DAILY_API_BASE = 'https://api.daily.co/v1';

interface DailyRoomConfig {
    name: string;
    privacy: 'private' | 'public';
    properties: {
        exp: number; // Unix timestamp
        enable_screenshare: boolean;
        enable_chat: boolean;
        enable_recording: 'cloud' | 'local' | false;
        max_participants: number;
        enable_network_ui: boolean;
        enable_prejoin_ui: boolean;
    };
}

interface DailyRoomResponse {
    id: string;
    name: string;
    url: string;
    config: DailyRoomConfig;
    created_at: string;
}

/**
 * Create a Daily.co room via API
 */
async function createDailyRoomAPI(config: DailyRoomConfig): Promise<DailyRoomResponse> {
    if (!DAILY_API_KEY) {
        throw new Error('DAILY_API_KEY no está configurada en variables de entorno');
    }

    const response = await fetch(`${DAILY_API_BASE}/rooms`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify(config),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Error creando room de Daily.co: ${error.error || response.statusText}`);
    }

    return response.json();
}

/**
 * Delete a Daily.co room via API
 */
async function deleteDailyRoomAPI(roomName: string): Promise<void> {
    if (!DAILY_API_KEY) {
        throw new Error('DAILY_API_KEY no está configurada');
    }

    const response = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
        },
    });

    if (!response.ok && response.status !== 404) {
        const error = await response.json();
        throw new Error(`Error eliminando room: ${error.error || response.statusText}`);
    }
}

// ====================================
// VIDEOCALL SERVICE (REPOSITORY)
// ====================================

/**
 * Create a Daily.co room for a booking
 * Called by cron job when appointment time arrives
 */
export async function createDailyRoom(bookingId: number): Promise<VideocallRoom> {
    const supabase = await createClient();

    // Get booking details with appointment and club info
    const { data: booking, error: bookingError } = await supabase
        .from('users_agendas')
        .select(
            `
      *,
      appointment:vcall_appointments(*),
      club:clubs(id, name, creator)
    `
        )
        .eq('id', bookingId)
        .single();

    if (bookingError || !booking) {
        throw new Error(`Booking no encontrado: ${bookingError?.message}`);
    }

    if (booking.status !== 'confirmed') {
        throw new Error(`Booking no está confirmado (status: ${booking.status})`);
    }

    if (booking.call_room_created) {
        // Room already exists, fetch and return it
        const { data: existingRoom } = await supabase
            .from('vcall_rooms')
            .select('*')
            .eq('booking_id', bookingId)
            .single();

        if (existingRoom) {
            return existingRoom as VideocallRoom;
        }
    }

    // Generate unique room name
    const roomName = `socialclubs-${bookingId}-${Date.now()}`;

    // Calculate expiration (duration from appointment)
    const durationMinutes = (booking.appointment as any).duration || 60;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    // Create Daily.co room
    const dailyRoom = await createDailyRoomAPI({
        name: roomName,
        privacy: 'private',
        properties: {
            exp: Math.floor(expiresAt.getTime() / 1000),
            enable_screenshare: true,
            enable_chat: false,
            enable_recording: false,
            max_participants: 2, // 1-on-1 calls only
            enable_network_ui: true,
            enable_prejoin_ui: true,
        },
    });

    // Insert room into database
    const { data: room, error: roomError } = await supabase
        .from('vcall_rooms')
        .insert({
            club_id: booking.club_id,
            user_id: booking.user_id,
            creator_id: (booking.club as any).creator,
            booking_id: bookingId,
            appointment_id: booking.appointment_id,
            room_name: dailyRoom.name,
            link: dailyRoom.url,
            status: 'active',
            expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

    if (roomError || !room) {
        // Cleanup: delete Daily room if DB insert failed
        await deleteDailyRoomAPI(roomName).catch(console.error);
        throw new Error(`Error creando room en BD: ${roomError?.message}`);
    }

    // Update booking to mark room as created
    await supabase
        .from('users_agendas')
        .update({ call_room_created: true, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

    return room as VideocallRoom;
}

/**
 * Get room by booking ID
 */
export async function getRoomByBooking(bookingId: number): Promise<VideocallRoom | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vcall_rooms')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('status', 'active')
        .single();

    if (error) {
        console.error('Error fetching room:', error);
        return null;
    }

    return data as VideocallRoom;
}

/**
 * Get room by room ID
 */
export async function getRoomById(roomId: number): Promise<VideocallRoom | null> {
    const supabase = await createClient();

    const { data, error } = await supabase.from('vcall_rooms').select('*').eq('id', roomId).single();

    if (error) {
        console.error('Error fetching room:', error);
        return null;
    }

    return data as VideocallRoom;
}

/**
 * Get room by Daily.co room name
 */
export async function getRoomByName(roomName: string): Promise<VideocallRoom | null> {
    const supabase = await createClient();

    const { data, error } = await supabase.from('vcall_rooms').select('*').eq('room_name', roomName).single();

    if (error) {
        console.error('Error fetching room:', error);
        return null;
    }

    return data as VideocallRoom;
}

/**
 * Get active room for a user
 * Returns room where user is either the member or the creator
 */
export async function getActiveRoomForUser(userId: string): Promise<VideocallRoom | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vcall_rooms')
        .select('*')
        .eq('status', 'active')
        .or(`user_id.eq.${userId},creator_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching active room:', error);
        return null;
    }

    return data as VideocallRoom | null;
}

/**
 * End a videocall room
 * Marks as ended and optionally deletes from Daily.co
 */
export async function endRoom(roomId: number, deleteFromDaily = true): Promise<void> {
    const supabase = await createClient();

    // Get room info
    const room = await getRoomById(roomId);
    if (!room) {
        throw new Error('Room no encontrado');
    }

    // Update room status
    const { error } = await supabase
        .from('vcall_rooms')
        .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
        })
        .eq('id', roomId);

    if (error) {
        throw new Error(`Error actualizando room: ${error.message}`);
    }

    // Update booking status
    if (room.booking_id) {
        await supabase
            .from('users_agendas')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', room.booking_id);
    }

    // Optionally delete from Daily.co
    if (deleteFromDaily) {
        await deleteDailyRoomAPI(room.room_name).catch((err) => {
            console.error('Error eliminando room de Daily.co:', err);
            // Don't throw, room is already marked as ended in DB
        });
    }
}

/**
 * Expire old rooms (cron job helper)
 * Marks rooms as expired if their expiration time has passed
 */
export async function expireOldRooms(): Promise<number> {
    const supabase = await createClient();

    const now = new Date().toISOString();

    const { data: expiredRooms, error } = await supabase
        .from('vcall_rooms')
        .select('id, room_name')
        .eq('status', 'active')
        .lt('expires_at', now);

    if (error || !expiredRooms) {
        console.error('Error fetching expired rooms:', error);
        return 0;
    }

    // Update all expired rooms
    const { error: updateError } = await supabase
        .from('vcall_rooms')
        .update({ status: 'expired' })
        .eq('status', 'active')
        .lt('expires_at', now);

    if (updateError) {
        console.error('Error updating expired rooms:', updateError);
    }

    // Delete from Daily.co (best effort)
    for (const room of expiredRooms) {
        await deleteDailyRoomAPI(room.room_name).catch(console.error);
    }

    return expiredRooms.length;
}

/**
 * Get room with full details (user, creator, booking, appointment)
 */
export async function getRoomWithDetails(roomId: number) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vcall_rooms')
        .select(
            `
      *,
      user:users!vcall_rooms_user_id_fkey(id, name, username, avatar_url),
      creator:users!vcall_rooms_creator_id_fkey(id, name, username, avatar_url),
      booking:users_agendas(
        *,
        appointment:vcall_appointments(*),
        club:clubs(id, name)
      )
    `
        )
        .eq('id', roomId)
        .single();

    if (error) {
        console.error('Error fetching room with details:', error);
        return null;
    }

    return data;
}
