import { expect, test } from "@playwright/test";

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
      buffer: Buffer.from("plain text, not allowed"),
      mimeType: "text/plain",
      name: "notes.txt",
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
});
