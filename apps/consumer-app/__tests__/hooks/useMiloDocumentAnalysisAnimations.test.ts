import {
  MILO_DOC_ANALYSIS_STATUS_CYCLE_MS,
  MILO_DOC_ANALYSIS_STATUS_PHASES,
  useMiloDocumentAnalysisStatusCopy,
} from "@/hooks/useMiloDocumentAnalysisAnimations";
import { act, renderHook } from "@testing-library/react-native";

describe("useMiloDocumentAnalysisStatusCopy", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the first phase when inactive", () => {
    const { result } = renderHook(() => useMiloDocumentAnalysisStatusCopy(false));
    expect(result.current).toBe(MILO_DOC_ANALYSIS_STATUS_PHASES[0]);
  });

  it("cycles through all phases every 3.5s while active", () => {
    const { result } = renderHook(() => useMiloDocumentAnalysisStatusCopy(true));

    expect(result.current).toBe("Reading your document...");

    act(() => {
      jest.advanceTimersByTime(MILO_DOC_ANALYSIS_STATUS_CYCLE_MS);
    });
    expect(result.current).toBe("Finding dates & vaccines...");

    act(() => {
      jest.advanceTimersByTime(MILO_DOC_ANALYSIS_STATUS_CYCLE_MS);
    });
    expect(result.current).toBe("Matching regional requirements...");

    act(() => {
      jest.advanceTimersByTime(MILO_DOC_ANALYSIS_STATUS_CYCLE_MS);
    });
    expect(result.current).toBe("Almost there...");

    act(() => {
      jest.advanceTimersByTime(MILO_DOC_ANALYSIS_STATUS_CYCLE_MS);
    });
    expect(result.current).toBe("Reading your document...");
  });

  it("resets to the first phase when deactivated", () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useMiloDocumentAnalysisStatusCopy(active),
      { initialProps: { active: true } }
    );

    act(() => {
      jest.advanceTimersByTime(MILO_DOC_ANALYSIS_STATUS_CYCLE_MS * 2);
    });
    expect(result.current).toBe("Matching regional requirements...");

    rerender({ active: false });
    expect(result.current).toBe("Reading your document...");
  });
});
