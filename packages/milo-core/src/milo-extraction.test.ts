import { MedicalRecordSchema, flexibleDocumentExtractionSchema, petDocumentTypeSchema } from "./schema";
import {
  STAINED_VET_RECEIPT,
  HANDWRITTEN_DIET_NOTE,
  MULTI_PET_INVOICE,
} from "./testing/mock-documents";

describe("Milo extraction (MedicalRecordSchema)", () => {
  describe("valid structured output for STAINED_VET_RECEIPT", () => {
    it("parses hand-crafted extraction matching the stained vet receipt", () => {
      // Simulated agent output for STAINED_VET_RECEIPT
      const simulatedOutput = {
        petName: "Buddy",
        documentType: "vaccinations",
        clinicName: "Beach Avenue Animal Hospital",
        dateOfVisit: "2025-11-10",
        items: [
          {
            name: "DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)",
            category: "vaccination",
            administeredDate: "2025-11-10",
            expiryDate: "2028-10-10",
          },
          {
            name: "Rabies 1yr",
            category: "vaccination",
            administeredDate: "2025-11-10",
            expiryDate: "2028-07-04",
          },
          {
            name: "Bordetella",
            category: "vaccination",
            administeredDate: "2025-11-10",
            expiryDate: "2026-11-10",
          },
          {
            name: "Leptospirosis",
            category: "vaccination",
            administeredDate: "2025-11-10",
            expiryDate: "2026-11-10",
          },
        ],
        confidenceScore: 90,
      };

      const result = MedicalRecordSchema.safeParse(simulatedOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.petName).toBe("Buddy");
        expect(result.data.documentType).toBe("vaccinations");
        expect(result.data.dateOfVisit).toBe("2025-11-10");
        expect(result.data.items).toHaveLength(4);
        expect(result.data.confidenceScore).toBeGreaterThanOrEqual(85);
        expect(result.data.confidenceScore).toBeLessThanOrEqual(100);
      }
    });

    it("references STAINED_VET_RECEIPT as non-empty document text", () => {
      expect(STAINED_VET_RECEIPT.length).toBeGreaterThan(0);
      expect(STAINED_VET_RECEIPT).toContain("Buddy");
      expect(STAINED_VET_RECEIPT).toContain("Beach Avenue");
    });
  });

  describe("low confidence for ambiguous or missing data", () => {
    it("accepts extraction with low confidenceScore for ambiguous data", () => {
      // Simulated output for HANDWRITTEN_DIET_NOTE (messy, ambiguous)
      const ambiguousOutput = {
        petName: "Moxie or Max",
        documentType: "medications",
        clinicName: "",
        dateOfVisit: "2025-01-01",
        items: [
          {
            name: "diet instructions",
            category: "diet",
            expiryDate: "2025-12-31",
          },
        ],
        confidenceScore: 25,
      };

      const result = MedicalRecordSchema.safeParse(ambiguousOutput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confidenceScore).toBeLessThan(50);
      }
    });

    it("references HANDWRITTEN_DIET_NOTE as ambiguous document text", () => {
      expect(HANDWRITTEN_DIET_NOTE.length).toBeGreaterThan(0);
      expect(HANDWRITTEN_DIET_NOTE).toMatch(/Moxie|Max/);
    });
  });

  describe("simulated AI output validation", () => {
    it("accepts valid simulated AI output", () => {
      const valid = {
        petName: "Luna",
        documentType: "vaccinations",
        clinicName: "Happy Paws Veterinary Clinic",
        dateOfVisit: "2025-03-15",
        items: [
          {
            name: "FVRCP booster",
            category: "vaccination",
            expiryDate: "2026-03-15",
          },
        ],
        confidenceScore: 88,
      };
      const result = MedicalRecordSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid date format (non ISO-8601)", () => {
      const invalidDate = {
        petName: "Buddy",
        documentType: "vaccinations",
        clinicName: "Clinic",
        dateOfVisit: "11/10/2025",
        items: [
          {
            name: "DHPP",
            category: "vaccination",
            expiryDate: "2028-10-10",
          },
        ],
        confidenceScore: 80,
      };
      const result = MedicalRecordSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });

    it("rejects invalid documentType", () => {
      const invalidType = {
        petName: "Buddy",
        documentType: "prescription",
        clinicName: "Clinic",
        dateOfVisit: "2025-11-10",
        items: [],
        confidenceScore: 70,
      };
      const result = MedicalRecordSchema.safeParse(invalidType);
      expect(result.success).toBe(false);
    });

    it("rejects confidenceScore out of range", () => {
      const highConfidence = {
        petName: "Buddy",
        documentType: "vaccinations",
        clinicName: "Clinic",
        dateOfVisit: "2025-11-10",
        items: [],
        confidenceScore: 101,
      };
      const result = MedicalRecordSchema.safeParse(highConfidence);
      expect(result.success).toBe(false);
    });

    it("rejects missing required fields", () => {
      const missingPetName = {
        documentType: "vaccinations",
        clinicName: "Clinic",
        dateOfVisit: "2025-11-10",
        items: [],
        confidenceScore: 80,
      };
      const result = MedicalRecordSchema.safeParse(missingPetName);
      expect(result.success).toBe(false);
    });

    it("references MULTI_PET_INVOICE as multi-pet document text", () => {
      expect(MULTI_PET_INVOICE.length).toBeGreaterThan(0);
      expect(MULTI_PET_INVOICE).toContain("Luna");
      expect(MULTI_PET_INVOICE).toContain("Cooper");
    });
  });

  describe("flexibleDocumentExtractionSchema", () => {
    it("parses vault extraction payload", () => {
      const payload = {
        title: "Policy",
        summary: "Coverage summary.",
        primaryDate: "2026-03-01",
        keyFacts: [
          { label: "Policy #", value: "P-1" },
          { label: "Provider", value: "Acme" },
        ],
        confidenceScore: 88,
      };
      expect(flexibleDocumentExtractionSchema.parse(payload)).toEqual(payload);
    });
  });

  describe("petDocumentTypeSchema", () => {
    it("includes non-clinical types", () => {
      expect(petDocumentTypeSchema.safeParse("insurance_policy").success).toBe(true);
      expect(petDocumentTypeSchema.safeParse("pedigree").success).toBe(true);
      expect(petDocumentTypeSchema.safeParse("identity_document").success).toBe(true);
    });
  });
});
