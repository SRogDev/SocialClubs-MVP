export interface UpsertRagChunkInput {
    sourceId: string
    chunkId: string
    content: string
    metadata?: Record<string, unknown>
}

export interface RagVectorProvider {
    upsertChunk(input: UpsertRagChunkInput): Promise<{ ref: string }>
    deleteChunks(chunkIds: string[]): Promise<void>
}

class PineconeRagProvider implements RagVectorProvider {
    private readonly apiKey = process.env.PINECONE_API_KEY
    private readonly host = process.env.PINECONE_INDEX_HOST

    async upsertChunk(input: UpsertRagChunkInput): Promise<{ ref: string }> {
        if (!this.apiKey || !this.host) {
            return { ref: `mock:${input.chunkId}` }
        }

        const embedding = this.mockEmbedding(input.content)
        const response = await fetch(`https://${this.host}/vectors/upsert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': this.apiKey,
            },
            body: JSON.stringify({
                vectors: [
                    {
                        id: input.chunkId,
                        values: embedding,
                        metadata: {
                            sourceId: input.sourceId,
                            ...input.metadata,
                        },
                    },
                ],
            }),
        })

        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`Pinecone upsert failed: ${response.status} ${errorBody}`)
        }

        return { ref: `pinecone:${input.chunkId}` }
    }

    async deleteChunks(chunkIds: string[]): Promise<void> {
        if (chunkIds.length === 0) return

        if (!this.apiKey || !this.host) {
            return
        }

        const response = await fetch(`https://${this.host}/vectors/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': this.apiKey,
            },
            body: JSON.stringify({
                ids: chunkIds,
            }),
        })

        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`Pinecone delete failed: ${response.status} ${errorBody}`)
        }
    }

    private mockEmbedding(content: string): number[] {
        const size = 16
        const arr = new Array<number>(size).fill(0)
        for (let i = 0; i < content.length; i += 1) {
            arr[i % size] += content.charCodeAt(i) / 255
        }
        return arr
    }
}

export const pineconeRagProvider = new PineconeRagProvider()
