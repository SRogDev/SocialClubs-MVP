import { createClient } from '@/lib/supabase/server'
import { pineconeRagProvider } from '@/services/pineconeRagProvider'
import { extractTextFromRagSource } from '@/services/ragExtractionService'
import { createAdminClient } from '@/lib/supabase/admin'

export interface RagChunk {
    id: string
    content: string
    score?: number
    source?: string
}

export interface RagIngestionInput {
    sourceId?: string
    clubId: string
    uploadedBy?: string
    sourceName: string
    mimeType: string
    fileSizeBytes: number
    storagePath: string
}

const MAX_CLUB_RAG_BYTES = 1024 * 1024 * 1024

export function getClubRagMaxBytes() {
    return MAX_CLUB_RAG_BYTES
}

export async function getClubRagUsageBytes(clubId: string): Promise<number> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('club_rag_sources')
        .select('file_size_bytes')
        .eq('club_id', clubId)

    if (error || !data) return 0
    return data.reduce((acc: number, row: { file_size_bytes: number }) => acc + Number(row.file_size_bytes || 0), 0)
}

export async function createRagSource(input: RagIngestionInput): Promise<{ id: string }> {
    const supabase = createAdminClient()

    if (!input.uploadedBy) {
        throw new Error('uploadedBy is required')
    }

    const currentUsage = await getClubRagUsageBytes(input.clubId)
    if (currentUsage + input.fileSizeBytes > MAX_CLUB_RAG_BYTES) {
        throw new Error('Club RAG quota exceeded (1GB)')
    }

    const { data, error } = await supabase
        .from('club_rag_sources')
        .insert({
            club_id: input.clubId,
            uploaded_by: input.uploadedBy,
            source_name: input.sourceName,
            mime_type: input.mimeType,
            file_size_bytes: input.fileSizeBytes,
            storage_path: input.storagePath,
            provider: 'pinecone',
            status: 'queued',
        })
        .select('id')
        .single()

    if (error || !data) {
        throw new Error(`Failed creating RAG source: ${error?.message ?? 'unknown error'}`)
    }

    return { id: data.id }
}

export async function markRagSourceStatus(
    sourceId: string,
    status: 'queued' | 'processing' | 'ready' | 'failed',
    errorMessage?: string
): Promise<void> {
    const supabase = createAdminClient()
    const { error } = await supabase
        .from('club_rag_sources')
        .update({
            status,
            error_message: errorMessage || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', sourceId)

    if (error) {
        throw new Error(`Failed to update RAG source status: ${error.message}`)
    }
}

export async function getRagSourceById(sourceId: string): Promise<{
    id: string
    club_id: string
    source_name: string
    storage_path: string
    mime_type: string
} | null> {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('club_rag_sources')
        .select('id, club_id, source_name, storage_path, mime_type')
        .eq('id', sourceId)
        .single()

    if (error) {
        return null
    }

    return data
}

function chunkText(input: string, chunkSize = 1200): string[] {
    const normalized = input.replace(/\s+/g, ' ').trim()
    if (!normalized) return []
    const chunks: string[] = []
    for (let index = 0; index < normalized.length; index += chunkSize) {
        chunks.push(normalized.slice(index, index + chunkSize))
    }
    return chunks
}

async function loadSourceText(storagePath: string, sourceName: string): Promise<string> {
    if (storagePath.startsWith('inline://')) {
        return decodeURIComponent(storagePath.replace('inline://', ''))
    }
    return `Source: ${sourceName}. Storage path: ${storagePath}`
}

async function clearRagChunksBySource(sourceId: string): Promise<void> {
    const supabase = createAdminClient()

    const { data, error } = await supabase
        .from('club_rag_chunks')
        .select('id')
        .eq('source_id', sourceId)

    if (error) {
        throw new Error(`Failed loading source chunks: ${error.message}`)
    }

    const chunkIds = (data ?? []).map((row: { id: string }) => row.id)
    await pineconeRagProvider.deleteChunks(chunkIds)

    const { error: deleteError } = await supabase
        .from('club_rag_chunks')
        .delete()
        .eq('source_id', sourceId)

    if (deleteError) {
        throw new Error(`Failed deleting source chunks: ${deleteError.message}`)
    }
}

export async function processRagIngestion(sourceId: string): Promise<{ chunks: number }> {
    const source = await getRagSourceById(sourceId)
    if (!source) {
        throw new Error('RAG source not found')
    }

    await markRagSourceStatus(sourceId, 'processing')

    try {
        await clearRagChunksBySource(sourceId)
        const text = await extractTextFromRagSource({
            storagePath: source.storage_path,
            sourceName: source.source_name,
            mimeType: source.mime_type,
        })
        const chunks = chunkText(text)
        const supabase = createAdminClient()

        for (let index = 0; index < chunks.length; index += 1) {
            const content = chunks[index]
            const chunkInsert = await supabase
                .from('club_rag_chunks')
                .insert({
                    club_id: source.club_id,
                    source_id: source.id,
                    chunk_index: index,
                    content,
                    embedding_provider: 'pinecone',
                    metadata: { mimeType: source.mime_type },
                })
                .select('id')
                .single()

            if (chunkInsert.error || !chunkInsert.data) {
                throw new Error(`Failed to insert chunk: ${chunkInsert.error?.message ?? 'unknown'}`)
            }

            const vectorRef = await pineconeRagProvider.upsertChunk({
                sourceId: source.id,
                chunkId: chunkInsert.data.id,
                content,
                metadata: {
                    clubId: source.club_id,
                    sourceId: source.id,
                },
            })

            const updateChunk = await supabase
                .from('club_rag_chunks')
                .update({ embedding_ref: vectorRef.ref })
                .eq('id', chunkInsert.data.id)

            if (updateChunk.error) {
                throw new Error(`Failed to update chunk vector ref: ${updateChunk.error.message}`)
            }
        }

        await markRagSourceStatus(sourceId, 'ready')
        return { chunks: chunks.length }
    } catch (error) {
        await markRagSourceStatus(sourceId, 'failed', error instanceof Error ? error.message : 'unknown error')
        throw error
    }
}

export async function deleteRagSource(sourceId: string): Promise<void> {
    const supabase = createAdminClient()
    await clearRagChunksBySource(sourceId)

    const { error } = await supabase
        .from('club_rag_sources')
        .delete()
        .eq('id', sourceId)

    if (error) {
        throw new Error(`Failed deleting RAG source: ${error.message}`)
    }
}

export async function reindexRagSource(sourceId: string): Promise<{ chunks: number }> {
    return processRagIngestion(sourceId)
}

export async function retrieveClubRagContext(clubId: string, query: string, limit = 5): Promise<RagChunk[]> {
    const supabase = await createClient()
    const normalizedQuery = query.trim().toLowerCase()

    try {
        const { data, error } = await supabase
            .from('club_rag_chunks')
            .select('id, content, source_name')
            .eq('club_id', clubId)
            .limit(limit)

        if (error || !data) {
            return []
        }

        const scored = data
            .map((row: { id: string; content: string; source_name?: string }) => {
                const content = row.content || ''
                const score = normalizedQuery
                    ? Number(content.toLowerCase().includes(normalizedQuery))
                    : 0
                return {
                    id: row.id,
                    content,
                    source: row.source_name,
                    score,
                }
            })
            .sort((a, b) => (b.score || 0) - (a.score || 0))

        return scored.map((row) => ({
            id: row.id,
            content: row.content,
            source: row.source,
        }))
    } catch {
        return []
    }
}

export async function queueClubRagIngestion(input: RagIngestionInput): Promise<{ accepted: boolean; reason?: string }> {
    if (input.fileSizeBytes > MAX_CLUB_RAG_BYTES) {
        return { accepted: false, reason: 'File exceeds 1GB limit per upload' }
    }

    return { accepted: true }
}
