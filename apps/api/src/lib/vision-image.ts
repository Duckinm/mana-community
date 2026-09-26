import sharp from 'sharp'

// A phone photo is several MB of base64 and OCR gains nothing above ~1600px — the upload
// dominates the request time at full size.
const MAX_EDGE_PX = 1600

/** Downscales an image to a JPEG for a vision/OCR call. Returns bare base64, no data: prefix. */
export async function toVisionJpegBase64(input: Buffer): Promise<string> {
  const resized = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer()

  return resized.toString('base64')
}
