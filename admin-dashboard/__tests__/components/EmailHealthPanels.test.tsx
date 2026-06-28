import { DocumentProcessingMetricsPanel } from "@/components/DocumentProcessingMetricsPanel";
import { EmailOpsPanel, EmailProcessingTuningGuide } from "@/components/EmailOpsPanel";
import { buildCaseFileUi } from "@/components/inbox/inboxCaseLogic";
import { ownerVisibilityLabel } from "@/components/inbox/inboxUtils";
import { PetHealthExplorer } from "@/components/PetHealthExplorer";
import { ProcessedEmailsPanel } from "@/components/ProcessedEmailsPanel";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

function mockClient() {
  return {
    listProcessedEmails: jest.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    getProcessedEmailsSummary: jest.fn().mockResolvedValue({
      from: "2026-01-01",
      to: "2026-02-01",
      totalFailures: 0,
      totalReviewInboxCandidates: 2,
      totalStuckProcessing: 0,
      byDocumentType: [],
    }),
    getProcessedEmail: jest.fn(),
    listProcessedEmailAttachments: jest.fn(),
    bulkClearReviewInbox: jest.fn(),
    bulkReprocessReviewInbox: jest.fn(),
    bulkDeleteGhostSuccess: jest.fn(),
    releaseStuckLock: jest.fn(),
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
  it("loads inbox with needs-action tabs on mount", async () => {
    const client = mockClient();
    render(
      <MemoryRouter>
        <ProcessedEmailsPanel client={client} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(client.listProcessedEmails).toHaveBeenCalledWith(
        expect.objectContaining({ reviewInboxOnly: true }),
      );
    });
    expect(screen.getByRole("tab", { name: /Needs action/i })).toBeTruthy();
    expect(screen.getByText("Case file")).toBeTruthy();
  });
});

describe("inboxCaseLogic", () => {
  it("shows success banner for cleared rows without archive", () => {
    const ui = buildCaseFileUi({
      id: "1",
      s3Key: "msg",
      petId: "p1",
      petName: "Milo",
      ownerEmail: "o@test.com",
      status: "completed",
      startedAt: null,
      completedAt: null,
      attachmentCount: 1,
      success: true,
      senderEmail: null,
      subject: "Records",
      documentType: "vaccinations",
      failureReason: null,
      failureReasonSnippet: null,
      reviewStatus: "resolved",
      consumerInboxVisible: false,
      storedArchiveStatus: "not_retained",
    });
    expect(ui.bannerTone).toBe("success");
    expect(ui.primaryLabel).toMatch(/Verify pet profile/i);
  });
});

describe("inboxUtils", () => {
  it("labels owner-visible failures", () => {
    const v = ownerVisibilityLabel({
      status: "completed",
      success: false,
      failureReason: "Failed PDF",
      reviewStatus: "pending",
    });
    expect(v.label).toBe("Owner sees error");
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
