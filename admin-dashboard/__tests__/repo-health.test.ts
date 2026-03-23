/**
 * Admin dashboard — add Next.js page and component tests when UI is built out.
 */
describe("admin-dashboard test harness", () => {
  it("runs Jest with jsdom", () => {
    expect(typeof window).toBe("object");
  });
});
