import { client, expectEden } from '@/lib/eden'

type ImageUploadMetadata = {
  width: number
  height: number
  blurDataUrl: string
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

async function getImageUploadMetadata(file: File): Promise<ImageUploadMetadata> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    const canvas = document.createElement('canvas')
    const longestSide = 24
    const scale = longestSide / Math.max(width, height)
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not prepare image placeholder')

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return {
      width,
      height,
      blurDataUrl: canvas.toDataURL('image/jpeg', 0.45),
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function uploadTemplateImage(templateId: string, file: File): Promise<string> {
  const [dataUrl, metadata] = await Promise.all([
    readFileAsDataUrl(file),
    getImageUploadMetadata(file),
  ])
  const result = expectEden(
    await client.api['item-templates']({ id: templateId }).image.post({
      data: dataUrl.split(',')[1] ?? '',
      mediaType: file.type,
      ...metadata,
    }),
  )
  return result.imageUrl ?? ''
}

export async function removeTemplateImage(templateId: string): Promise<void> {
  expectEden(await client.api['item-templates']({ id: templateId }).image.delete())
}
