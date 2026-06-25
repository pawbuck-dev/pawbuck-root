import {
  aggregateInvoiceBilling,
  parseInvoiceExtracted,
  parseInvoiceRowTotal,
} from "@/utils/invoiceBillingParse";

describe("invoiceBillingParse", () => {
  it("reads Total from flexible extraction keyFacts", () => {
    const ex = parseInvoiceExtracted({
      title: "Vet invoice",
      summary: "Annual visit",
      primaryDate: "2026-05-31",
      keyFacts: [
        { label: "Total", value: "$142.50" },
        { label: "Provider", value: "Happy Paws Clinic" },
      ],
      confidenceScore: 90,
    });
    expect(parseInvoiceRowTotal(ex)).toBe(142.5);
    expect(ex.primaryDate).toBe("2026-05-31");
  });

  it("maps legacy medical-record JSON to invoice facts with dateOfVisit", () => {
    const ex = parseInvoiceExtracted({
      petName: "Milo",
      documentType: "billing_invoice",
      clinicName: "City Vet",
      dateOfVisit: "2026-05-31",
      items: [{ name: "Exam", category: "exam", expiryDate: "2026-05-31" }],
      confidenceScore: 80,
    });
    expect(ex.primaryDate).toBe("2026-05-31");
    expect(ex.title).toContain("City Vet");
    expect(parseInvoiceRowTotal(ex)).toBeNull();
  });

  it("sums line-item amounts from medical items when no Total keyFact", () => {
    const ex = parseInvoiceExtracted({
      clinicName: "City Vet",
      dateOfVisit: "2026-05-31",
      items: [
        { name: "Exam", category: "exam", amount: 65 },
        { name: "Vaccine", category: "vaccination", price: 45.5 },
      ],
      confidenceScore: 80,
    });
    expect(parseInvoiceRowTotal(ex)).toBe(110.5);
  });

  it("aggregates billing rows for YTD totals", () => {
    const rows = [
      {
        id: "1",
        created_at: "2026-06-01T00:00:00Z",
        extracted_json: {
          title: "Invoice A",
          primaryDate: "2026-05-01",
          keyFacts: [{ label: "Total", value: "$100.00" }],
        },
      },
      {
        id: "2",
        created_at: "2026-06-02T00:00:00Z",
        extracted_json: {
          title: "Invoice B",
          primaryDate: "2026-05-15",
          keyFacts: [{ label: "Total", value: "$50.25" }],
        },
      },
    ] as never[];
    const totals = aggregateInvoiceBilling(rows);
    expect(totals.total).toBe(150.25);
  });
});
