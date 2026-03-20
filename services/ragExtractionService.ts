import { createAdminClient } from '@/lib/supabase/admin'

function decodeUtf8(buffer: ArrayBuffer): string {
    return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer))
}

function sanitizePdfText(raw: string): string {
    return raw
        .replace(/\r/g, '\n')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function stripHtmlTags(raw: string): string {
    return raw
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function parseStoragePath(storagePath: string): { bucket: string; path: string } | null {
    if (!storagePath || storagePath.startsWith('inline://') || storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
        return null
    }

    if (storagePath.includes(':')) {
        const [bucket, ...rest] = storagePath.split(':')
        const path = rest.join(':').replace(/^\/+/, '')
        if (!bucket || !path) return null
        return { bucket, path }
    }

    const normalized = storagePath.replace(/^\/+/, '')
    const [bucket, ...rest] = normalized.split('/')
    if (!bucket || rest.length === 0) return null
    return { bucket, path: rest.join('/') }
}

async function downloadStorageObject(storagePath: string): Promise<ArrayBuffer> {
    const parsed = parseStoragePath(storagePath)
    if (!parsed) {
        throw new Error('storagePath must be bucket:path or bucket/path for non-inline sources')
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.path)

    if (error || !data) {
        throw new Error(`Failed downloading source from storage: ${error?.message ?? 'unknown error'}`)
    }

    return data.arrayBuffer()
}

export async function extractTextFromRagSource(input: {
    storagePath: string
    sourceName: string
    mimeType: string
}): Promise<string> {
    if (input.storagePath.startsWith('inline://')) {
        return decodeURIComponent(input.storagePath.replace('inline://', ''))
    }

    if (input.storagePath.startsWith('http://') || input.storagePath.startsWith('https://')) {
        const response = await fetch(input.storagePath)
        if (!response.ok) {
            throw new Error(`Failed downloading URL source: ${response.status}`)
        }
        const buffer = await response.arrayBuffer()
        return extractTextByMime(input.mimeType, buffer, input.sourceName)
    }

    const buffer = await downloadStorageObject(input.storagePath)
    return extractTextByMime(input.mimeType, buffer, input.sourceName)
}

function extractTextByMime(mimeType: string, buffer: ArrayBuffer, sourceName: string): string {
    const lower = mimeType.toLowerCase()

    if (
        lower.startsWith('text/') ||
        lower === 'application/json' ||
        lower === 'application/xml' ||
        lower === 'application/x-yaml' ||
        lower === 'application/yaml'
    ) {
        const text = decodeUtf8(buffer)
        if (lower === 'text/html' || lower === 'application/xhtml+xml') {
            return stripHtmlTags(text)
        }
        return text
    }

    if (lower === 'application/pdf') {
        const roughText = decodeUtf8(buffer)
        const cleaned = sanitizePdfText(roughText)
        if (cleaned.length > 0) return cleaned
        return `PDF source ${sourceName}: no se pudo extraer texto legible con extractor básico.`
    }

    if (lower.startsWith('audio/') || lower.startsWith('video/')) {
        return `Media source ${sourceName} (${mimeType}). Se requiere pipeline de transcripción para contenido semántico completo.`
    }

    if (lower.startsWith('image/')) {
        return `Image source ${sourceName} (${mimeType}). Se requiere OCR para extracción semántica completa.`
    }

    return `Binary source ${sourceName} (${mimeType}). Extraer texto requiere parser específico por formato.`
}
