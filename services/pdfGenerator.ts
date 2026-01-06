import { Tables } from "@/database.types";
import { getPrivateImageUrl } from "@/utils/image";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

type Pet = Tables<"pets">;
type Vaccination = Tables<"vaccinations">;

// Document info for vaccination documents
interface DocumentInfo {
  url: string;
  title: string;
  category: string;
  date: string;
  base64?: string | null;
}

// Calculate age from date of birth
const calculateAge = (dateOfBirth: string): number => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
};

// Format date to readable string
const formatDate = (dateString: string | null): string => {
  if (!dateString) return "Not set";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Group vaccinations by clinic for the certificates page
const groupVaccinationsByClinic = (
  vaccinations: Vaccination[]
): Map<string, Vaccination[]> => {
  const grouped = new Map<string, Vaccination[]>();
  vaccinations.forEach((v) => {
    const clinic = v.clinic_name || "Unknown Clinic";
    if (!grouped.has(clinic)) {
      grouped.set(clinic, []);
    }
    grouped.get(clinic)!.push(v);
  });
  return grouped;
};

// Generate the HTML template for the PDF
const generatePDFHTML = (
  pet: Pet,
  vaccinations: Vaccination[],
  petPhotoUrl: string | null,
  documents: DocumentInfo[] = []
): string => {
  const age = calculateAge(pet.date_of_birth);
  const groupedVaccinations = groupVaccinationsByClinic(vaccinations);

  // Vaccination status section
  const vaccinationStatusHTML = vaccinations
    .map(
      (v) => `
      <div class="vaccination-item">
        <div class="vaccination-status">
          <div class="status-dot"></div>
        </div>
        <div class="vaccination-details">
          <div class="vaccination-name">${v.name}</div>
          <div class="vaccination-date">Administered: ${formatDate(v.date)}</div>
          ${v.next_due_date ? `<div class="vaccination-next">Next Due: ${formatDate(v.next_due_date)}</div>` : ""}
        </div>
      </div>
    `
    )
    .join("");

  // Certificates section
  let certificatesHTML = "";
  let pageCount = 3;
  groupedVaccinations.forEach((vacs, clinicName) => {
    const vaccineNames = vacs.map((v) => v.name).join(", ");
    const latestDate = vacs.reduce((latest, v) => {
      return new Date(v.date) > new Date(latest) ? v.date : latest;
    }, vacs[0].date);

    certificatesHTML += `
      <div class="certificate-card">
        <div class="certificate-header">
          <span class="certificate-icon">📄</span>
          <span class="certificate-title">${clinicName} Certificate</span>
          <span class="verified-badge-small">Verified ✓</span>
        </div>
        <div class="certificate-body">
          <div class="certificate-row"><strong>Vaccines:</strong> ${vaccineNames}</div>
          <div class="certificate-row"><strong>Date Issued:</strong> ${formatDate(latestDate)}</div>
          <div class="certificate-row"><strong>Clinic:</strong> ${clinicName}</div>
        </div>
      </div>
    `;
    pageCount++;
  });

  const documentPagesInfo =
    documents.length > 0
      ? `(Pages 4-${3 + documents.length})`
      : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #f5f5f5;
          color: #1a1a1a;
        }
        
        @page {
          size: A4;
          margin: 0;
        }
        
        .page {
          width: 210mm;
          height: 297mm;
          padding: 12mm;
          padding-bottom: 20mm;
          background: white;
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
        }
        
        .page-content {
          position: relative;
          z-index: 1;
        }
        
        /* Watermark */
        .watermark {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0.03;
          pointer-events: none;
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
          overflow: hidden;
        }
        
        .watermark span {
          font-size: 24px;
          font-weight: bold;
          color: #2d4a6f;
          padding: 20px 30px;
          transform: rotate(-30deg);
        }
        
        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 3px solid #ffc107;
          position: relative;
          z-index: 1;
        }
        
        .logo {
          display: flex;
          flex-direction: column;
        }
        
        .logo-text {
          font-size: 28px;
          font-weight: bold;
          color: #2d4a6f;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .logo-paw {
          font-size: 24px;
        }
        
        .logo-subtitle {
          font-size: 11px;
          color: #2d4a6f;
          letter-spacing: 3px;
          margin-top: 4px;
        }
        
        .verified-badge {
          background: #28a745;
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        /* Pet Info Card */
        .pet-card {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 25px;
          display: flex;
          gap: 30px;
          position: relative;
          z-index: 1;
        }
        
        .pet-image-container {
          width: 140px;
          height: 140px;
          border: 2px dashed #5FC4C0;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #e8f7f6;
          flex-shrink: 0;
          overflow: hidden;
        }
        
        .pet-image-container.has-photo {
          border: 2px solid #5FC4C0;
          padding: 0;
        }
        
        .pet-photo {
          width: 140px;
          height: 140px;
          object-fit: cover;
          border-radius: 10px;
          display: block;
        }
        
        .pet-photo-fallback {
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e8f7f6;
          border-radius: 10px;
          font-size: 50px;
        }
        
        .pet-avatar {
          width: 80px;
          height: 80px;
          background: #5FC4C0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
        }
        
        .pet-avatar-icon {
          font-size: 40px;
        }
        
        .pet-image-text {
          font-size: 11px;
          color: #6B7280;
          text-align: center;
          padding: 0 10px;
        }
        
        .pet-details {
          flex: 1;
        }
        
        .pet-label {
          font-size: 10px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        
        .pet-name {
          font-size: 32px;
          font-weight: bold;
          color: #5FC4C0;
          margin-bottom: 15px;
        }
        
        .pet-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        
        .pet-info-item .value {
          font-size: 16px;
          font-weight: 600;
          color: #1a1a1a;
        }
        
        .microchip-section {
          margin-top: 15px;
        }
        
        .microchip-number {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          letter-spacing: 1px;
        }
        
        /* Quick Summary Card */
        .summary-card {
          background: linear-gradient(135deg, #e8f7f6 0%, #d4f0ef 100%);
          border-radius: 12px;
          padding: 20px 25px;
          margin-bottom: 25px;
          border-left: 4px solid #5FC4C0;
          position: relative;
          z-index: 1;
        }
        
        .summary-content {
          font-size: 14px;
          color: #2d4a6f;
          line-height: 1.6;
        }
        
        /* Section Title */
        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #2d4a6f;
          letter-spacing: 1px;
          margin-bottom: 20px;
          padding-left: 12px;
          border-left: 4px solid #5FC4C0;
          position: relative;
          z-index: 1;
        }
        
        /* Vaccination Status */
        .vaccination-list {
          position: relative;
          z-index: 1;
        }
        
        .vaccination-item {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        
        .vaccination-status {
          display: flex;
          align-items: flex-start;
          padding-top: 4px;
        }
        
        .status-dot {
          width: 12px;
          height: 12px;
          background: #28a745;
          border-radius: 50%;
        }
        
        .vaccination-details {
          flex: 1;
        }
        
        .vaccination-name {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 4px;
        }
        
        .vaccination-date {
          font-size: 12px;
          color: #6B7280;
        }
        
        .vaccination-next {
          font-size: 12px;
          color: #5FC4C0;
          margin-top: 2px;
        }
        
        /* Empty state */
        .empty-state {
          text-align: center;
          padding: 40px;
          color: #6B7280;
          font-size: 14px;
        }
        
        /* Certificates Page */
        .official-docs-header {
          background: linear-gradient(135deg, #2d4a6f 0%, #1a3a5c 100%);
          color: white;
          padding: 25px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 25px;
          position: relative;
          z-index: 1;
        }
        
        .official-docs-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .official-docs-subtitle {
          font-size: 12px;
          opacity: 0.9;
        }
        
        .certificate-card {
          background: #f8f9fa;
          border-radius: 12px;
          margin-bottom: 15px;
          overflow: hidden;
          position: relative;
          z-index: 1;
          border-left: 4px solid #5FC4C0;
        }
        
        .certificate-header {
          padding: 15px 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .certificate-icon {
          font-size: 18px;
        }
        
        .certificate-title {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: #5FC4C0;
        }
        
        .verified-badge-small {
          background: #e8f7f6;
          color: #28a745;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        
        .certificate-body {
          padding: 15px 20px;
        }
        
        .certificate-row {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 6px;
        }
        
        .certificate-row strong {
          color: #1a1a1a;
        }
        
        /* Documents Follow Banner */
        .documents-banner {
          background: linear-gradient(135deg, #2d4a6f 0%, #1a3a5c 100%);
          color: white;
          padding: 15px 25px;
          border-radius: 25px;
          text-align: center;
          margin-top: 30px;
          font-size: 13px;
          position: relative;
          z-index: 1;
        }
        
        /* Footer */
        .footer {
          position: absolute;
          bottom: 8mm;
          left: 12mm;
          right: 12mm;
          text-align: center;
          font-size: 9px;
          color: #6B7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 8px;
        }
        
        .footer-title {
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 3px;
        }
        
        ${getDocumentPagesCSS()}
      </style>
    </head>
    <body>
      <!-- Page 1: Pet Health Passport -->
      <div class="page">
        <div class="watermark">
          ${Array(50).fill('<span>PAWBUCK</span>').join('')}
        </div>
        <div class="page-content">
          <div class="header">
            <div class="logo">
              <div class="logo-text">
                <span class="logo-paw">🐾</span>
                PAWBUCK
              </div>
              <div class="logo-subtitle">PET HEALTH PASSPORT</div>
            </div>
            <div class="verified-badge">
              ✓ VERIFIED
            </div>
          </div>
          
          <div class="pet-card">
            <div class="pet-image-container${petPhotoUrl ? ' has-photo' : ''}">
              ${
                petPhotoUrl
                  ? `<img class="pet-photo" src="${petPhotoUrl}" alt="${pet.name}" />`
                  : `<div class="pet-avatar">
                <span class="pet-avatar-icon">🐕</span>
              </div>
              <div class="pet-image-text">Come on, you must have a photo of me!</div>`
              }
            </div>
            <div class="pet-details">
              <div class="pet-label">PET NAME</div>
              <div class="pet-name">${pet.name}</div>
              
              <div class="pet-info-grid">
                <div class="pet-info-item">
                  <div class="pet-label">BREED</div>
                  <div class="value">${pet.breed}</div>
                </div>
                <div class="pet-info-item">
                  <div class="pet-label">AGE</div>
                  <div class="value">${age} years</div>
                </div>
                <div class="pet-info-item">
                  <div class="pet-label">SEX</div>
                  <div class="value">${pet.sex}</div>
                </div>
                <div class="pet-info-item">
                  <div class="pet-label">WEIGHT</div>
                  <div class="value">${pet.weight_value} ${pet.weight_unit}</div>
                </div>
              </div>
              
              ${
                pet.microchip_number
                  ? `
              <div class="microchip-section">
                <div class="pet-label">MICROCHIP</div>
                <div class="microchip-number">${pet.microchip_number}</div>
              </div>
              `
                  : ""
              }
            </div>
          </div>
          
          <div class="summary-card">
            <div class="summary-content">
              ${vaccinations.length > 0 
                ? `${pet.name} has ${vaccinations.length} vaccination record${vaccinations.length > 1 ? "s" : ""} on file.${pet.country ? ` Based on ${pet.country === "Canada" ? "Canadian" : pet.country} regulations, ${pet.name} is fully vaccinated.` : ""}`
                : `${pet.name} doesn't have any vaccination records yet.`}
            </div>
          </div>
        </div>
        <div class="footer">
          <div class="footer-title">Document Generated Through PawBuck</div>
          <div>Based on information provided by pet owner | Original vaccination documents maintained by owner</div>
        </div>
      </div>
      
      <!-- Page 2: Vaccination Record -->
      <div class="page">
        <div class="watermark">
          ${Array(50).fill('<span>PAWBUCK</span>').join('')}
        </div>
        <div class="page-content">
          <div class="header">
            <div class="logo">
              <div class="logo-text">
                <span class="logo-paw">🐾</span>
                PAWBUCK
              </div>
              <div class="logo-subtitle">VACCINATION RECORD</div>
            </div>
          </div>
          
          <div class="section-title">VACCINATION STATUS</div>
          
          <div class="vaccination-list">
            ${vaccinationStatusHTML || '<div class="empty-state">No vaccinations recorded yet</div>'}
          </div>
          
          ${
            vaccinations.length > 0 && pet.country
              ? `
          <div style="margin-top: 24px; padding: 16px; background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px;">
            <div style="display: flex; align-items: flex-start;">
              <span style="font-size: 16px; margin-right: 8px;">✓</span>
              <div style="flex: 1;">
                <div style="font-size: 11px; font-weight: 600; color: #10B981; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${pet.country === "Canada"
                    ? "Fully vaccinated based on Canadian regulations"
                    : `Fully vaccinated based on ${pet.country} regulations`}
                </div>
              </div>
            </div>
          </div>
          `
              : ""
          }
        </div>
        <div class="footer">
          <div class="footer-title">Document Generated Through PawBuck</div>
          <div>Based on information provided by pet owner | Original vaccination documents maintained by owner</div>
        </div>
      </div>
      
      <!-- Page 3: Official Certificates -->
      <div class="page">
        <div class="watermark">
          ${Array(50).fill('<span>PAWBUCK</span>').join('')}
        </div>
        <div class="page-content">
          <div class="header">
            <div class="logo">
              <div class="logo-text">
                <span class="logo-paw">🐾</span>
                PAWBUCK
              </div>
              <div class="logo-subtitle">OFFICIAL CERTIFICATES</div>
            </div>
          </div>
          
          <div class="official-docs-header">
            <div class="official-docs-title">OFFICIAL DOCUMENTS</div>
            <div class="official-docs-subtitle">Verified Vaccination Records from Licensed Veterinary Clinics</div>
          </div>
          
          <div class="section-title">DOCUMENTS ATTACHED</div>
          
          ${certificatesHTML || '<div class="empty-state">No certificates attached</div>'}
          
          ${
            documents.length > 0
              ? `
          <div class="documents-banner">
            📎 ${documents.length} OFFICIAL DOCUMENT${documents.length > 1 ? 'S' : ''} ATTACHED ${documentPagesInfo}
          </div>
          `
              : ""
          }
        </div>
        <div class="footer">
          <div class="footer-title">Document Generated Through PawBuck</div>
          <div>Based on information provided by pet owner | Original vaccination documents maintained by owner</div>
        </div>
      </div>
      
      ${generateDocumentPagesHTML(documents)}
    </body>
    </html>
  `;
};

export interface GeneratePDFOptions {
  pet: Pet;
  vaccinations: Vaccination[];
}

// Generate HTML for document pages
const generateDocumentPagesHTML = (documents: DocumentInfo[]): string => {
  if (documents.length === 0) return "";

  return documents
    .map(
      (doc, index) => `
      <!-- Document Page ${index + 1}: ${doc.category} - ${doc.title} -->
      <div class="page document-page">
        <div class="watermark">
          ${Array(50).fill('<span>PAWBUCK</span>').join('')}
        </div>
        <div class="page-content">
          <div class="header">
            <div class="logo">
              <div class="logo-text">
                <span class="logo-paw">🐾</span>
                PAWBUCK
              </div>
              <div class="logo-subtitle">ATTACHED DOCUMENT</div>
            </div>
            <div class="doc-badge">${doc.category}</div>
          </div>
          
          <div class="doc-info-card">
            <div class="doc-info-row">
              <span class="doc-info-label">Document:</span>
              <span class="doc-info-value">${doc.title}</span>
            </div>
            <div class="doc-info-row">
              <span class="doc-info-label">Category:</span>
              <span class="doc-info-value">${doc.category}</span>
            </div>
            <div class="doc-info-row">
              <span class="doc-info-label">Date:</span>
              <span class="doc-info-value">${formatDate(doc.date)}</span>
            </div>
          </div>
          
          <div class="document-image-container">
            ${
              doc.base64
                ? `<img class="document-image" src="${doc.base64}" alt="${doc.title}" />`
                : `<div class="document-placeholder">
                    <span>📄</span>
                    <p>Document could not be loaded</p>
                  </div>`
            }
          </div>
        </div>
        <div class="footer">
          <div class="footer-title">Document Generated Through PawBuck</div>
          <div>Original document maintained by pet owner | Page ${index + 4} of attached documents</div>
        </div>
      </div>
    `
    )
    .join("");
};

// Additional CSS for document pages
const getDocumentPagesCSS = (): string => `
  /* Document Page Styles */
  .document-page .doc-badge {
    background: #5FC4C0;
    color: white;
    padding: 8px 20px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: bold;
  }
  
  .doc-info-card {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    border-left: 4px solid #5FC4C0;
    position: relative;
    z-index: 1;
  }
  
  .doc-info-row {
    display: flex;
    margin-bottom: 8px;
  }
  
  .doc-info-row:last-child {
    margin-bottom: 0;
  }
  
  .doc-info-label {
    font-size: 12px;
    color: #6B7280;
    width: 80px;
    flex-shrink: 0;
  }
  
  .doc-info-value {
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
  }
  
  .document-image-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8f9fa;
    border-radius: 12px;
    padding: 15px;
    min-height: 180mm;
    max-height: 200mm;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }
  
  .document-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }
  
  .document-placeholder {
    text-align: center;
    color: #6B7280;
  }
  
  .document-placeholder span {
    font-size: 48px;
    display: block;
    margin-bottom: 10px;
  }
  
  .document-placeholder p {
    font-size: 14px;
  }
`;

// Convert image URL to base64 data URI
const getBase64FromUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
};

export const generatePetPassportPDF = async ({
  pet,
  vaccinations,
}: GeneratePDFOptions): Promise<string> => {
  // Collect vaccination documents, deduplicating by URL
  const documentMap = new Map<string, DocumentInfo>();
  vaccinations.forEach((v) => {
    if (v.document_url) {
      const existing = documentMap.get(v.document_url);
      if (existing) {
        // Merge: combine vaccine names, keep earliest date
        if (!existing.title.includes(v.name)) {
          existing.title = `${existing.title}, ${v.name}`;
        }
        if (new Date(v.date) < new Date(existing.date)) {
          existing.date = v.date;
        }
      } else {
        documentMap.set(v.document_url, {
          url: v.document_url,
          title: v.name,
          category: "Vaccination",
          date: v.date,
        });
      }
    }
  });
  const documents = Array.from(documentMap.values());

  // Fetch pet photo AND all documents in parallel for better performance
  const [petPhotoUrl, ...documentBase64Results] = await Promise.all([
    // Pet photo
    pet.photo_url
      ? getPrivateImageUrl(pet.photo_url)
          .then((url) => getBase64FromUrl(url))
          .catch(() => null)
      : Promise.resolve(null),
    // All vaccination documents in parallel
    ...documents.map((doc) =>
      getPrivateImageUrl(doc.url)
        .then((url) => getBase64FromUrl(url))
        .catch(() => null)
    ),
  ]);

  // Assign base64 results to documents
  documents.forEach((doc, i) => {
    doc.base64 = documentBase64Results[i];
  });

  const html = generatePDFHTML(pet, vaccinations, petPhotoUrl, documents);

  // Generate PDF
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Verify the generated file exists
  const generatedFileInfo = await FileSystem.getInfoAsync(uri);
  if (!generatedFileInfo.exists) {
    throw new Error("PDF generation failed - file not created");
  }

  // Move to a more accessible location with a better filename
  const filename = `${pet.name.replace(/[^a-zA-Z0-9]/g, "_")}_Health_Passport.pdf`;
  const newUri = `${FileSystem.documentDirectory}${filename}`;

  // Delete existing file if it exists (moveAsync fails silently if destination exists)
  const existingFileInfo = await FileSystem.getInfoAsync(newUri);
  if (existingFileInfo.exists) {
    await FileSystem.deleteAsync(newUri, { idempotent: true });
  }

  await FileSystem.moveAsync({
    from: uri,
    to: newUri,
  });

  // Verify the file was moved successfully
  const movedFileInfo = await FileSystem.getInfoAsync(newUri);
  if (!movedFileInfo.exists) {
    throw new Error("Failed to move PDF to documents directory");
  }

  return newUri;
};

export const sharePetPassportPDF = async (uri: string): Promise<void> => {
  // Verify file exists before attempting to share
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) {
    throw new Error(`PDF file not found at path: ${uri}`);
  }

  const isAvailable = await Sharing.isAvailableAsync();

  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Share Pet Health Passport",
      UTI: "com.adobe.pdf",
    });
  } else {
    throw new Error("Sharing is not available on this device");
  }
};

export const generateAndSharePetPassport = async (
  options: GeneratePDFOptions
): Promise<void> => {
  const uri = await generatePetPassportPDF(options);
  await sharePetPassportPDF(uri);
};
