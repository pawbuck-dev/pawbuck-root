import { validateEmail } from "@/utils/validateEmail";

describe("validateEmail", () => {
  it("accepts a simple valid address", () => {
    expect(validateEmail("a@b.co")).toBe(true);
    expect(validateEmail("user.name+tag@example.com")).toBe(true);
  });

  it("rejects empty or whitespace-only", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("   ")).toBe(false);
  });

  it("rejects missing @ or domain", () => {
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("@nodomain")).toBe(false);
    expect(validateEmail("noat.com")).toBe(false);
  });
});
