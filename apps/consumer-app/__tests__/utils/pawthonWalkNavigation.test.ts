import { pawthonWalkStartRoute } from "@/utils/pawthonWalkNavigation";

describe("pawthonWalkStartRoute", () => {
  const pets = [{ id: "a" }, { id: "b" }];

  it("auto-starts when only one pet", () => {
    expect(pawthonWalkStartRoute([{ id: "solo" }], null)).toEqual({
      pathname: "/pawthon-walk",
      params: { autoStart: "1", petId: "solo" },
    });
  });

  it("opens select screen when multiple pets", () => {
    expect(pawthonWalkStartRoute(pets, "b")).toEqual({
      pathname: "/pawthon-walk",
      params: { petId: "b" },
    });
    expect(pawthonWalkStartRoute(pets, null)).toEqual({
      pathname: "/pawthon-walk",
    });
  });
});
