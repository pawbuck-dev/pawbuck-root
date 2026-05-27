const mockPetEmailListSelect = jest.fn();
const mockPetEmailListInsert = jest.fn();
const mockPetEmailListUpdate = jest.fn();
const mockPetEmailListDelete = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn((table: string) => {
      if (table === "pet_email_list") {
        return {
          select: mockPetEmailListSelect,
          insert: mockPetEmailListInsert,
          update: mockPetEmailListUpdate,
          delete: mockPetEmailListDelete,
        };
      }
      if (table === "pets") return { select: jest.fn(), eq: jest.fn() };
      if (table === "pet_care_team_members") return { select: jest.fn(), eq: jest.fn() };
      throw new Error(`unexpected table ${table}`);
    }),
  },
}));

import { mockInsertSingle, mockSelectChain } from "../helpers/supabaseMock";
import {
  addEmail,
  getBlockedEmails,
  getEmailByPetAndAddress,
  getWhitelistedEmails,
} from "@/services/petEmailList";

describe("petEmailList", () => {
  const petId = "pet-1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getWhitelistedEmails queries non-blocked rows", async () => {
    const chain = mockSelectChain({ data: [{ id: 1, email_id: "a@b.com" }], error: null });
    mockPetEmailListSelect.mockImplementation(chain.select);

    const rows = await getWhitelistedEmails(petId);
    expect(rows).toHaveLength(1);
  });

  it("getBlockedEmails queries blocked rows", async () => {
    const chain = mockSelectChain({ data: [{ id: 2, is_blocked: true }], error: null });
    mockPetEmailListSelect.mockImplementation(chain.select);

    const rows = await getBlockedEmails(petId);
    expect(rows[0].is_blocked).toBe(true);
  });

  it("addEmail inserts normalized address when new", async () => {
    const selectChain = mockSelectChain({ data: null, error: null });
    mockPetEmailListSelect.mockImplementation(selectChain.select);
    const insertChain = mockInsertSingle({ data: { id: 3, email_id: "vet@clinic.com" }, error: null });
    mockPetEmailListInsert.mockImplementation(insertChain.insert);

    const row = await addEmail(petId, "  VET@Clinic.COM ", false);
    expect(row.email_id).toBe("vet@clinic.com");
    expect(insertChain.insert).toHaveBeenCalled();
  });

  it("getEmailByPetAndAddress returns maybeSingle row", async () => {
    const chain = mockSelectChain({ data: { id: 9 }, error: null });
    mockPetEmailListSelect.mockImplementation(chain.select);

    const row = await getEmailByPetAndAddress(petId, "x@y.com");
    expect(row?.id).toBe(9);
  });
});
