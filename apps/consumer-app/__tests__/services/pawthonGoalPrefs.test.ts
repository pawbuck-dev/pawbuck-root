import AsyncStorage from "@react-native-async-storage/async-storage";
import { PAWTHON_DEFAULT_GOAL_METERS, PAWTHON_GOAL_STORAGE_KEY } from "@/constants/pawthonGoals";
import { getDailyGoalMeters, setDailyGoalMeters } from "@/services/pawthonGoalPrefs";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe("pawthonGoalPrefs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns default when storage empty", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await expect(getDailyGoalMeters()).resolves.toBe(PAWTHON_DEFAULT_GOAL_METERS);
  });

  it("returns stored valid meters", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("2500");
    await expect(getDailyGoalMeters()).resolves.toBe(2500);
  });

  it("falls back to default for invalid stored value", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("not-a-number");
    await expect(getDailyGoalMeters()).resolves.toBe(PAWTHON_DEFAULT_GOAL_METERS);
  });

  it("persists rounded meters", async () => {
    await setDailyGoalMeters(1234.7);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(PAWTHON_GOAL_STORAGE_KEY, "1235");
  });
});
