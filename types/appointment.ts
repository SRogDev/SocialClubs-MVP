// ====================================
// APPOINTMENT & BOOKING TYPES
// ====================================

export interface Appointment {
    id: number;
    club_id: string;
    creator_id: string;
    day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time: string; // HH:MM:SS format
    duration: number; // minutes
    price: number; // cents
    timezone: string; // IANA timezone (e.g., "America/New_York")
    is_active: boolean;
    max_bookings_per_slot: number;
    created_at: string;
    updated_at: string;
}

export interface Booking {
    id: number;
    user_id: string;
    club_id: string;
    appointment_id: number;
    date: string; // YYYY-MM-DD
    start_time: string; // HH:MM:SS
    end_time: string; // HH:MM:SS
    price: number; // cents
    payment_id: string | null;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
    call_room_created: boolean;
    cancelled_at: string | null;
    cancelled_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface VideocallRoom {
    id: number;
    club_id: string;
    user_id: string; // Member who booked
    creator_id: string; // Club creator
    booking_id: number;
    appointment_id: number | null;
    room_name: string; // Daily.co unique room name
    link: string; // Daily.co room URL
    status: 'active' | 'ended' | 'expired';
    expires_at: string;
    ended_at: string | null;
    created_at: string;
}

// With relations
export interface BookingWithAppointment extends Booking {
    appointment: Appointment;
    club: {
        id: string;
        name: string;
        creator: string;
    };
}

export interface RoomWithDetails extends VideocallRoom {
    booking: BookingWithAppointment;
    user: {
        id: string;
        name: string;
        username: string;
        avatar_url: string | null;
    };
    creator: {
        id: string;
        name: string;
        username: string;
        avatar_url: string | null;
    };
}
