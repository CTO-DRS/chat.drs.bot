import { expect, test } from "@playwright/test";
import JSZip from "jszip";

/**
 * Builds a minimal but valid one-page PDF containing the given text.
 * ASCII-only content keeps byte offsets equal to string offsets.
 */
function buildPdf(text: string): Buffer {
  const content = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;

  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>";
  objects[4] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = pdf.length;
  pdf += "xref\n0 6\n0000000000 65535 f \n";

  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

/**
 * Builds a minimal but valid DOCX (Office Open XML) containing the given text.
 */
async function buildDocx(text: string): Promise<Buffer> {
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  return buffer;
}

test.describe("Attachments", () => {
  test("attachments button is visible and enabled", async ({ page }) => {
    await page.goto("/");
    const attachButton = page.getByTestId("attachments-button");
    await expect(attachButton).toBeVisible();
    await expect(attachButton).toBeEnabled();
  });

  test("can upload a PDF and shows a PDF preview card", async ({ page }) => {
    await page.goto("/");

    await page.setInputFiles("input[type='file']", {
      buffer: buildPdf("Hello DRS PDF test"),
      mimeType: "application/pdf",
      name: "test-doc.pdf",
    });

    const preview = page.getByTestId("input-attachment-preview");
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview).toContainText("PDF");
    await expect(preview).toContainText("test-doc");
  });

  test("rejects unsupported file types", async ({ page }) => {
    await page.goto("/");

    await page.setInputFiles("input[type='file']", {
      buffer: Buffer.from("PK fake zip archive"),
      mimeType: "application/zip",
      name: "archive.zip",
    });

    await expect(page.getByTestId("input-attachment-preview")).toHaveCount(0);
  });

  test("can remove an uploaded attachment", async ({ page }) => {
    await page.goto("/");

    await page.setInputFiles("input[type='file']", {
      buffer: buildPdf("Remove me"),
      mimeType: "application/pdf",
      name: "removable.pdf",
    });

    const preview = page.getByTestId("input-attachment-preview");
    await expect(preview).toBeVisible({ timeout: 15_000 });

    await preview.hover();
    await preview.locator("button").first().click();
    await expect(page.getByTestId("input-attachment-preview")).toHaveCount(0);
  });

  test("can upload a text file with an Arabic filename", async ({ page }) => {
    await page.goto("/");

    await page.setInputFiles("input[type='file']", {
      buffer: Buffer.from("مرحباً، هذا نص تجريبي للملف النصي.", "utf8"),
      mimeType: "text/plain",
      name: "ملاحظات-الاجتماع.txt",
    });

    const preview = page.getByTestId("input-attachment-preview");
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview).toContainText("TXT");
  });

  test("can upload a markdown file with empty mime type", async ({ page }) => {
    await page.goto("/");

    await page.setInputFiles("input[type='file']", {
      buffer: Buffer.from("# Heading\n\nSome markdown body."),
      mimeType: "",
      name: "notes.md",
    });

    const preview = page.getByTestId("input-attachment-preview");
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview).toContainText("MD");
  });

  test("can upload a DOCX file", async ({ page }) => {
    await page.goto("/");

    const docx = await buildDocx("Hello from the DOCX test document");

    await page.setInputFiles("input[type='file']", {
      buffer: docx,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      name: "report.docx",
    });

    const preview = page.getByTestId("input-attachment-preview");
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview).toContainText("DOCX");
  });
});
