import * as Sentry from "@sentry/bun";
import { chromium } from "playwright-core";
import { env } from "@api/env";

// span: headless-chromium render is the slowest op in the app and invisible
// to Sentry's fetch auto-instrumentation
export function generateDocumentPdf(publicToken: string): Promise<Buffer> {
  return Sentry.startSpan({ name: "pdf.generate", op: "function" }, () =>
    renderDocumentPdf(publicToken),
  );
}

async function renderDocumentPdf(publicToken: string): Promise<Buffer> {
  const url = `${env.PDF_WEB_ORIGIN ?? env.WEB_URL}/view/${publicToken}`;

  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: true,
  };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    launchOptions.executablePath =
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }

  const browser = await chromium.launch(launchOptions);

  try {
    const page = await browser.newPage();
    if (env.R2_ENDPOINT && env.R2_PRESIGN_ENDPOINT) {
      const storageEndpoint = new URL(env.R2_ENDPOINT);
      const presignOrigin = new URL(env.R2_PRESIGN_ENDPOINT).origin;
      await page.route((url) => url.origin === presignOrigin, async (route) => {
        const url = new URL(route.request().url());
        const signedHost = url.host;
        url.protocol = storageEndpoint.protocol;
        url.host = storageEndpoint.host;
        // Docker reaches storage internally, but S3 signatures include the browser-facing Host.
        const response = await route.fetch({
          url: url.toString(),
          headers: { ...route.request().headers(), host: signedHost },
          maxRedirects: 0,
        });
        try {
          await route.fulfill({ response });
        } finally {
          await response.dispose();
        }
      });
    }
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("[data-pdf-ready]", { timeout: 10_000 });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
