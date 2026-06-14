import { ApiAvailabilityPanel } from "@/components/ApiAvailabilityPanel";
import { render, screen } from "@testing-library/react";

jest.mock("@/context/AdminAppContext", () => ({
  useAdminApp: () => ({
    baseUrl: "https://api.pawbuck.com",
    client: {},
  }),
}));

jest.mock("@/hooks/supportQueries", () => ({
  useOpsHealth: () => ({
    data: {
      allReady: true,
      checks: [{ id: "postgresLive", ok: true, label: "Postgres live ping", hint: "12 ms" }],
      postgresLatencyMs: 12,
    },
    isLoading: false,
  }),
  useOpsAvailability: () => ({
    data: {
      overallAvailability24h: 100,
      overallAvailability7d: 99.5,
      probes: [],
      dailyOverall: [],
    },
    isLoading: false,
  }),
}));

describe("ApiAvailabilityPanel", () => {
  beforeEach(() => {
    window.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "healthy" }),
    }) as unknown as typeof fetch;
  });

  it("renders availability section", () => {
    render(<ApiAvailabilityPanel />);
    expect(screen.getByRole("region", { name: /api availability/i })).toBeTruthy();
    expect(screen.getByText(/Public \/api\/health/i)).toBeTruthy();
  });
});
