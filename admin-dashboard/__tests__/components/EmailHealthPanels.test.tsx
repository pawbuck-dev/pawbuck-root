import { DocumentProcessingMetricsPanel } from "@/components/DocumentProcessingMetricsPanel";
import { EmailOpsPanel, EmailProcessingTuningGuide } from "@/components/EmailOpsPanel";
import { PetHealthExplorer } from "@/components/PetHealthExplorer";
import { ProcessedEmailsPanel } from "@/components/ProcessedEmailsPanel";
import { render, screen, waitFor } from "@testing-library/react";

function mockClient() {
  return {
    listProcessedEmails: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    getProcessedEmailsSummary: jest.fn().mockResolvedValue({
      from: "2026-01-01",
      to: "2026-02-01",
      totalFailures: 0,
      totalReviewInboxCandidates: 0,
      totalStuckProcessing: 0,
      byDocumentType: [],
    }),
    getProcessedEmailDetail: jest.fn(),
    listProcessedEmailAttachments: jest.fn(),
    reprocessProcessedEmail: jest.fn(),
    bulkClearProcessedEmails: jest.fn(),
    releaseStuckProcessedEmailLock: jest.fn(),
    getOpsHealth: jest.fn().mockResolvedValue({
      allReady: true,
      checks: [{ id: "mail_resolve", ok: true, label: "Mail resolve", hint: "OK" }],
    }),
    getDocumentProcessingMetrics: jest.fn().mockResolvedValue({
      from: "2026-01-01",
      to: "2026-02-01",
      email: {
        totalCompleted: 0,
        totalFailed: 0,
        successRate: 100,
        totalReviewInboxOpen: 0,
        totalStuckProcessing: 0,
        dailyVolume: [],
        byFailureCategory: [],
        dailyFailuresByCategory: [],
        topFailureReasons: [],
        byDocumentType: [],
        qualityTrend: null,
      },
      vault: {
        totalDocuments: 0,
        clinicalSynced: 0,
        clinicalSyncErrors: 0,
        pendingClinicalSync: 0,
        byDocumentType: [],
      },
    }),
    searchPets: jest.fn().mockResolvedValue([]),
  } as any;
}

describe("ProcessedEmailsPanel", () => {
  it("loads processed email list on mount", async () => {
    const client = mockClient();
    render(<ProcessedEmailsPanel client={client} />);
    await waitFor(() => {
      expect(client.listProcessedEmails).toHaveBeenCalled();
    });
    expect(screen.getByText("Inbound mail errors")).toBeTruthy();
  });
});

describe("EmailOpsPanel", () => {
  it("renders tuning guide and fetches ops health", async () => {
    const client = mockClient();
    render(
      <EmailOpsPanel client={client} onOpenMailErrors={jest.fn()} onOpenProcessing={jest.fn()} />
    );
    await waitFor(() => {
      expect(client.getOpsHealth).toHaveBeenCalled();
    });
  });
});

describe("EmailProcessingTuningGuide", () => {
  it("documents edge deploy path", () => {
    render(<EmailProcessingTuningGuide />);
    expect(screen.getByText("Fine-tuning guide (no app store update)")).toBeTruthy();
    expect(screen.getAllByText(/mailgun-process-pet-mail/i).length).toBeGreaterThan(0);
  });
});

describe("DocumentProcessingMetricsPanel", () => {
  it("fetches processing metrics", async () => {
    const client = mockClient();
    render(<DocumentProcessingMetricsPanel client={client} onOpenMailErrors={jest.fn()} />);
    await waitFor(() => {
      expect(client.getDocumentProcessingMetrics).toHaveBeenCalled();
    });
  });
});

describe("PetHealthExplorer", () => {
  it("renders search UI", () => {
    const client = mockClient();
    render(<PetHealthExplorer client={client} onOpenHealthRecords={jest.fn()} />);
    expect(screen.getByLabelText("Search pets")).toBeTruthy();
  });
});
