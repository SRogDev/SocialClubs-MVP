import type { RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';

import { createClient } from '@/lib/supabase/client';
import type { VideocallRoom } from '@/types/appointment';

// ====================================
// ROOM STORE (Zustand + Realtime)
// ====================================

interface RoomStore {
    // State
    rooms: VideocallRoom[];
    activeRoom: VideocallRoom | null;
    isLoading: boolean;
    error: string | null;
    realtimeChannel: RealtimeChannel | null;

    // Actions
    setRooms: (rooms: VideocallRoom[]) => void;
    addRoom: (room: VideocallRoom) => void;
    updateRoom: (roomId: number, updates: Partial<VideocallRoom>) => void;
    removeRoom: (roomId: number) => void;
    setActiveRoom: (room: VideocallRoom | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Realtime
    subscribeToRooms: (userId: string) => Promise<void>;
    unsubscribeFromRooms: () => void;

    // Selectors
    getRoomById: (roomId: number) => VideocallRoom | undefined;
    hasActiveRoom: () => boolean;
    getMyActiveRoom: (userId: string) => VideocallRoom | null;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
    // Initial state
    rooms: [],
    activeRoom: null,
    isLoading: false,
    error: null,
    realtimeChannel: null,

    // Actions
    setRooms: (rooms) => set({ rooms }),

    addRoom: (room) =>
        set((state) => ({
            rooms: [...state.rooms, room],
            activeRoom: state.activeRoom || room,
        })),

    updateRoom: (roomId, updates) =>
        set((state) => ({
            rooms: state.rooms.map((room) => (room.id === roomId ? { ...room, ...updates } : room)),
            activeRoom: state.activeRoom?.id === roomId ? { ...state.activeRoom, ...updates } : state.activeRoom,
        })),

    removeRoom: (roomId) =>
        set((state) => ({
            rooms: state.rooms.filter((room) => room.id !== roomId),
            activeRoom: state.activeRoom?.id === roomId ? null : state.activeRoom,
        })),

    setActiveRoom: (room) => set({ activeRoom: room }),

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    // Realtime subscription
    subscribeToRooms: async (userId: string) => {
        const supabase = createClient();
        const { addRoom, updateRoom, removeRoom, setLoading, setError } = get();

        try {
            setLoading(true);

            // Fetch initial active rooms for this user
            const { data: initialRooms, error: fetchError } = await supabase
                .from('vcall_rooms')
                .select('*')
                .eq('status', 'active')
                .or(`user_id.eq.${userId},creator_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (fetchError) {
                console.error('Error fetching initial rooms:', fetchError);
                setError('Error cargando videollamadas');
            } else {
                set({
                    rooms: (initialRooms || []) as VideocallRoom[],
                    activeRoom: initialRooms?.[0] || null,
                });
            }

            // Subscribe to real-time changes
            const channel = supabase
                .channel('vcall_rooms_changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'vcall_rooms',
                        filter: `user_id=eq.${userId}`,
                    },
                    (payload) => {
                        console.log('[RoomStore] Room INSERT (user):', payload);
                        const newRoom = payload.new as VideocallRoom;
                        if (newRoom.status === 'active') {
                            addRoom(newRoom);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'vcall_rooms',
                        filter: `creator_id=eq.${userId}`,
                    },
                    (payload) => {
                        console.log('[RoomStore] Room INSERT (creator):', payload);
                        const newRoom = payload.new as VideocallRoom;
                        if (newRoom.status === 'active' && newRoom.user_id !== userId) {
                            // Avoid duplicate if user is also creator
                            addRoom(newRoom);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'vcall_rooms',
                    },
                    (payload) => {
                        console.log('[RoomStore] Room UPDATE:', payload);
                        const updatedRoom = payload.new as VideocallRoom;
                        const { user_id, creator_id, id, status } = updatedRoom;

                        // Only update if this user is involved
                        if (user_id === userId || creator_id === userId) {
                            if (status !== 'active') {
                                // Room ended or expired, remove it
                                removeRoom(id);
                            } else {
                                updateRoom(id, updatedRoom);
                            }
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'DELETE',
                        schema: 'public',
                        table: 'vcall_rooms',
                    },
                    (payload) => {
                        console.log('[RoomStore] Room DELETE:', payload);
                        const deletedRoom = payload.old as VideocallRoom;
                        removeRoom(deletedRoom.id);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('[RoomStore] Subscribed to room changes');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('[RoomStore] Channel error');
                        setError('Error en conexión en tiempo real');
                    }
                });

            set({ realtimeChannel: channel });
            setLoading(false);
        } catch (error: any) {
            console.error('[RoomStore] Error subscribing:', error);
            setError('Error configurando actualizaciones en tiempo real');
            setLoading(false);
        }
    },

    unsubscribeFromRooms: () => {
        const { realtimeChannel } = get();
        if (realtimeChannel) {
            console.log('[RoomStore] Unsubscribing from rooms');
            const supabase = createClient();
            supabase.removeChannel(realtimeChannel);
            set({ realtimeChannel: null });
        }
    },

    // Selectors
    getRoomById: (roomId: number) => {
        return get().rooms.find((room) => room.id === roomId);
    },

    hasActiveRoom: () => {
        return get().activeRoom !== null;
    },

    getMyActiveRoom: (userId: string) => {
        const { rooms } = get();
        const myRoom = rooms.find(
            (room) => room.status === 'active' && (room.user_id === userId || room.creator_id === userId)
        );
        return myRoom || null;
    },
}));
