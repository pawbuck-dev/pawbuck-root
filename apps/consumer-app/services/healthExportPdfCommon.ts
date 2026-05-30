import { getPrivateImageUrl } from "@/utils/image";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import QRCode from "qrcode";

export const HEALTH_EXPORT_CSS = `
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1a2830;
    background: #f0f4f8;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 10mm 12mm 16mm;
    background: #fff;
    position: relative;
    page-break-after: always;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }
  .watermark {
    position: absolute;
    inset: 0;
    opacity: 0.03;
    pointer-events: none;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    overflow: hidden;
    z-index: 0;
  }
  .watermark span {
    font-size: 20px;
    font-weight: 700;
    color: #2d4a6f;
    padding: 16px 22px;
    transform: rotate(-28deg);
  }
  .content { position: relative; z-index: 1; }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 3px solid #26c1c1;
  }
  .brand-title {
    font-size: 22px;
    font-weight: 800;
    color: #2d4a6f;
    letter-spacing: 0.5px;
  }
  .brand-sub {
    font-size: 9px;
    color: #5a6b75;
    letter-spacing: 2.5px;
    margin-top: 4px;
    font-weight: 600;
  }
  .page-meta {
    text-align: right;
    font-size: 10px;
    color: #5a6b75;
  }
  .verified {
    display: inline-block;
    margin-top: 6px;
    background: #28a745;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 14px;
  }
  .section-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
    color: #2d4a6f;
    margin: 14px 0 8px;
  }
  .card {
    background: #f8fafb;
    border-radius: 10px;
    border: 1px solid #e5eaee;
    padding: 12px 14px;
    margin-bottom: 10px;
  }
  .banner-teal {
    background: linear-gradient(135deg, #e8f7f6, #d4f0ef);
    border-left: 4px solid #26c1c1;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 12px;
  }
  .footer {
    position: absolute;
    bottom: 8mm;
    left: 12mm;
    right: 12mm;
    font-size: 8px;
    color: #6b7280;
    text-align: center;
    border-top: 1px solid #e5eaee;
    padding-top: 6px;
  }
  .pill {
    display: inline-block;
    font-size: 9px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 12px;
    margin: 0 6px 6px 0;
    border: 1px solid #cbd5e1;
    background: #fff;
  }
  .pill-warn { background: #fff8e1; border-color: #fbbf24; color: #92400e; }
  .pill-info { background: #e0f7fa; border-color: #26c1c1; color: #0b9696; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th, td { padding: 8px 6px; text-align: left; border-bottom: 1px solid #e5eaee; }
  th { font-size: 9px; color: #5a6b75; text-transform: uppercase; letter-spacing: 0.5px; }
  .field-label { font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
  .field-value { font-size: 12px; font-weight: 600; margin-top: 2px; }
`;

export async function qrDataUriForUrl(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, { width: 140, margin: 1, color: { dark: "#2d4a6f" } });
  } catch {
    return null;
  }
}

export async function petPhotoDataUri(photoPath: string | null): Promise<string | null> {
  if (!photoPath) return null;
  try {
    const url = await getPrivateImageUrl(photoPath);
    if (!url) return null;
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function printHtmlToPdfFile(html: string, filename: string): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dest = `${FileSystem.documentDirectory}${safeName}`;
  const existing = await FileSystem.getInfoAsync(dest);
  if (existing.exists) {
    await FileSystem.deleteAsync(dest, { idempotent: true });
  }
  await FileSystem.moveAsync({ from: uri, to: dest });
  return dest;
}

export async function sharePdfFile(uri: string, dialogTitle: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) throw new Error("PDF file not found");

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle,
      UTI: "com.adobe.pdf",
    });
    return;
  }
  throw new Error("Sharing is not available on this device");
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function watermarkHtml(): string {
  return `<div class="watermark">${Array(40).fill("<span>PAWBUCK</span>").join("")}</div>`;
}
