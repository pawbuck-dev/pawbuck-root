import { formatNotificationBadge } from "@/utils/notificationBadge";

describe("formatNotificationBadge", () => {
  it("shows single digits without zero padding", () => {
    expect(formatNotificationBadge(1)).toBe("1");
    expect(formatNotificationBadge(9)).toBe("9");
  });

  it("shows double digits as-is", () => {
    expect(formatNotificationBadge(10)).toBe("10");
    expect(formatNotificationBadge(99)).toBe("99");
  });

  it("caps at 99+", () => {
    expect(formatNotificationBadge(100)).toBe("99+");
    expect(formatNotificationBadge(500)).toBe("99+");
  });

  it("returns 0 for zero or negative", () => {
    expect(formatNotificationBadge(0)).toBe("0");
    expect(formatNotificationBadge(-1)).toBe("0");
  });
});
