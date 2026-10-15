/**
 * Tests for lib/ai/memory.ts — AI memory + correction feedback loops
 * (master plan Phases 63-66).
 *
 * TDD: written BEFORE the implementation (RED first).
 */
import {
    deleteMemory,
    getAgentMemories,
    recall,
    recordFeedback,
    remember,
    sanitizePII,
    summarizeMemoriesForPrompt,
    type AiFeedback,
    type AiMemory,
    type MemoryDb,
    type MemoryDeps,
    type NewAiFeedback,
    type NewAiMemory,
} from '@/lib/ai/memory';

function memoryRow(overrides: Partial<AiMemory> = {}): AiMemory {
    return {
        id: 'mem-1',
        club_id: 'club-1',
        agent_id: 'community-manager',
        key: 'correction-tone',
        value: { preference: 'keep it playful, not corporate', polarity: 'avoid' },
        source: 'correction',
        created_at: '2026-10-15T12:00:00.000Z',
        updated_at: '2026-10-15T12:00:00.000Z',
        ...overrides,
    };
}

/** In-memory MemoryDb stub that records every write. */
function stubDb(initial: AiMemory[] = []): MemoryDb & {
    insertedFeedback: NewAiFeedback[];
    upserted: NewAiMemory[];
    deleted: string[];
} {
    const rows = [...initial];
    const insertedFeedback: NewAiFeedback[] = [];
    const upserted: NewAiMemory[] = [];
    const deleted: string[] = [];
    return {
        insertedFeedback,
        upserted,
        deleted,
        async upsertMemory(row: NewAiMemory): Promise<AiMemory> {
            upserted.push(row);
            const existing = rows.find(
                (r) =>
                    r.club_id === row.club_id &&
                    r.agent_id === row.agent_id &&
                    r.key === row.key,
            );
            if (existing) {
                existing.value = row.value;
                existing.source = row.source ?? existing.source;
                existing.updated_at = new Date().toISOString();
                return existing;
            }
            const created = memoryRow({
                id: `mem-${rows.length + 1}`,
                club_id: row.club_id,
                agent_id: row.agent_id,
                key: row.key,
                value: row.value,
                source: row.source ?? 'learned',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            rows.push(created);
            return created;
        },
        async getMemory(clubId: string, agentId: string, key: string) {
            return (
                rows.find(
                    (r) =>
                        r.club_id === clubId && r.agent_id === agentId && r.key === key,
                ) ?? null
            );
        },
        async listMemories(clubId: string, agentId: string) {
            return rows.filter(
                (r) => r.club_id === clubId && r.agent_id === agentId,
            );
        },
        async deleteMemory(id: string, clubId: string) {
            const idx = rows.findIndex((r) => r.id === id && r.club_id === clubId);
            if (idx === -1) return false;
            deleted.push(id);
            rows.splice(idx, 1);
            return true;
        },
        async insertFeedback(row: NewAiFeedback): Promise<AiFeedback> {
            insertedFeedback.push(row);
            return {
                id: `fb-${insertedFeedback.length}`,
                action_id: row.action_id ?? null,
                feedback_type: row.feedback_type,
                content: row.content,
                created_by: row.created_by,
                created_at: new Date().toISOString(),
            };
        },
    };
}

function deps(db: MemoryDb): MemoryDeps {
    return { db };
}

describe('remember / recall', () => {
    it('roundtrips a memory by club/agent/key', async () => {
        const db = stubDb();
        await remember('club-1', 'community-manager', 'correction-tone', {
            preference: 'playful, not corporate',
        }, 'correction', deps(db));

        const found = await recall('club-1', 'community-manager', 'correction-tone', deps(db));
        expect(found).not.toBeNull();
        expect(found?.value).toEqual({ preference: 'playful, not corporate' });
        expect(found?.source).toBe('correction');
    });

    it('upserts: a second remember with the same key replaces the value', async () => {
        const db = stubDb();
        const d = deps(db);
        await remember('club-1', 'community-manager', 'correction-tone', { v: 1 }, 'correction', d);
        await remember('club-1', 'community-manager', 'correction-tone', { v: 2 }, 'correction', d);

        const all = await getAgentMemories('club-1', 'community-manager', d);
        expect(all).toHaveLength(1);
        expect(all[0].value).toEqual({ v: 2 });
    });

    it('scopes memories by club and agent', async () => {
        const db = stubDb();
        const d = deps(db);
        await remember('club-1', 'community-manager', 'k', { v: 1 }, 'learned', d);
        await remember('club-2', 'community-manager', 'k', { v: 2 }, 'learned', d);
        await remember('club-1', 'creator-copilot', 'k', { v: 3 }, 'learned', d);

        expect(await recall('club-1', 'community-manager', 'k', d)).toMatchObject({ value: { v: 1 } });
        expect(await recall('club-2', 'community-manager', 'k', d)).toMatchObject({ value: { v: 2 } });
        expect(await recall('club-1', 'creator-copilot', 'k', d)).toMatchObject({ value: { v: 3 } });
        expect(await recall('club-1', 'community-manager', 'missing', d)).toBeNull();
    });

    it('rejects empty identifiers', async () => {
        const db = stubDb();
        const d = deps(db);
        await expect(remember('', 'a', 'k', {}, 'learned', d)).rejects.toThrow();
        await expect(remember('c', '', 'k', {}, 'learned', d)).rejects.toThrow();
        await expect(remember('c', 'a', '', {}, 'learned', d)).rejects.toThrow();
    });

    it('getAgentMemories returns every memory for the club/agent pair', async () => {
        const db = stubDb();
        const d = deps(db);
        await remember('club-1', 'community-manager', 'correction-tone', { v: 1 }, 'correction', d);
        await remember('club-1', 'community-manager', 'correction-length', { v: 2 }, 'correction', d);

        const all = await getAgentMemories('club-1', 'community-manager', d);
        expect(all.map((m) => m.key).sort()).toEqual([
            'correction-length',
            'correction-tone',
        ]);
    });
});

describe('recordFeedback', () => {
    it('logs the feedback row and creates a memory from a correction', async () => {
        const db = stubDb();
        const result = await recordFeedback(
            {
                clubId: 'club-1',
                agentId: 'community-manager',
                type: 'correction',
                content: 'Too long — keep announcements under 100 words.',
                userId: 'user-1',
            },
            deps(db),
        );

        expect(db.insertedFeedback).toHaveLength(1);
        expect(db.insertedFeedback[0]).toMatchObject({
            feedback_type: 'correction',
            content: 'Too long — keep announcements under 100 words.',
            created_by: 'user-1',
        });

        expect(result.memory).not.toBeNull();
        expect(result.memory?.source).toBe('correction');
        expect(result.memory?.key).toContain('length');
        const stored = await recall(
            'club-1',
            'community-manager',
            result.memory!.key,
            deps(db),
        );
        expect(stored).not.toBeNull();
        // The agent will not repeat the mistake: the memory is prompt-ready.
        expect(JSON.stringify(stored?.value)).toMatch(/100 words|short/i);
    });

    it('extracts a "prefer" memory from correction feedback', async () => {
        const db = stubDb();
        const result = await recordFeedback(
            {
                clubId: 'club-1',
                agentId: 'experience-director',
                type: 'correction',
                content: 'I prefer a playful tone, not a corporate one.',
                userId: 'user-1',
            },
            deps(db),
        );

        expect(result.memory?.key).toContain('tone');
        expect(result.memory?.value).toMatchObject({ polarity: 'prefer' });
    });

    it('records praise and stores it as a learned memory', async () => {
        const db = stubDb();
        const result = await recordFeedback(
            {
                clubId: 'club-1',
                agentId: 'creator-copilot',
                type: 'praise',
                content: 'Love the short titles you suggested.',
                userId: 'user-1',
            },
            deps(db),
        );

        expect(db.insertedFeedback[0].feedback_type).toBe('praise');
        expect(result.memory?.source).toBe('learned');
        expect(result.memory?.key).toContain('title');
    });

    it('records a flag without creating a memory', async () => {
        const db = stubDb();
        const result = await recordFeedback(
            {
                clubId: 'club-1',
                agentId: 'community-manager',
                type: 'flag',
                content: 'This draft felt off-topic.',
                userId: 'user-1',
            },
            deps(db),
        );

        expect(db.insertedFeedback).toHaveLength(1);
        expect(result.memory).toBeNull();
        expect(
            await getAgentMemories('club-1', 'community-manager', deps(db)),
        ).toHaveLength(0);
    });

    it('does not create a memory when the feedback content is empty', async () => {
        const db = stubDb();
        const result = await recordFeedback(
            {
                clubId: 'club-1',
                agentId: 'community-manager',
                type: 'correction',
                content: '   ',
                userId: 'user-1',
            },
            deps(db),
        );

        expect(db.insertedFeedback).toHaveLength(1);
        expect(result.memory).toBeNull();
    });

    it('links the optional actionId to the feedback row', async () => {
        const db = stubDb();
        await recordFeedback(
            {
                actionId: 'action-9',
                clubId: 'club-1',
                agentId: 'community-manager',
                type: 'praise',
                content: 'Great welcome message.',
                userId: 'user-1',
            },
            deps(db),
        );
        expect(db.insertedFeedback[0].action_id).toBe('action-9');
    });

    it('rejects invalid feedback types', async () => {
        const db = stubDb();
        await expect(
            recordFeedback(
                {
                    clubId: 'club-1',
                    agentId: 'community-manager',
                    // @ts-expect-error intentional invalid type
                    type: 'dislike',
                    content: 'no',
                    userId: 'user-1',
                },
                deps(db),
            ),
        ).rejects.toThrow();
    });
});

describe('PII hygiene', () => {
    it('sanitizePII redacts emails and phone numbers', () => {
        expect(sanitizePII('write to juan@example.com please')).toContain('[redacted-email]');
        expect(sanitizePII('write to juan@example.com please')).not.toContain('juan@example.com');
        expect(sanitizePII('call +1 555 123 4567 now')).toContain('[redacted-phone]');
        expect(sanitizePII('call +1 555 123 4567 now')).not.toContain('555 123 4567');
    });

    it('never stores raw emails in a correction memory', async () => {
        const db = stubDb();
        const result = await recordFeedback(
            {
                clubId: 'club-1',
                agentId: 'community-manager',
                type: 'correction',
                content: 'Too formal — write like you do for maria@example.com, more casual.',
                userId: 'user-1',
            },
            deps(db),
        );
        const serialized = JSON.stringify(result.memory?.value);
        expect(serialized).not.toContain('maria@example.com');
        expect(serialized).toContain('[redacted-email]');
    });
});

describe('deleteMemory', () => {
    it('removes the memory so creators can curate what the AI remembers', async () => {
        const db = stubDb();
        const d = deps(db);
        const created = await remember('club-1', 'community-manager', 'correction-tone', { v: 1 }, 'correction', d);

        expect(await deleteMemory(created.id, 'club-1', d)).toBe(true);
        expect(await recall('club-1', 'community-manager', 'correction-tone', d)).toBeNull();
    });

    it('does not delete a memory that belongs to another club', async () => {
        const db = stubDb();
        const d = deps(db);
        const created = await remember('club-1', 'community-manager', 'k', { v: 1 }, 'learned', d);

        expect(await deleteMemory(created.id, 'club-2', d)).toBe(false);
        expect(await recall('club-1', 'community-manager', 'k', d)).not.toBeNull();
    });

    it('returns false for an unknown id', async () => {
        const db = stubDb();
        expect(await deleteMemory('nope', 'club-1', deps(db))).toBe(false);
    });
});

describe('summarizeMemoriesForPrompt', () => {
    it('says so explicitly when there are no memories', () => {
        expect(summarizeMemoriesForPrompt([])).toMatch(/no learned memories/i);
    });

    it('renders every memory as a prompt-safe line', () => {
        const out = summarizeMemoriesForPrompt([
            memoryRow(),
            memoryRow({
                id: 'mem-2',
                key: 'praise-title',
                value: { preference: 'short punchy titles', polarity: 'prefer' },
                source: 'learned',
            }),
        ]);
        expect(out).toContain('correction-tone');
        expect(out).toContain('praise-title');
        expect(out).toContain('short punchy titles');
        expect(out).toMatch(/correction|learned/);
    });
});
