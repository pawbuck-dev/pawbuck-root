import {
  extractedPetInfoSchema,
  vaccinationOcrResponseSchema,
  vaccinationRecordSchema,
} from "./pet-records.schema";

describe("pet-records.schema", () => {
  describe("extractedPetInfoSchema", () => {
    it("accepts valid extracted pet info", () => {
      const valid = {
        microchip: "123456789012345",
        name: "Fluffy",
        age: "3 years",
        breed: "Golden Retriever",
        gender: "Male",
        confidence: 95,
      };
      expect(extractedPetInfoSchema.parse(valid)).toEqual(valid);
    });

    it("accepts nulls for optional fields", () => {
      const minimal = {
        microchip: null,
        name: null,
        age: null,
        breed: null,
        gender: null,
        confidence: 0,
      };
      expect(extractedPetInfoSchema.parse(minimal)).toEqual(minimal);
    });

    it("rejects confidence out of range", () => {
      expect(() =>
        extractedPetInfoSchema.parse({
          microchip: null,
          name: null,
          age: null,
          breed: null,
          gender: null,
          confidence: 101,
        })
      ).toThrow();
    });
  });

  describe("vaccinationRecordSchema", () => {
    it("accepts valid vaccination record", () => {
      const valid = {
        name: "Rabies",
        date: "2024-01-15",
        next_due_date: "2027-01-15",
        clinic_name: "Beach Ave Animal Hospital",
        notes: "Lot# 123",
        document_url: "",
      };
      expect(vaccinationRecordSchema.parse(valid)).toEqual(valid);
    });

    it("rejects invalid date format", () => {
      expect(() =>
        vaccinationRecordSchema.parse({
          name: "Rabies",
          date: "01-15-2024",
          next_due_date: "2027-01-15",
          clinic_name: "Clinic",
          notes: "",
          document_url: "",
        })
      ).toThrow();
    });
  });

  describe("vaccinationOcrResponseSchema", () => {
    it("accepts valid OCR response with vaccines array", () => {
      const valid = {
        vaccines: [
          {
            name: "DHPP",
            date: "2024-01-01",
            next_due_date: "2027-01-01",
            clinic_name: "Clinic",
            notes: "",
            document_url: "",
          },
        ],
      };
      expect(vaccinationOcrResponseSchema.parse(valid)).toEqual(valid);
    });

    it("accepts empty vaccines array", () => {
      expect(vaccinationOcrResponseSchema.parse({ vaccines: [] })).toEqual({
        vaccines: [],
      });
    });
  });
});
