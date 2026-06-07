import { petToMiloApiContext } from "@/utils/miloChatApi";

describe("petToMiloApiContext", () => {
  const basePet = {
    id: "pet-1",
    name: "Milo",
    animal_type: "Dog",
    breed: "Mix",
    date_of_birth: "2020-01-01",
    sex: "Male",
    weight_unit: "lb",
  } as any;

  it("omits weight when null so API binding does not fail", () => {
    expect(petToMiloApiContext({ ...basePet, weight_value: null })).toEqual({
      id: "pet-1",
      name: "Milo",
      animal_type: "Dog",
      breed: "Mix",
      date_of_birth: "2020-01-01",
      sex: "Male",
    });
  });

  it("coerces numeric weight when present", () => {
    expect(petToMiloApiContext({ ...basePet, weight_value: 12.7 })).toMatchObject({
      weight_value: 12.7,
      weight_unit: "lb",
    });
  });
});
