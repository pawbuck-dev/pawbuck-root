import BookVetPickDateTimeScreen from "@/app/(home)/book-vet-visit/pick-datetime";
import { localDateKeyFromUtc } from "@/utils/bookingSlotFormat";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

let mockPush: jest.Mock;
let mockBack: jest.Mock;
let mockParams: Record<string, string | undefined>;

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("expo-router", () => {
  mockPush = jest.fn();
  mockBack = jest.fn();
  mockParams = {};
  return {
    useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
    useLocalSearchParams: () => mockParams,
  };
});

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      foreground: "#111",
      secondary: "#666",
      primary: "#3BD0D2",
      border: "#ddd",
      background: "#fff",
    },
    mode: "light",
  }),
}));

jest.mock("@/components/booking/BookingFlowHeader", () => ({
  BookingFlowHeader: () => null,
}));

jest.mock("@/components/home/BottomNavBar", () => ({
  __esModule: true,
  default: () => null,
}));

const mockGetPawbuckApiBaseUrl = jest.fn();
jest.mock("@/utils/pawbuckApi", () => ({
  getPawbuckApiBaseUrl: () => mockGetPawbuckApiBaseUrl(),
}));

const mockFetchAvailability = jest.fn();
const mockBookAppointment = jest.fn();
jest.mock("@/services/bookingsApi", () => ({
  fetchAvailability: (...a: unknown[]) => mockFetchAvailability(...a),
  bookAppointment: (...a: unknown[]) => mockBookAppointment(...a),
}));

const mockInsertVetBooking = jest.fn();
jest.mock("@/services/vetBookings", () => ({
  insertVetBooking: (...a: unknown[]) => mockInsertVetBooking(...a),
}));

const mockGetSession = jest.fn();
jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...a: unknown[]) => mockGetSession(...a),
    },
  },
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderPickDateTime() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <BookVetPickDateTimeScreen />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

describe("BookVetPickDateTimeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockParams = {};
    mockGetPawbuckApiBaseUrl.mockReturnValue("");
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "550e8400-e29b-41d4-a716-446655440099" } } },
    });
    mockBookAppointment.mockResolvedValue({
      id: "appt-api-1",
      externalAppointmentId: "ext-appt-1",
      startUtc: "2026-06-10T18:00:00.000Z",
      endUtc: "2026-06-10T19:00:00.000Z",
      serviceType: "Veterinary",
    });
    mockInsertVetBooking.mockResolvedValue({ id: "vb-row-1" });
  });

  it("shows missing-details state when vetId or serviceId absent", () => {
    mockParams = { vetId: "1", vetName: "Clinic" };
    renderPickDateTime();
    expect(screen.getByText(/Missing booking details/)).toBeTruthy();
    fireEvent.press(screen.getByText("Go back"));
    expect(mockBack).toHaveBeenCalled();
  });

  it("shows offline scheduling copy when API URL is not configured", () => {
    mockParams = {
      vetId: "1",
      vetName: "Yaletown Pet Hospital",
      petId: "550e8400-e29b-41d4-a716-446655440001",
      serviceId: "wellness",
    };
    mockGetPawbuckApiBaseUrl.mockReturnValue("");
    renderPickDateTime();
    expect(screen.getByText("Pick Date & Time")).toBeTruthy();
    expect(screen.getByText("No times available")).toBeTruthy();
    expect(screen.getByText(/Online scheduling isn’t connected yet/)).toBeTruthy();
  });

  it("books via API and navigates to confirmation", async () => {
    mockGetPawbuckApiBaseUrl.mockReturnValue("http://127.0.0.1:5998");
    mockParams = {
      vetId: "1",
      vetName: "Yaletown Pet Hospital",
      petId: "550e8400-e29b-41d4-a716-446655440001",
      serviceId: "wellness",
    };

    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(Math.max(now.getDate() + 3, 5), lastDay);
    const slotStart = new Date(now.getFullYear(), now.getMonth(), targetDay, 14, 30, 0);
    const slotEnd = new Date(slotStart.getTime() + 3600000);
    const startUtc = slotStart.toISOString();
    const endUtc = slotEnd.toISOString();
    const dateKey = localDateKeyFromUtc(startUtc);

    mockFetchAvailability.mockResolvedValue({
      slots: [
        {
          startUtc,
          endUtc,
          selectionToken: "sel-token-1",
        },
      ],
    });

    renderPickDateTime();

    await waitFor(() => {
      expect(screen.queryByText("Loading availability…")).toBeNull();
    });

    fireEvent.press(screen.getByText(String(targetDay)));
    const timeLabel = new Date(startUtc).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    await waitFor(() => {
      expect(screen.getByText(timeLabel)).toBeTruthy();
    });
    fireEvent.press(screen.getByText(timeLabel));
    fireEvent.press(screen.getByText("Continue"));

    await waitFor(() => {
      expect(mockBookAppointment).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockInsertVetBooking).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/book-vet-visit/booking-confirmed",
          params: expect.objectContaining({
            vetId: "1",
            serviceId: "wellness",
            date: dateKey,
            source: "api",
          }),
        })
      );
    });
  });

  it("only runs bookAppointment and insertVetBooking once when Continue is pressed rapidly", async () => {
    mockGetPawbuckApiBaseUrl.mockReturnValue("http://127.0.0.1:5998");
    mockParams = {
      vetId: "1",
      vetName: "Yaletown Pet Hospital",
      petId: "550e8400-e29b-41d4-a716-446655440001",
      serviceId: "wellness",
    };

    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const targetDay = Math.min(Math.max(now.getDate() + 3, 5), lastDay);
    const slotStart = new Date(now.getFullYear(), now.getMonth(), targetDay, 14, 30, 0);
    const slotEnd = new Date(slotStart.getTime() + 3600000);
    const startUtc = slotStart.toISOString();
    const endUtc = slotEnd.toISOString();

    mockFetchAvailability.mockResolvedValue({
      slots: [
        {
          startUtc,
          endUtc,
          selectionToken: "sel-token-1",
        },
      ],
    });

    let releaseBook!: (value: {
      id: string;
      externalAppointmentId: string;
      startUtc: string;
      endUtc: string;
      serviceType: string;
    }) => void;
    mockBookAppointment.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseBook = resolve;
        })
    );

    renderPickDateTime();

    await waitFor(() => {
      expect(screen.queryByText("Loading availability…")).toBeNull();
    });

    fireEvent.press(screen.getByText(String(targetDay)));
    const timeLabel = new Date(startUtc).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    await waitFor(() => {
      expect(screen.getByText(timeLabel)).toBeTruthy();
    });
    fireEvent.press(screen.getByText(timeLabel));

    const continueLabel = screen.getByText("Continue");
    for (let i = 0; i < 5; i++) {
      fireEvent.press(continueLabel);
    }

    await waitFor(() => {
      expect(mockBookAppointment).toHaveBeenCalledTimes(1);
    });
    expect(mockInsertVetBooking).toHaveBeenCalledTimes(0);

    releaseBook({
      id: "appt-api-1",
      externalAppointmentId: "ext-appt-1",
      startUtc,
      endUtc,
      serviceType: "Veterinary",
    });

    await waitFor(() => {
      expect(mockInsertVetBooking).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: "/book-vet-visit/booking-confirmed" })
      );
    });
  });
});
