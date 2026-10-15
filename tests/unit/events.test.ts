/**
 * Events v2 (master plan Phases 46-52) — unit tests (RED → GREEN).
 *
 * - `eventPhase` is a pure function: all 4 phases + boundary conditions.
 * - `services/eventService.ts` runs against an in-memory fake Supabase
 *   client (no network): authz enforced via requireClubRole, capacity
 *   enforced on RSVP, RSVP is unique per (event_id, user_id) via upsert.
 */
import { AuthorizationError } from '@/lib/authz';
import { createClient } from '@/lib/supabase/server';
import {
    cancelEvent,
    createEvent,
    getEvent,
    listClubEvents,
    rsvpEvent,
    unrsvpEvent,
    updateEvent,
} from '@/services/eventService';
import { eventPhase, phaseLabel, type ClubEvent } from '@/types/event';

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(),
}));

jest.mock('@/lib/ai/agents/experience-director', () => ({
    handleEventCreatedSafe: jest.fn(async () => undefined),
}));

const mockCreateClient = createClient as jest.Mock;
const { handleEventCreatedSafe } = jest.requireMock(
    '@/lib/ai/agents/experience-director',
) as { handleEventCreatedSafe: jest.Mock };

// ---------------------------------------------------------------------------
// In-memory fake Supabase query builder
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

/** Column defaults the real DB applies (the fake must replicate them). */
const TABLE_DEFAULTS: Record<string, Row> = {
    events: { status: 'draft', timezone: 'UTC', description: null, capacity: null },
    event_rsvps: { status: 'going' },
};

class FakeQuery {
    private filters: Array<(r: Row) => boolean> = [];
    private orderSpec?: { col: string; asc: boolean };
    private limitN?: number;
    private pendingInsert?: Row[];
    private pendingUpsert?: Row[];
    private pendingUpdate?: Row;
    private pendingDelete = false;

    constructor(
        private rows: Row[],
        private table: string,
    ) {}

    select(): this {
        return this;
    }
    eq(col: string, val: unknown): this {
        this.filters.push((r) => r[col] === val);
        return this;
    }
    in(col: string, vals: unknown[]): this {
        this.filters.push((r) => vals.includes(r[col]));
        return this;
    }
    gte(col: string, val: string): this {
        this.filters.push((r) => String(r[col]) >= val);
        return this;
    }
    lte(col: string, val: string): this {
        this.filters.push((r) => String(r[col]) <= val);
        return this;
    }
    order(col: string, opts: { ascending: boolean }): this {
        this.orderSpec = { col, asc: opts.ascending };
        return this;
    }
    limit(n: number): this {
        this.limitN = n;
        return this;
    }
    insert(input: Row | Row[]): this {
        const arr = Array.isArray(input) ? input : [input];
        this.pendingInsert = arr.map((r, i) => ({
            id: `${this.table}_${this.rows.length + i + 1}`,
            created_at: new Date().toISOString(),
            ...(TABLE_DEFAULTS[this.table] ?? {}),
            ...r,
        }));
        this.rows.push(...this.pendingInsert);
        return this;
    }
    upsert(input: Row | Row[], opts?: { onConflict?: string }): this {
        const arr = Array.isArray(input) ? input : [input];
        const conflictCols = (opts?.onConflict ?? 'id').split(',').map((s) => s.trim());
        this.pendingUpsert = [];
        for (const r of arr) {
            const existing = this.rows.find((row) =>
                conflictCols.every((c) => row[c] === r[c]),
            );
            if (existing) {
                Object.assign(existing, r);
                this.pendingUpsert.push(existing);
            } else {
                const created = {
                    id: `${this.table}_${this.rows.length + 1}`,
                    created_at: new Date().toISOString(),
                    ...r,
                };
                this.rows.push(created);
                this.pendingUpsert.push(created);
            }
        }
        return this;
    }
    update(patch: Row): this {
        this.pendingUpdate = patch;
        return this;
    }
    delete(): this {
        this.pendingDelete = true;
        return this;
    }

    private apply(): Row[] {
        let rows = this.rows.filter((r) => this.filters.every((f) => f(r)));
        if (this.orderSpec) {
            const { col, asc } = this.orderSpec;
            rows = [...rows].sort(
                (a, b) => (asc ? 1 : -1) * String(a[col]).localeCompare(String(b[col])),
            );
        }
        return this.limitN === undefined ? rows : rows.slice(0, this.limitN);
    }

    private execWrite(): Row[] {
        const targets = this.apply();
        if (this.pendingUpdate) {
            for (const r of targets) Object.assign(r, this.pendingUpdate);
            return targets;
        }
        if (this.pendingDelete) {
            const remaining = this.rows.filter((r) => !targets.includes(r));
            this.rows.length = 0;
            this.rows.push(...remaining);
            return targets;
        }
        return [];
    }

    async single(): Promise<{ data: Row | null; error: unknown }> {
        if (this.pendingInsert) return { data: this.pendingInsert[0] ?? null, error: null };
        if (this.pendingUpsert) return { data: this.pendingUpsert[0] ?? null, error: null };
        if (this.pendingUpdate || this.pendingDelete) {
            const out = this.execWrite();
            return { data: out[0] ?? null, error: null };
        }
        const rows = this.apply();
        return rows.length === 1
            ? { data: rows[0], error: null }
            : { data: null, error: { message: 'no rows' } };
    }

    async maybeSingle(): Promise<{ data: Row | null; error: null }> {
        return { data: this.apply()[0] ?? null, error: null };
    }

    then<TResult>(
        onfulfilled?: (
            value: { data: Row[]; error: null; count: number },
        ) => TResult | PromiseLike<TResult>,
    ): Promise<TResult> {
        // Awaiting the builder executes pending writes (supabase-js behavior).
        if (this.pendingUpdate || this.pendingDelete) this.execWrite();
        const rows = this.apply();
        return Promise.resolve({ data: rows, error: null, count: rows.length }).then(
            onfulfilled,
        );
    }
}

interface Seed {
    users: Row[];
    users_clubs: Row[];
    clubs: Row[];
    events: Row[];
    event_rsvps: Row[];
}

function seedDb(seed: Partial<Seed> = {}) {
    const store: Record<string, Row[]> = {
        users: seed.users ?? [],
        users_clubs: seed.users_clubs ?? [],
        clubs: seed.clubs ?? [],
        events: seed.events ?? [],
        event_rsvps: seed.event_rsvps ?? [],
    };
    mockCreateClient.mockResolvedValue({
        from: jest.fn((table: string) => new FakeQuery(store[table] ?? [], table)),
    });
    return store;
}

const CLUB_ID = 'club-1';
const OWNER_ID = 'user-owner';
const MEMBER_ID = 'user-member';

function seedClub(roleFor: Record<string, string> = { [OWNER_ID]: 'owner', [MEMBER_ID]: 'member' }) {
    return seedDb({
        users: Object.keys(roleFor).map((id) => ({ id, role: 'user' })),
        users_clubs: Object.entries(roleFor).map(([user_id, role]) => ({
            user_id,
            club_id: CLUB_ID,
            role,
        })),
        clubs: [{ id: CLUB_ID, creator: 'someone-else', name: 'Club' }],
    });
}

function futureEvent(overrides: Partial<ClubEvent> = {}): Row {
    const now = Date.now();
    return {
        id: 'event-1',
        club_id: CLUB_ID,
        title: 'Taller de salsa',
        description: 'Aprende los pasos básicos',
        starts_at: new Date(now + 3600_000).toISOString(),
        ends_at: new Date(now + 7200_000).toISOString(),
        timezone: 'America/Havana',
        capacity: null,
        status: 'draft',
        created_by: OWNER_ID,
        created_at: new Date().toISOString(),
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// eventPhase — pure derivation, all 4 phases + boundaries
// ---------------------------------------------------------------------------

describe('eventPhase', () => {
    const base = {
        starts_at: '2026-10-20T18:00:00.000Z',
        ends_at: '2026-10-20T20:00:00.000Z',
    };

    test('PRE_EVENT when now < starts_at', () => {
        expect(eventPhase(base, new Date('2026-10-20T17:59:59.999Z'))).toBe('PRE_EVENT');
    });

    test('LIVE at the exact starts_at boundary', () => {
        expect(eventPhase(base, new Date('2026-10-20T18:00:00.000Z'))).toBe('LIVE');
    });

    test('LIVE during the event', () => {
        expect(eventPhase(base, new Date('2026-10-20T19:00:00.000Z'))).toBe('LIVE');
    });

    test('LIVE at the exact ends_at boundary', () => {
        expect(eventPhase(base, new Date('2026-10-20T20:00:00.000Z'))).toBe('LIVE');
    });

    test('POST_EVENT just after ends_at', () => {
        expect(eventPhase(base, new Date('2026-10-20T20:00:00.001Z'))).toBe('POST_EVENT');
    });

    test('POST_EVENT 6 days after ends_at', () => {
        expect(eventPhase(base, new Date('2026-10-26T19:59:59.999Z'))).toBe('POST_EVENT');
    });

    test('EXPIRED exactly 7 days after ends_at', () => {
        expect(eventPhase(base, new Date('2026-10-27T20:00:00.000Z'))).toBe('EXPIRED');
    });

    test('EXPIRED long after', () => {
        expect(eventPhase(base, new Date('2027-01-01T00:00:00.000Z'))).toBe('EXPIRED');
    });

    test('phaseLabel is Spanish-first', () => {
        expect(phaseLabel('PRE_EVENT')).toBe('Próximo');
        expect(phaseLabel('LIVE')).toBe('En vivo');
        expect(phaseLabel('POST_EVENT')).toBe('Finalizado');
        expect(phaseLabel('EXPIRED')).toBe('Finalizado');
    });
});

// ---------------------------------------------------------------------------
// createEvent / updateEvent / cancelEvent — auth + validation
// ---------------------------------------------------------------------------

describe('createEvent', () => {
    beforeEach(() => jest.clearAllMocks());

    const input = {
        club_id: CLUB_ID,
        title: 'Taller de salsa',
        description: 'Aprende los pasos básicos',
        starts_at: new Date(Date.now() + 3600_000).toISOString(),
        ends_at: new Date(Date.now() + 7200_000).toISOString(),
        timezone: 'America/Havana',
        capacity: 30,
    };

    test('owner can create; fires event_created → announcement draft (fire-and-forget)', async () => {
        seedClub();
        const event = await createEvent(input, OWNER_ID);
        expect(event.title).toBe('Taller de salsa');
        expect(event.status).toBe('draft');
        expect(handleEventCreatedSafe).toHaveBeenCalledWith(event.id);
    });

    test('member (non-staff) cannot create', async () => {
        seedClub();
        await expect(createEvent(input, MEMBER_ID)).rejects.toBeInstanceOf(AuthorizationError);
    });

    test('non-member cannot create', async () => {
        seedClub();
        await expect(createEvent(input, 'stranger')).rejects.toBeInstanceOf(AuthorizationError);
    });

    test('rejects ends_at before starts_at', async () => {
        seedClub();
        await expect(
            createEvent({ ...input, ends_at: input.starts_at }, OWNER_ID),
        ).rejects.toThrow(/ends_at/i);
    });

    test('rejects non-positive capacity', async () => {
        seedClub();
        await expect(createEvent({ ...input, capacity: 0 }, OWNER_ID)).rejects.toThrow(
            /capacity/i,
        );
    });
});

describe('updateEvent / cancelEvent', () => {
    beforeEach(() => jest.clearAllMocks());

    test('owner can update; member cannot', async () => {
        seedClub();
        const store = seedDb({
            users: [{ id: OWNER_ID, role: 'user' }, { id: MEMBER_ID, role: 'user' }],
            users_clubs: [
                { user_id: OWNER_ID, club_id: CLUB_ID, role: 'owner' },
                { user_id: MEMBER_ID, club_id: CLUB_ID, role: 'member' },
            ],
            clubs: [{ id: CLUB_ID, creator: 'x', name: 'Club' }],
            events: [futureEvent()],
        });
        void store;
        const updated = await updateEvent('event-1', { title: 'Nuevo título' }, OWNER_ID);
        expect(updated.title).toBe('Nuevo título');
        await expect(updateEvent('event-1', { title: 'Hack' }, MEMBER_ID)).rejects.toBeInstanceOf(
            AuthorizationError,
        );
    });

    test('cancelEvent sets status=cancelled', async () => {
        seedClub();
        seedDb({
            users: [{ id: OWNER_ID, role: 'user' }],
            users_clubs: [{ user_id: OWNER_ID, club_id: CLUB_ID, role: 'owner' }],
            clubs: [{ id: CLUB_ID, creator: 'x', name: 'Club' }],
            events: [futureEvent({ status: 'published' })],
        });
        const cancelled = await cancelEvent('event-1', OWNER_ID);
        expect(cancelled.status).toBe('cancelled');
    });

    test('update of a missing event throws', async () => {
        seedClub();
        await expect(updateEvent('missing', { title: 'x' }, OWNER_ID)).rejects.toThrow();
    });
});

// ---------------------------------------------------------------------------
// rsvpEvent — member+, capacity, uniqueness
// ---------------------------------------------------------------------------

describe('rsvpEvent', () => {
    beforeEach(() => jest.clearAllMocks());

    function seedWithEvent(event: Row, rsvps: Row[] = []) {
        return seedDb({
            users: [{ id: OWNER_ID, role: 'user' }, { id: MEMBER_ID, role: 'user' }],
            users_clubs: [
                { user_id: OWNER_ID, club_id: CLUB_ID, role: 'owner' },
                { user_id: MEMBER_ID, club_id: CLUB_ID, role: 'member' },
            ],
            clubs: [{ id: CLUB_ID, creator: 'x', name: 'Club' }],
            events: [event],
            event_rsvps: rsvps,
        });
    }

    test('member can RSVP going', async () => {
        seedWithEvent(futureEvent({ status: 'published' }));
        const rsvp = await rsvpEvent('event-1', MEMBER_ID, 'going');
        expect(rsvp.status).toBe('going');
        expect(rsvp.event_id).toBe('event-1');
        expect(rsvp.user_id).toBe(MEMBER_ID);
    });

    test('non-member cannot RSVP', async () => {
        seedWithEvent(futureEvent({ status: 'published' }));
        await expect(rsvpEvent('event-1', 'stranger', 'going')).rejects.toBeInstanceOf(
            AuthorizationError,
        );
    });

    test('RSVP is unique per (event_id, user_id): re-RSVP updates the row, not a new one', async () => {
        const store = seedWithEvent(futureEvent({ status: 'published' }));
        await rsvpEvent('event-1', MEMBER_ID, 'going');
        const updated = await rsvpEvent('event-1', MEMBER_ID, 'interested');
        expect(updated.status).toBe('interested');
        expect(store.event_rsvps.filter((r) => r.user_id === MEMBER_ID)).toHaveLength(1);
    });

    test('capacity enforced: going past capacity throws', async () => {
        seedWithEvent(futureEvent({ status: 'published', capacity: 1 }), [
            { id: 'rsvp-other', event_id: 'event-1', user_id: OWNER_ID, status: 'going' },
        ]);
        await expect(rsvpEvent('event-1', MEMBER_ID, 'going')).rejects.toThrow(/lleno/i);
    });

    test('interested does not consume capacity', async () => {
        seedWithEvent(futureEvent({ status: 'published', capacity: 1 }), [
            { id: 'rsvp-other', event_id: 'event-1', user_id: OWNER_ID, status: 'going' },
        ]);
        const rsvp = await rsvpEvent('event-1', MEMBER_ID, 'interested');
        expect(rsvp.status).toBe('interested');
    });

    test('unrsvp removes the row', async () => {
        const store = seedWithEvent(futureEvent({ status: 'published' }), [
            { id: 'rsvp-1', event_id: 'event-1', user_id: MEMBER_ID, status: 'going' },
        ]);
        await unrsvpEvent('event-1', MEMBER_ID);
        expect(store.event_rsvps).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// getEvent / listClubEvents
// ---------------------------------------------------------------------------

describe('getEvent / listClubEvents', () => {
    beforeEach(() => jest.clearAllMocks());

    test('getEvent returns attendee_count and my_rsvp', async () => {
        seedDb({
            users: [{ id: MEMBER_ID, role: 'user' }],
            users_clubs: [{ user_id: MEMBER_ID, club_id: CLUB_ID, role: 'member' }],
            clubs: [{ id: CLUB_ID, creator: 'x', name: 'Club' }],
            events: [futureEvent({ status: 'published' })],
            event_rsvps: [
                { id: 'r1', event_id: 'event-1', user_id: MEMBER_ID, status: 'going' },
                { id: 'r2', event_id: 'event-1', user_id: 'other', status: 'going' },
                { id: 'r3', event_id: 'event-1', user_id: 'other2', status: 'interested' },
            ],
        });
        const event = await getEvent('event-1', MEMBER_ID);
        expect(event?.attendee_count).toBe(2);
        expect(event?.my_rsvp).toBe('going');
    });

    test('getEvent returns null for unknown id', async () => {
        seedDb({ events: [] });
        expect(await getEvent('missing')).toBeNull();
    });

    test('listClubEvents returns club events ordered by starts_at', async () => {
        seedDb({
            clubs: [{ id: CLUB_ID, creator: 'x', name: 'Club' }],
            events: [
                futureEvent({ id: 'e2', starts_at: new Date(Date.now() + 7200_000).toISOString() }),
                futureEvent({ id: 'e1', starts_at: new Date(Date.now() + 3600_000).toISOString() }),
            ],
        });
        const events = await listClubEvents(CLUB_ID);
        expect(events.map((e) => e.id)).toEqual(['e1', 'e2']);
    });
});
