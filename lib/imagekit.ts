/**
 * ImageKit server-side utilities
 * Docs: https://imagekit.io/docs/integration/nextjs
 */
import { getUploadAuthParams } from '@imagekit/next/server'

export const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!
export const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!
export const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY!

/** Folders used in ImageKit — mirrors the sections documented in IMAGEKIT_SETUP.md */
export const IK_FOLDERS = {
    avatars: '/avatars',
    clubLogos: '/clubs/logos',
    clubCovers: '/clubs/covers',
    postImages: '/posts/images',
    postThumbnails: '/posts/thumbnails',
} as const

/**
 * Generate upload auth params for client-side or server-side uploads.
 * Returns token, expire, signature, and publicKey.
 */
export function generateUploadAuthParams() {
    return getUploadAuthParams({
        privateKey: IMAGEKIT_PRIVATE_KEY,
        publicKey: IMAGEKIT_PUBLIC_KEY,
    })
}

/**
 * Server-side image upload to ImageKit via REST API.
 * Use this from Server Actions where you have a File/Blob object.
 *
 * @param file  - File or Blob to upload
 * @param fileName - Desired file name (will be unique-ified by ImageKit)
 * @param folder  - Target folder (use IK_FOLDERS constants)
 * @returns { url, fileId, name } from ImageKit response
 */
export async function uploadToImageKit(
    file: File | Blob,
    fileName: string,
    folder: string
): Promise<{ url: string; fileId: string; name: string }> {
    const { token, expire, signature } = generateUploadAuthParams()

    const body = new FormData()
    body.append('file', file)
    body.append('fileName', fileName)
    body.append('folder', folder)
    body.append('useUniqueFileName', 'true')
    body.append('token', token)
    body.append('expire', expire.toString())
    body.append('signature', signature)
    body.append('publicKey', IMAGEKIT_PUBLIC_KEY)

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body,
    })

    if (!response.ok) {
        const err = await response.text()
        throw new Error(`ImageKit upload failed (${response.status}): ${err}`)
    }

    const data = await response.json()
    return { url: data.url, fileId: data.fileId, name: data.name }
}

/**
 * Build an optimized ImageKit URL from a stored path or URL.
 * Useful for generating thumbnails and resized variants server-side.
 */
export function buildImageKitUrl(
    src: string,
    options: { width?: number; height?: number; quality?: number; format?: 'auto' | 'webp' | 'avif' } = {}
): string {
    if (!src) return ''

    // If it's already a full IK url, just return as-is (transformations handled by Image component)
    if (src.startsWith('https://ik.imagekit.io')) return src

    const base = IMAGEKIT_URL_ENDPOINT.replace(/\/$/, '')
    const path = src.startsWith('/') ? src : `/${src}`

    const transforms: string[] = []
    if (options.width) transforms.push(`w-${options.width}`)
    if (options.height) transforms.push(`h-${options.height}`)
    if (options.quality) transforms.push(`q-${options.quality}`)
    if (options.format) transforms.push(`f-${options.format}`)

    const trStr = transforms.length ? `?tr=${transforms.join(',')}` : ''
    return `${base}${path}${trStr}`
}
