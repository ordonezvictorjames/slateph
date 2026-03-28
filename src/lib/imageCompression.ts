/**
 * Client-side image compression using Canvas API.
 * Resizes and compresses images before uploading to Supabase Storage.
 */

interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number   // 0–1, JPEG/WebP quality
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png'
}

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.82,
  mimeType: 'image/webp',
}

export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxWidth, maxHeight, quality, mimeType } = { ...DEFAULTS, ...options }

  // Skip non-image files or SVGs (no compression needed)
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      // Scale down proportionally if over max dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(file) // Fallback: return original

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file)
          // Keep original filename but update extension to match mimeType
          const ext = mimeType.split('/')[1]
          const baseName = file.name.replace(/\.[^.]+$/, '')
          const compressed = new File([blob], `${baseName}.${ext}`, { type: mimeType })
          resolve(compressed)
        },
        mimeType,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file) // Fallback: return original on error
    }

    img.src = objectUrl
  })
}

/** Max allowed PDF size in bytes (10 MB) */
export const MAX_PDF_SIZE = 10 * 1024 * 1024

/** Validate PDF file size before upload. Returns an error string or null. */
export function validatePDFSize(file: File): string | null {
  if (file.type !== 'application/pdf') return null
  if (file.size > MAX_PDF_SIZE) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `PDF is ${mb} MB. Please compress it to under 10 MB before uploading. Use tools like smallpdf.com or ilovepdf.com.`
  }
  return null
}

/** Max allowed presentation size in bytes (25 MB) */
export const MAX_PRESENTATION_SIZE = 25 * 1024 * 1024

export function validatePresentationSize(file: File): string | null {
  if (file.size > MAX_PRESENTATION_SIZE) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `File is ${mb} MB. Please compress it to under 25 MB before uploading.`
  }
  return null
}
