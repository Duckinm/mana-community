/**
 * Manual compliance check for the e-Tax Invoice by Email attachment.
 *
 *   bun run scripts/verify-etax-pdfa.ts [path/to/invoice.pdf]
 *
 * With no argument it prints a Thai sample invoice through the same headless
 * Chromium the real PDF pipeline uses. Requires `gs` and `verapdf` on PATH.
 */
import { chromium } from 'playwright-core'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { convertToPdfA3 } from '../src/utils/pdf/pdfa'
import { buildEtaxXml } from '../src/utils/pdf/etax-xml'
import { ETAX_MAX_ATTACHMENT_BYTES } from '../src/modules/documents/send-etax'

const SAMPLE_DOCUMENT = {
  number: 'INV2607001',
  type: 'INV',
  issueDate: '2026-07-27',
  remark: null,
  currency: 'THB',
  registeredName: 'บริษัท ตัวอย่าง จำกัด',
  registeredNameEn: 'Example Co., Ltd.',
  registeredAddress: '1 ถนนสุขุมวิท กรุงเทพฯ 10110',
  yourTaxId: '0105500000000',
  yourBranchNumber: '00000',
  yourEmail: 'billing@example.co.th',
  clientName: 'Client Co., Ltd.',
  clientNameTh: 'บริษัท ลูกค้า จำกัด',
  clientAddress: '99 Rama IV Rd, Bangkok 10500',
  clientAddressTh: '99 ถนนพระราม 4 กรุงเทพฯ 10500',
  clientTaxId: '0105500000001',
  clientBranchNumber: '00000',
  clientEmail: 'ap@client.co.th',
  subtotalCents: 1_000_000,
  discountCents: 0,
  taxRateBps: 700,
  taxCents: 70_000,
  totalCents: 1_070_000,
  amountDueCents: 1_070_000,
}

const SAMPLE_ITEMS = [
  { description: 'ค่าบริการออกแบบ', quantity: 100, unitPriceCents: 1_000_000, subtotalCents: 1_000_000 },
]

const SAMPLE_HTML = `<!doctype html><html lang="th"><body style="font-family:sans-serif;padding:40px">
<h1>ใบกำกับภาษี / ใบเสร็จรับเงิน</h1>
<p>เลขที่ INV2607001 · วันที่ 27/07/2569</p>
<p>ผู้ขาย: บริษัท ตัวอย่าง จำกัด · เลขประจำตัวผู้เสียภาษี 0105500000000</p>
<table><tr><td>ค่าบริการออกแบบ</td><td>10,000.00</td></tr>
<tr><td>ภาษีมูลค่าเพิ่ม 7%</td><td>700.00</td></tr></table>
</body></html>`

async function samplePdf(): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  try {
    await page.setContent(SAMPLE_HTML, { waitUntil: 'networkidle' })
    return Buffer.from(await page.pdf({ format: 'A4', printBackground: true }))
  } finally {
    await browser.close()
  }
}

async function validate(path: string, flavour: string) {
  const proc = Bun.spawn(['verapdf', '--flavour', flavour, '--format', 'text', path], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const out = await new Response(proc.stdout).text()
  await proc.exited
  return out.trim()
}

const inputPath = process.argv[2]
const source = inputPath ? Buffer.from(await Bun.file(inputPath).arrayBuffer()) : await samplePdf()
const converted = await convertToPdfA3(source, {
  filename: 'INV2607001.xml',
  xml: buildEtaxXml(SAMPLE_DOCUMENT, SAMPLE_ITEMS),
})

const outPath = join(tmpdir(), 'etax-verify.pdf')
await Bun.write(outPath, converted)

console.log(`source:    ${(source.byteLength / 1024).toFixed(0)} KB`)
console.log(`PDF/A-3:   ${(converted.byteLength / 1024).toFixed(0)} KB (ETDA limit ${ETAX_MAX_ATTACHMENT_BYTES / 1024 / 1024} MB)`)
console.log(`written:   ${outPath}\n`)

for (const flavour of ['3b', '3u']) {
  console.log(`verapdf --flavour ${flavour}: ${await validate(outPath, flavour)}`)
}

const hasEmbeddedXml = converted.includes(Buffer.from('/EmbeddedFiles'))
console.log(`\nembedded XML (ขมธอ. 3-2560): ${hasEmbeddedXml ? 'present' : 'MISSING — ETDA will reject'}`)

const conformance = converted.toString('latin1').match(/pdfaid:conformance='(\w)'/)?.[1]
console.log(`declared conformance:        ${conformance ?? 'MISSING'}`)
