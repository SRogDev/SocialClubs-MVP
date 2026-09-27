/**
 * Compress an image file in the browser using canvas.
 * Resizes to `maxWidth` (keeping aspect ratio) and re-encodes as JPEG.
 */
export async function compressImage(
  file: File,
  quality = 0.8,
  maxWidth = 1920
): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  )
  if (!blob) {
    return file
  }

  const name = `${file.name.replace(/\.[a-zA-Z0-9]+$/, "")  }.jpg`
  return new File([blob], name, { type: "image/jpeg" })
}
