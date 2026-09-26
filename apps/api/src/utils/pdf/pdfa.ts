import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { unlink } from 'node:fs/promises'

// Ghostscript ships an sRGB profile but not on a stable path; Debian (Docker) and
// Homebrew (dev) disagree. Override with ETAX_ICC_PROFILE if a distro moves it again.
const ICC_PROFILE_GLOBS = [
  '/usr/share/ghostscript/*/iccprofiles/default_rgb.icc',
  '/opt/homebrew/Cellar/ghostscript/*/share/ghostscript/iccprofiles/default_rgb.icc',
  '/usr/local/Cellar/ghostscript/*/share/ghostscript/iccprofiles/default_rgb.icc',
]

let cachedIccProfile: string | undefined

async function findIccProfile(): Promise<string> {
  if (cachedIccProfile) return cachedIccProfile
  const override = process.env.ETAX_ICC_PROFILE
  if (override) return (cachedIccProfile = override)

  for (const pattern of ICC_PROFILE_GLOBS) {
    const root = pattern.slice(0, pattern.lastIndexOf('/', pattern.indexOf('*')))
    const glob = new Bun.Glob(pattern.slice(root.length + 1))
    try {
      for await (const match of glob.scan({ cwd: root, absolute: true })) {
        return (cachedIccProfile = match)
      }
    } catch {
      // root doesn't exist on this platform — try the next layout
    }
  }
  throw new Error('no sRGB ICC profile found for PDF/A conversion — set ETAX_ICC_PROFILE')
}

// PDF/A forbids raw DeviceRGB without an OutputIntent, so ghostscript needs this
// pdfmark prologue declaring the destination profile — `-dPDFA=3` alone fails veraPDF
// clause 6.2.4.3. Verify with `bun run scripts/verify-etax-pdfa.ts`.
function outputIntentPostScript(iccPath: string): string {
  return `%!
[/_objdef {icc_PDFA} /type /stream /OBJ pdfmark
[{icc_PDFA} <</N 3 /Alternate /DeviceRGB>> /PUT pdfmark
[{icc_PDFA} (${iccPath}) (r) file /PUT pdfmark
[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark
[{OutputIntent_PDFA} <<
  /Type /OutputIntent
  /S /GTS_PDFA1
  /DestOutputProfile {icc_PDFA}
  /OutputConditionIdentifier (sRGB)
  /Info (sRGB IEC61966-2.1)
>> /PUT pdfmark
[{Catalog} <</OutputIntents [ {OutputIntent_PDFA} ]>> /PUT pdfmark
`
}

// The XML rides along as a PDF/A-3 associated file: /AF on the catalog (so it is bound to
// the whole document) plus the /EmbeddedFiles name tree (so readers list it).
// `(text/xml) cvn` is deliberate — a literal /text#2Fxml name reaches the PDF as
// "text#2Fxml" and fails veraPDF clause 6.8-1, which wants a real MIME type.
function attachmentPostScript(xmlPath: string, rawFilename: string): string {
  // Document numbers legitimately contain `/` (101/2559) and PostScript strings choke on
  // unbalanced parens — keep the name to characters that survive both.
  const filename = rawFilename.replace(/[^\w.\-]/g, '_')
  return `[/_objdef {etax_xml} /type /stream /OBJ pdfmark
[{etax_xml} <</Type /EmbeddedFile /Subtype (text/xml) cvn>> /PUT pdfmark
[{etax_xml} (${xmlPath}) (r) file /PUT pdfmark
[/_objdef {etax_fs} /type /dict /OBJ pdfmark
[{etax_fs} <<
  /Type /Filespec
  /F (${filename})
  /UF (${filename})
  /AFRelationship /Data
  /Desc (e-Tax Invoice XML \\(ETDA 3-2560\\))
  /EF <</F {etax_xml}>>
>> /PUT pdfmark
[{Catalog} <</AF [ {etax_fs} ]>> /PUT pdfmark
[/Name (${filename}) /FS {etax_fs} /EMBED pdfmark
`
}

// Ghostscript hardcodes pdfaid:conformance='B' in the XMP it generates and exposes no
// switch for it. The stream is uncompressed (PDF/A requires it) and the replacement is
// the same length, so a byte patch is safe. Only valid because the source PDFs come from
// Chromium, which embeds ToUnicode CMaps — `verify-etax-pdfa.ts` is what proves 3U.
function declareConformanceU(pdf: Buffer): Buffer {
  const patched = pdf.toString('latin1').replace("pdfaid:conformance='B'", "pdfaid:conformance='U'")
  return Buffer.from(patched, 'latin1')
}

export type EtaxAttachment = { filename: string; xml: string }

/**
 * Reshape a normal PDF into PDF/A-3U, the only attachment format the ETDA e-Tax
 * Invoice by Email scheme accepts, with the ขมธอ. 3-2560 XML embedded as an
 * associated file. Verify with `bun run scripts/verify-etax-pdfa.ts`.
 */
export async function convertToPdfA3(pdf: Buffer, attachment?: EtaxAttachment): Promise<Buffer> {
  const workDir = tmpdir()
  const id = crypto.randomUUID()
  const inputPath = join(workDir, `etax-in-${id}.pdf`)
  const outputPath = join(workDir, `etax-out-${id}.pdf`)
  const defPath = join(workDir, `etax-def-${id}.ps`)
  const xmlPath = join(workDir, `etax-xml-${id}.xml`)

  try {
    const prologue =
      outputIntentPostScript(await findIccProfile()) +
      (attachment ? attachmentPostScript(xmlPath, attachment.filename) : '')

    await Promise.all([
      Bun.write(inputPath, pdf),
      Bun.write(defPath, prologue),
      attachment ? Bun.write(xmlPath, attachment.xml) : Promise.resolve(),
    ])

    const proc = Bun.spawn(
      [
        'gs',
        '-dPDFA=3',
        '-dBATCH',
        '-dNOPAUSE',
        '-dPDFACompatibilityPolicy=1',
        '-sColorConversionStrategy=RGB',
        '-sDEVICE=pdfwrite',
        // SAFER blocks reading anything outside ghostscript's own resource dirs.
        `--permit-file-read=${xmlPath}`,
        `-o${outputPath}`,
        defPath,
        inputPath,
      ],
      { stdout: 'pipe', stderr: 'pipe' },
    )

    const exitCode = await proc.exited
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text()
      throw new Error(`ghostscript exited with code ${exitCode}: ${stderr}`)
    }

    return declareConformanceU(Buffer.from(await Bun.file(outputPath).arrayBuffer()))
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('ghostscript not installed (gs binary not found on PATH)')
    }
    throw err
  } finally {
    await Promise.all([
      unlink(inputPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
      unlink(defPath).catch(() => {}),
      unlink(xmlPath).catch(() => {}),
    ])
  }
}
