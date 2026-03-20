import { z } from 'zod'

export const ragUploadRequestSchema = z.object({
    clubId: z.string().uuid('clubId inválido'),
    sourceName: z.string().min(1).max(255),
    mimeType: z.string().min(3).max(120),
    fileSizeBytes: z.number().int().positive(),
    storagePath: z.string().min(3).max(1024),
    rawText: z.string().max(500000).optional(),
})

export const ragIngestionJobSchema = z.object({
    sourceId: z.string().uuid(),
    clubId: z.string().uuid(),
    requestedBy: z.string().uuid(),
    triggeredAt: z.number().int().positive(),
})

export type RagUploadRequest = z.infer<typeof ragUploadRequestSchema>
export type RagIngestionJobPayload = z.infer<typeof ragIngestionJobSchema>
